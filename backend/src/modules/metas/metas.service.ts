import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { clientes } from "../../db/schema/clientes";
import { metasMensais } from "../../db/schema/metasMensais";

function parseMes(mes: string): { mesNum: number; ano: number } {
  const [anoStr, mStr] = mes.split("-");
  return { mesNum: Number(mStr), ano: Number(anoStr) };
}

export async function listarMetas(mes: string) {
  const { mesNum, ano } = parseMes(mes);

  const todosClientes = await db.select().from(clientes).orderBy(clientes.nome);
  const overrides = await db
    .select()
    .from(metasMensais)
    .where(and(eq(metasMensais.mes, mesNum), eq(metasMensais.ano, ano)));

  const overrideMap = new Map(overrides.map((o) => [o.clienteId, Number(o.valorMeta)]));

  return todosClientes.map((c) => ({
    clienteId: c.id,
    clienteNome: c.nome,
    valorMeta: overrideMap.has(c.id) ? overrideMap.get(c.id)! : Number(c.metaPadrao),
    overrideAtivo: overrideMap.has(c.id),
  }));
}

export const upsertMetaSchema = z.object({
  clienteId: z.number().int().positive(),
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  valorMeta: z.number().min(0),
});

export async function upsertMeta(data: z.infer<typeof upsertMetaSchema>) {
  const { mesNum, ano } = parseMes(data.mes);

  const [row] = await db
    .insert(metasMensais)
    .values({ clienteId: data.clienteId, mes: mesNum, ano, valorMeta: String(data.valorMeta) })
    .onConflictDoUpdate({
      target: [metasMensais.clienteId, metasMensais.mes, metasMensais.ano],
      set: { valorMeta: String(data.valorMeta) },
    })
    .returning();

  return { ...row, valorMeta: Number(row.valorMeta) };
}
