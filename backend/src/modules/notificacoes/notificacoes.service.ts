import { and, eq, gte, lte, notInArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { cargas } from "../../db/schema/cargas";
import { clientes } from "../../db/schema/clientes";
import { metasMensais } from "../../db/schema/metasMensais";
import { notificacoes } from "../../db/schema/notificacoes";

function mesRange(mes: string) {
  const [ano, m] = mes.split("-");
  const ultimo = new Date(Number(ano), Number(m), 0).getDate();
  return { inicio: `${ano}-${m}-01`, fim: `${ano}-${m}-${String(ultimo).padStart(2, "0")}` };
}

type NotifAtiva = {
  chave: string;
  tipo: "danger" | "warn" | "success";
  titulo: string;
  corpo: string;
};

async function calcularAtivas(): Promise<NotifAtiva[]> {
  const hoje = new Date();
  const mesNum = hoje.getMonth() + 1;
  const anoNum = hoje.getFullYear();
  const mes = `${anoNum}-${String(mesNum).padStart(2, "0")}`;
  const { inicio, fim } = mesRange(mes);

  const ativas: NotifAtiva[] = [];

  // Regra 1: cargas entregues sem canhoto há entre 3 e 30 dias
  const tresDiasAtras = new Date(hoje);
  tresDiasAtras.setDate(hoje.getDate() - 3);
  const trintaDiasAtras = new Date(hoje);
  trintaDiasAtras.setDate(hoje.getDate() - 30);

  const semCanhoto = await db
    .select({ id: cargas.id, cte: cargas.cte, data: cargas.data })
    .from(cargas)
    .where(
      and(
        eq(cargas.status, "entregue"),
        eq(cargas.canhotoPago, false),
        lte(cargas.data, tresDiasAtras.toISOString().split("T")[0]),
        gte(cargas.data, trintaDiasAtras.toISOString().split("T")[0]),
      ),
    )
    .limit(10);

  for (const c of semCanhoto) {
    const dias = Math.floor((hoje.getTime() - new Date(c.data).getTime()) / 86_400_000);
    ativas.push({
      chave: `canhoto_${c.id}`,
      tipo: "warn",
      titulo: "Canhoto pendente",
      corpo: `${c.cte ?? `Carga #${c.id}`} sem canhoto enviado há ${dias} ${dias === 1 ? "dia" : "dias"}.`,
    });
  }

  // Regra 2: ritmo do mês por cliente
  const diasNoMes = new Date(anoNum, mesNum, 0).getDate();
  const diaAtual = hoje.getDate();
  const ritmoEsperado = diaAtual / diasNoMes;

  const todosClientes = await db.select().from(clientes);

  const faturPorCliente = await db
    .select({
      clienteId: cargas.clienteId,
      faturamento: sql<string>`COALESCE(SUM(${cargas.valorEmpresa}), 0)`,
    })
    .from(cargas)
    .where(and(gte(cargas.data, inicio), lte(cargas.data, fim)))
    .groupBy(cargas.clienteId);

  const metasOverride = await db
    .select()
    .from(metasMensais)
    .where(and(eq(metasMensais.mes, mesNum), eq(metasMensais.ano, anoNum)));

  const faturMap = new Map(faturPorCliente.map((r) => [r.clienteId, Number(r.faturamento)]));
  const metaMap = new Map(metasOverride.map((r) => [r.clienteId, Number(r.valorMeta)]));

  for (const c of todosClientes) {
    const faturamento = faturMap.get(c.id) ?? 0;
    const meta = metaMap.has(c.id) ? metaMap.get(c.id)! : Number(c.metaPadrao);
    if (meta <= 0) continue;

    const percent = faturamento / meta;

    if (percent >= 1) {
      ativas.push({
        chave: `meta_batida_${c.id}_${mes}`,
        tipo: "success",
        titulo: `${c.nome} bateu a meta!`,
        corpo: `${(percent * 100).toFixed(0)}% da meta de ${String(mesNum).padStart(2, "0")}/${anoNum} atingida.`,
      });
    } else if (faturamento > 0 && percent < ritmoEsperado * 0.75) {
      ativas.push({
        chave: `ritmo_baixo_${c.id}_${mes}`,
        tipo: "danger",
        titulo: `Ritmo abaixo da meta — ${c.nome}`,
        corpo: `${(percent * 100).toFixed(0)}% faturado. Faltam ${diasNoMes - diaAtual} dias no mês.`,
      });
    }
  }

  return ativas;
}

export async function gerarEListar() {
  const ativas = await calcularAtivas();
  const chavesAtivas = ativas.map((a) => a.chave);

  // Remove notificações que não são mais relevantes
  if (chavesAtivas.length > 0) {
    await db.delete(notificacoes).where(notInArray(notificacoes.chave, chavesAtivas));
  } else {
    await db.delete(notificacoes);
  }

  // Insere novas, preserva lida das existentes via onConflictDoNothing
  if (ativas.length > 0) {
    await db.insert(notificacoes).values(ativas).onConflictDoNothing();
  }

  // Retorna apenas as não descartadas (para o navbar)
  return db
    .select()
    .from(notificacoes)
    .where(eq(notificacoes.descartada, false))
    .orderBy(notificacoes.createdAt);
}

export async function listarHistorico() {
  return db.select().from(notificacoes).orderBy(notificacoes.createdAt);
}

export async function descartar(id: number) {
  const [row] = await db
    .update(notificacoes)
    .set({ descartada: true, lida: true })
    .where(eq(notificacoes.id, id))
    .returning();
  return row ?? null;
}

export async function marcarLida(id: number) {
  const [row] = await db
    .update(notificacoes)
    .set({ lida: true })
    .where(eq(notificacoes.id, id))
    .returning();
  return row ?? null;
}

export async function marcarTodasLidas() {
  await db.update(notificacoes).set({ lida: true });
}
