import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizarNomeMotorista } from "@thiago/core";
import { db } from "../../db/client";
import { motoristas } from "../../db/schema/motoristas";
import { cargas } from "../../db/schema/cargas";

export const createMotoristaSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().optional(),
  percentComissao: z.number().min(0).max(1).default(0.1),
});

export const updateMotoristaSchema = createMotoristaSchema.partial();

function mapRow(r: typeof motoristas.$inferSelect) {
  return {
    id: r.id,
    nome: r.nome,
    telefone: r.telefone,
    percentComissao: Number(r.percentComissao),
    createdAt: r.createdAt,
  };
}

export async function listarMotoristas() {
  const rows = await db
    .select({
      id: motoristas.id,
      nome: motoristas.nome,
      telefone: motoristas.telefone,
      percentComissao: motoristas.percentComissao,
      createdAt: motoristas.createdAt,
      totalCargas: sql<number>`COUNT(${cargas.id})`,
    })
    .from(motoristas)
    .leftJoin(cargas, eq(cargas.motoristaId, motoristas.id))
    .groupBy(motoristas.id)
    .orderBy(motoristas.nome);

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    telefone: r.telefone,
    percentComissao: Number(r.percentComissao),
    createdAt: r.createdAt,
    totalCargas: Number(r.totalCargas),
  }));
}

export async function criarMotorista(data: z.infer<typeof createMotoristaSchema>) {
  const nome = normalizarNomeMotorista(data.nome);
  const [row] = await db
    .insert(motoristas)
    .values({
      nome,
      nomeNormalizado: normalizarNomeMotorista(nome),
      telefone: data.telefone,
      percentComissao: String(data.percentComissao),
    })
    .returning();
  return mapRow(row);
}

export async function atualizarMotorista(id: number, data: z.infer<typeof updateMotoristaSchema>) {
  const patch: Partial<typeof motoristas.$inferInsert> = {};
  if (data.nome !== undefined) {
    patch.nome = normalizarNomeMotorista(data.nome);
    patch.nomeNormalizado = normalizarNomeMotorista(data.nome);
  }
  if (data.telefone !== undefined) patch.telefone = data.telefone;
  if (data.percentComissao !== undefined) patch.percentComissao = String(data.percentComissao);

  const [row] = await db.update(motoristas).set(patch).where(eq(motoristas.id, id)).returning();
  return row ? mapRow(row) : null;
}

export async function deletarMotorista(id: number) {
  const [row] = await db.delete(motoristas).where(eq(motoristas.id, id)).returning();
  return Boolean(row);
}
