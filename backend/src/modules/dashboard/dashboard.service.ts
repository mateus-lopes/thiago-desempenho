import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { cargas } from "../../db/schema/cargas";
import { clientes } from "../../db/schema/clientes";
import { metasMensais } from "../../db/schema/metasMensais";

function mesRange(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split("-");
  const ultimo = new Date(Number(ano), Number(m), 0).getDate();
  return {
    inicio: `${ano}-${m}-01`,
    fim: `${ano}-${m}-${String(ultimo).padStart(2, "0")}`,
  };
}

export async function getDashboardMes(mes: string) {
  const { inicio, fim } = mesRange(mes);
  const [mesNum, anoNum] = [Number(mes.split("-")[1]), Number(mes.split("-")[0])];
  const filtroMes = and(gte(cargas.data, inicio), lte(cargas.data, fim));

  const [totais] = await db
    .select({
      faturamento: sql<string>`COALESCE(SUM(${cargas.valorEmpresa}), 0)`,
      comissao: sql<string>`COALESCE(SUM(${cargas.comissaoValor}), 0)`,
      lucro: sql<string>`COALESCE(SUM(${cargas.lucro}), 0)`,
      rentabilidadeMedia: sql<string>`COALESCE(AVG(${cargas.percentRentabilidade}), 0)`,
      totalCargas: sql<string>`COUNT(*)`,
      cargasEmAndamento: sql<string>`COUNT(*) FILTER (WHERE ${cargas.status} = 'em_andamento')`,
      cargasEntregues: sql<string>`COUNT(*) FILTER (WHERE ${cargas.status} = 'entregue')`,
    })
    .from(cargas)
    .where(filtroMes);

  const topClientes = await db
    .select({
      clienteId: cargas.clienteId,
      clienteNome: clientes.nome,
      faturamento: sql<string>`COALESCE(SUM(${cargas.valorEmpresa}), 0)`,
    })
    .from(cargas)
    .innerJoin(clientes, eq(cargas.clienteId, clientes.id))
    .where(filtroMes)
    .groupBy(cargas.clienteId, clientes.nome)
    .orderBy(sql`SUM(${cargas.valorEmpresa}) DESC`)
    .limit(5);

  const todosClientes = await db.select().from(clientes);

  const faturPorCliente = await db
    .select({
      clienteId: cargas.clienteId,
      faturamento: sql<string>`COALESCE(SUM(${cargas.valorEmpresa}), 0)`,
    })
    .from(cargas)
    .where(filtroMes)
    .groupBy(cargas.clienteId);

  const metasOverride = await db
    .select()
    .from(metasMensais)
    .where(and(eq(metasMensais.mes, mesNum), eq(metasMensais.ano, anoNum)));

  const faturMap = new Map(faturPorCliente.map((r) => [r.clienteId, Number(r.faturamento)]));
  const metaMap = new Map(metasOverride.map((r) => [r.clienteId, Number(r.valorMeta)]));

  const progressoMeta = todosClientes.map((c) => {
    const faturamento = faturMap.get(c.id) ?? 0;
    const meta = metaMap.has(c.id) ? metaMap.get(c.id)! : Number(c.metaPadrao);
    return {
      clienteId: c.id,
      clienteNome: c.nome,
      faturamento,
      meta,
      percent: meta > 0 ? faturamento / meta : 0,
    };
  });

  return {
    faturamento: Number(totais.faturamento),
    comissao: Number(totais.comissao),
    lucro: Number(totais.lucro),
    rentabilidadeMedia: Number(totais.rentabilidadeMedia),
    totalCargas: Number(totais.totalCargas),
    cargasEmAndamento: Number(totais.cargasEmAndamento),
    cargasEntregues: Number(totais.cargasEntregues),
    topClientes: topClientes.map((r) => ({
      clienteId: r.clienteId,
      clienteNome: r.clienteNome,
      faturamento: Number(r.faturamento),
    })),
    progressoMeta,
  };
}

export async function getDashboardAnual(ano: number) {
  const rows = await db
    .select({
      mes: sql<string>`EXTRACT(MONTH FROM ${cargas.data})`,
      faturamento: sql<string>`COALESCE(SUM(${cargas.valorEmpresa}), 0)`,
      comissao: sql<string>`COALESCE(SUM(${cargas.comissaoValor}), 0)`,
      lucro: sql<string>`COALESCE(SUM(${cargas.lucro}), 0)`,
      rentabilidadeMedia: sql<string>`COALESCE(AVG(${cargas.percentRentabilidade}), 0)`,
      totalCargas: sql<string>`COUNT(*)`,
    })
    .from(cargas)
    .where(and(gte(cargas.data, `${ano}-01-01`), lte(cargas.data, `${ano}-12-31`)))
    .groupBy(sql`EXTRACT(MONTH FROM ${cargas.data})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${cargas.data})`);

  const rowMap = new Map(rows.map((r) => [Number(r.mes), r]));

  const meses = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const r = rowMap.get(m);
    return {
      mes: m,
      faturamento: r ? Number(r.faturamento) : 0,
      comissao: r ? Number(r.comissao) : 0,
      lucro: r ? Number(r.lucro) : 0,
      rentabilidadeMedia: r ? Number(r.rentabilidadeMedia) : 0,
      totalCargas: r ? Number(r.totalCargas) : 0,
    };
  });

  return { ano, meses };
}
