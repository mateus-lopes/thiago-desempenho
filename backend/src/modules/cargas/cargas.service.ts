import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { calcularCarga } from "@thiago/core";
import { db } from "../../db/client";
import { cargas } from "../../db/schema/cargas";
import { clientes } from "../../db/schema/clientes";
import { motoristas } from "../../db/schema/motoristas";

// ── Schema de validação ──────────────────────────────────────────────────────

export const createCargaSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cte: z.string().optional(),
  origem: z.string().optional(),
  destino: z.string().optional(),
  clienteId: z.number().int().positive(),
  motoristaId: z.number().int().positive(),
  valorMotorista: z.number().positive(),
  valorEmpresa: z.number().positive(),
  valorNf: z.number().positive(),
  seguroPercent: z.number().min(0),
  icmsPercent: z.number().min(0),
  coPercent: z.number().min(0),
  impostoPercent: z.number().min(0),
  diasPagamento: z.number().int().min(0),
  percentComissao: z.number().min(0).max(1),
  status: z.enum(["em_andamento", "entregue"]).default("em_andamento"),
  canhotoPago: z.boolean().default(false),
  tipoEntrega: z.string().optional(),
  formaPagamento: z.string().optional(),
});

export const updateCargaSchema = createCargaSchema.partial();

export const patchStatusSchema = z.object({
  status: z.enum(["em_andamento", "entregue"]).optional(),
  canhotoPago: z.boolean().optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function mesRange(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split("-");
  const ultimo = new Date(Number(ano), Number(m), 0).getDate();
  return {
    inicio: `${ano}-${m}-01`,
    fim: `${ano}-${m}-${String(ultimo).padStart(2, "0")}`,
  };
}

type CargaRow = typeof cargas.$inferSelect;

function toDbValues(input: z.infer<typeof createCargaSchema>) {
  const calc = calcularCarga({
    valorMotorista: input.valorMotorista,
    valorEmpresa: input.valorEmpresa,
    valorNF: input.valorNf,
    seguroPercent: input.seguroPercent,
    icmsPercent: input.icmsPercent,
    coPercent: input.coPercent,
    impostoPercent: input.impostoPercent,
    diasPagamento: input.diasPagamento,
    percentComissao: input.percentComissao,
  });

  return {
    data: input.data,
    cte: input.cte,
    origem: input.origem,
    destino: input.destino,
    clienteId: input.clienteId,
    motoristaId: input.motoristaId,
    valorMotorista: String(input.valorMotorista),
    valorEmpresa: String(input.valorEmpresa),
    valorNF: String(input.valorNf),
    seguroPercent: String(input.seguroPercent),
    icmsPercent: String(input.icmsPercent),
    coPercent: String(input.coPercent),
    impostoPercent: String(input.impostoPercent),
    diasPagamento: input.diasPagamento,
    percentComissao: String(input.percentComissao),
    seguroValor: String(calc.seguroValor),
    coValor: String(calc.coValor),
    impostoValor: String(calc.impostoValor),
    boletoPercent: String(calc.boletoPercent),
    movaValor: String(calc.movaValor),
    adqTabValor: String(calc.adqTabValor),
    totalTaxasPercent: String(calc.totalTaxasPercent),
    valorImpostoTotal: String(calc.valorImpostoTotal),
    comissaoValor: String(calc.comissaoValor),
    boletosValor: String(calc.boletosValor),
    lucro: String(calc.lucro),
    percentRentabilidade: String(calc.percentRentabilidade),
    status: input.status as "em_andamento" | "entregue",
    canhotoPago: input.canhotoPago,
    tipoEntrega: input.tipoEntrega,
    formaPagamento: input.formaPagamento,
  };
}

function mapRow(r: { carga: CargaRow; clienteNome: string; motoristaNome: string }) {
  const c = r.carga;
  return {
    id: c.id,
    data: c.data,
    cte: c.cte,
    origem: c.origem,
    destino: c.destino,
    clienteId: c.clienteId,
    clienteNome: r.clienteNome,
    motoristaId: c.motoristaId,
    motoristaNome: r.motoristaNome,
    valorMotorista: Number(c.valorMotorista),
    valorEmpresa: Number(c.valorEmpresa),
    valorNf: Number(c.valorNF),
    seguroPercent: Number(c.seguroPercent),
    icmsPercent: Number(c.icmsPercent),
    coPercent: Number(c.coPercent),
    impostoPercent: Number(c.impostoPercent),
    diasPagamento: c.diasPagamento,
    percentComissao: Number(c.percentComissao),
    seguroValor: Number(c.seguroValor),
    coValor: Number(c.coValor),
    impostoValor: Number(c.impostoValor),
    boletoPercent: Number(c.boletoPercent),
    movaValor: Number(c.movaValor),
    adqTabValor: Number(c.adqTabValor),
    totalTaxasPercent: Number(c.totalTaxasPercent),
    valorImpostoTotal: Number(c.valorImpostoTotal),
    comissaoValor: Number(c.comissaoValor),
    boletosValor: Number(c.boletosValor),
    lucro: Number(c.lucro),
    percentRentabilidade: Number(c.percentRentabilidade),
    status: c.status,
    canhotoPago: c.canhotoPago,
    tipoEntrega: c.tipoEntrega,
    formaPagamento: c.formaPagamento,
    createdAt: c.createdAt,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listarCargas(mes: string) {
  const { inicio, fim } = mesRange(mes);

  const rows = await db
    .select({ carga: cargas, clienteNome: clientes.nome, motoristaNome: motoristas.nome })
    .from(cargas)
    .innerJoin(clientes, eq(cargas.clienteId, clientes.id))
    .innerJoin(motoristas, eq(cargas.motoristaId, motoristas.id))
    .where(and(gte(cargas.data, inicio), lte(cargas.data, fim)))
    .orderBy(cargas.data);

  return rows.map(mapRow);
}

export async function buscarCarga(id: number) {
  const [row] = await db
    .select({ carga: cargas, clienteNome: clientes.nome, motoristaNome: motoristas.nome })
    .from(cargas)
    .innerJoin(clientes, eq(cargas.clienteId, clientes.id))
    .innerJoin(motoristas, eq(cargas.motoristaId, motoristas.id))
    .where(eq(cargas.id, id));

  return row ? mapRow(row) : null;
}

export async function criarCarga(data: z.infer<typeof createCargaSchema>) {
  const [row] = await db.insert(cargas).values(toDbValues(data)).returning();
  return buscarCarga(row.id);
}

export async function atualizarCarga(id: number, data: z.infer<typeof updateCargaSchema>) {
  const existing = await buscarCarga(id);
  if (!existing) return null;

  const merged = { ...existing, ...data, valorNf: data.valorNf ?? existing.valorNf };
  const full = createCargaSchema.parse(merged);
  const [row] = await db.update(cargas).set(toDbValues(full)).where(eq(cargas.id, id)).returning();
  if (!row) return null;
  return buscarCarga(id);
}

export async function patchCarga(id: number, data: z.infer<typeof patchStatusSchema>) {
  const patch: Partial<typeof cargas.$inferInsert> = {};
  if (data.status !== undefined) patch.status = data.status;
  if (data.canhotoPago !== undefined) patch.canhotoPago = data.canhotoPago;

  const [row] = await db.update(cargas).set(patch).where(eq(cargas.id, id)).returning();
  return row ? buscarCarga(id) : null;
}

export async function deletarCarga(id: number) {
  const [row] = await db.delete(cargas).where(eq(cargas.id, id)).returning();
  return Boolean(row);
}
