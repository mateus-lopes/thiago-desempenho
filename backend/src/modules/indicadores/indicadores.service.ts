import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { indicadoresSemanais } from "../../db/schema/indicadoresSemanais";

export async function listarIndicadores(mes: string) {
  const rows = await db
    .select()
    .from(indicadoresSemanais)
    .where(eq(indicadoresSemanais.mes, mes))
    .orderBy(indicadoresSemanais.semana);

  const map = new Map(rows.map((r) => [r.semana, r]));

  return [1, 2, 3, 4].map((semana) => {
    const r = map.get(semana);
    return {
      mes,
      semana,
      ligacoes: r?.ligacoes ?? 0,
      leadsAdicionados: r?.leadsAdicionados ?? 0,
      leadsDeclinados: r?.leadsDeclinados ?? 0,
      clientesFechados: r?.clientesFechados ?? 0,
    };
  });
}

export const upsertIndicadorSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  semana: z.number().int().min(1).max(4),
  ligacoes: z.number().int().min(0),
  leadsAdicionados: z.number().int().min(0),
  leadsDeclinados: z.number().int().min(0),
  clientesFechados: z.number().int().min(0),
});

export async function upsertIndicador(data: z.infer<typeof upsertIndicadorSchema>) {
  const [row] = await db
    .insert(indicadoresSemanais)
    .values(data)
    .onConflictDoUpdate({
      target: [indicadoresSemanais.mes, indicadoresSemanais.semana],
      set: {
        ligacoes: data.ligacoes,
        leadsAdicionados: data.leadsAdicionados,
        leadsDeclinados: data.leadsDeclinados,
        clientesFechados: data.clientesFechados,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}
