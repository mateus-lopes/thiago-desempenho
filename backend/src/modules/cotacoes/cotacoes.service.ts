import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { calcularCarga } from "@thiago/core";
import { db } from "../../db/client";
import { cotacoes } from "../../db/schema/cotacoes";
import { clientes } from "../../db/schema/clientes";
import { cargas } from "../../db/schema/cargas";
import { motoristas } from "../../db/schema/motoristas";

// ── Schemas de validação ─────────────────────────────────────────────────────

export const createCotacaoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clienteId: z.number().int().positive().nullable().default(null),
  origem: z.string().default(""),
  destino: z.string().default(""),
  km: z.number().nullable().default(null),
  tipoVeiculo: z.string().default(""),
  valorMotorista: z.number().nullable().default(null),
  valorEmpresa: z.number().nullable().default(null),
  valorNf: z.number().nullable().default(null),
  icmsPercent: z.number().min(0).default(4),
  coPercent: z.number().min(0).default(3.5),
  impostoPercent: z.number().min(0).default(6.5),
  seguroPercent: z.number().min(0).default(0.03),
  diasPagamento: z.number().int().min(0).default(15),
  percentComissao: z.number().min(0).default(10),
  situacao: z.enum(["pendente", "batida"]).default("pendente"),
});

export const updateCotacaoSchema = createCotacaoSchema.partial();

export const patchSituacaoSchema = z.object({
  situacao: z.enum(["pendente", "batida"]),
});

export const converterSchema = z.object({
  motoristaId: z.number().int().positive(),
  cte: z.string().optional(),
});

// ── Cálculo interno (percentuais no formato legível: 4 = 4%, não 0.04) ──────

function calcularCotacao(input: z.infer<typeof createCotacaoSchema>) {
  const ve = input.valorEmpresa ?? 0;
  const vm = input.valorMotorista ?? 0;
  const vn = input.valorNf ?? 0;
  if (!ve) return { comissaoValor: 0, lucro: 0, percentRentabilidade: 0 };

  const boletoP = input.diasPagamento * 0.00133;
  const totalTaxas = (input.icmsPercent + input.coPercent + input.impostoPercent) / 100 + boletoP;
  const adqTab = ve * 0.0085;
  const valorImpostoTotal = ve * totalTaxas + adqTab;
  const seguroValor = vn * (input.seguroPercent / 100);
  const comissaoValor = (ve - vm) * (input.percentComissao / 100);
  const lucro = ve - vm - seguroValor - valorImpostoTotal - comissaoValor - 17.5;
  return { comissaoValor, lucro, percentRentabilidade: lucro / ve };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type CotacaoRow = typeof cotacoes.$inferSelect;

function mapRow(r: CotacaoRow & { clienteNome?: string | null }) {
  return {
    id: r.id,
    data: r.data,
    clienteId: r.clienteId,
    clienteNome: r.clienteNome ?? null,
    origem: r.origem,
    destino: r.destino,
    km: r.km !== null ? Number(r.km) : null,
    tipoVeiculo: r.tipoVeiculo,
    valorMotorista: r.valorMotorista !== null ? Number(r.valorMotorista) : null,
    valorEmpresa: r.valorEmpresa !== null ? Number(r.valorEmpresa) : null,
    valorNf: r.valorNf !== null ? Number(r.valorNf) : null,
    icmsPercent: Number(r.icmsPercent),
    coPercent: Number(r.coPercent),
    impostoPercent: Number(r.impostoPercent),
    seguroPercent: Number(r.seguroPercent),
    diasPagamento: r.diasPagamento,
    percentComissao: Number(r.percentComissao),
    comissaoValor: Number(r.comissaoValor),
    lucro: Number(r.lucro),
    percentRentabilidade: Number(r.percentRentabilidade),
    situacao: r.situacao,
    createdAt: r.createdAt,
  };
}

function toDbValues(data: z.infer<typeof createCotacaoSchema>) {
  const calc = calcularCotacao(data);
  return {
    data: data.data,
    clienteId: data.clienteId,
    origem: data.origem,
    destino: data.destino,
    km: data.km !== null ? String(data.km) : null,
    tipoVeiculo: data.tipoVeiculo,
    valorMotorista: data.valorMotorista !== null ? String(data.valorMotorista) : null,
    valorEmpresa: data.valorEmpresa !== null ? String(data.valorEmpresa) : null,
    valorNf: data.valorNf !== null ? String(data.valorNf) : null,
    icmsPercent: String(data.icmsPercent),
    coPercent: String(data.coPercent),
    impostoPercent: String(data.impostoPercent),
    seguroPercent: String(data.seguroPercent),
    diasPagamento: data.diasPagamento,
    percentComissao: String(data.percentComissao),
    comissaoValor: String(calc.comissaoValor),
    lucro: String(calc.lucro),
    percentRentabilidade: String(calc.percentRentabilidade),
    situacao: data.situacao as "pendente" | "batida",
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function listarCotacoes(situacao: "pendente" | "batida" | "todas" = "pendente") {
  const query = db
    .select({ cotacao: cotacoes, clienteNome: clientes.nome })
    .from(cotacoes)
    .leftJoin(clientes, eq(cotacoes.clienteId, clientes.id))
    .orderBy(desc(cotacoes.data));

  const rows = situacao === "todas"
    ? await query
    : await query.where(eq(cotacoes.situacao, situacao as "pendente" | "batida"));

  return rows.map((r) => mapRow({ ...r.cotacao, clienteNome: r.clienteNome }));
}

export async function criarCotacao(data: z.infer<typeof createCotacaoSchema>) {
  const [row] = await db.insert(cotacoes).values(toDbValues(data)).returning();
  const clienteNome = data.clienteId
    ? (await db.select({ nome: clientes.nome }).from(clientes).where(eq(clientes.id, data.clienteId)))[0]?.nome
    : null;
  return mapRow({ ...row, clienteNome });
}

export async function atualizarCotacao(id: number, data: z.infer<typeof updateCotacaoSchema>) {
  const [existing] = await db.select().from(cotacoes).where(eq(cotacoes.id, id));
  if (!existing) return null;

  const merged = createCotacaoSchema.parse({
    data: existing.data,
    clienteId: existing.clienteId,
    origem: existing.origem ?? "",
    destino: existing.destino ?? "",
    km: existing.km !== null ? Number(existing.km) : null,
    tipoVeiculo: existing.tipoVeiculo ?? "",
    valorMotorista: existing.valorMotorista !== null ? Number(existing.valorMotorista) : null,
    valorEmpresa: existing.valorEmpresa !== null ? Number(existing.valorEmpresa) : null,
    valorNf: existing.valorNf !== null ? Number(existing.valorNf) : null,
    icmsPercent: Number(existing.icmsPercent),
    coPercent: Number(existing.coPercent),
    impostoPercent: Number(existing.impostoPercent),
    seguroPercent: Number(existing.seguroPercent),
    diasPagamento: existing.diasPagamento,
    percentComissao: Number(existing.percentComissao),
    situacao: existing.situacao,
    ...data,
  });

  const [row] = await db.update(cotacoes).set(toDbValues(merged)).where(eq(cotacoes.id, id)).returning();
  if (!row) return null;

  const clienteNome = row.clienteId
    ? (await db.select({ nome: clientes.nome }).from(clientes).where(eq(clientes.id, row.clienteId)))[0]?.nome
    : null;
  return mapRow({ ...row, clienteNome });
}

export async function patchSituacao(id: number, situacao: "pendente" | "batida") {
  const [row] = await db
    .update(cotacoes)
    .set({ situacao })
    .where(eq(cotacoes.id, id))
    .returning();
  return row ? mapRow(row) : null;
}

export async function deletarCotacao(id: number) {
  const [row] = await db.delete(cotacoes).where(eq(cotacoes.id, id)).returning();
  return Boolean(row);
}

// ── Converter cotação → carga ────────────────────────────────────────────────
// Percentuais são convertidos de formato legível (4%) para fração (0.04)

export async function converterParaCarga(
  id: number,
  data: z.infer<typeof converterSchema>,
) {
  const [cotacao] = await db.select().from(cotacoes).where(eq(cotacoes.id, id));
  if (!cotacao || !cotacao.clienteId || !cotacao.valorEmpresa || !cotacao.valorMotorista) {
    return null;
  }

  const ve = Number(cotacao.valorEmpresa);
  const vm = Number(cotacao.valorMotorista);
  const vn = cotacao.valorNf !== null ? Number(cotacao.valorNf) : ve;

  // Converte percentuais legíveis → frações para @thiago/core
  const cargaInput = {
    valorMotorista: vm,
    valorEmpresa: ve,
    valorNF: vn,
    seguroPercent: Number(cotacao.seguroPercent) / 100,
    icmsPercent: Number(cotacao.icmsPercent) / 100,
    coPercent: Number(cotacao.coPercent) / 100,
    impostoPercent: Number(cotacao.impostoPercent) / 100,
    diasPagamento: cotacao.diasPagamento,
    percentComissao: Number(cotacao.percentComissao) / 100,
  };

  const calc = calcularCarga(cargaInput);

  // Verifica que o motorista existe
  const [motorista] = await db
    .select({ id: motoristas.id })
    .from(motoristas)
    .where(eq(motoristas.id, data.motoristaId));
  if (!motorista) return null;

  // Cria a carga
  const [novaCarga] = await db
    .insert(cargas)
    .values({
      data: cotacao.data,
      cte: data.cte,
      origem: cotacao.origem,
      destino: cotacao.destino,
      clienteId: cotacao.clienteId,
      motoristaId: data.motoristaId,
      valorMotorista: String(vm),
      valorEmpresa: String(ve),
      valorNF: String(vn),
      seguroPercent: String(cargaInput.seguroPercent),
      icmsPercent: String(cargaInput.icmsPercent),
      coPercent: String(cargaInput.coPercent),
      impostoPercent: String(cargaInput.impostoPercent),
      diasPagamento: cargaInput.diasPagamento,
      percentComissao: String(cargaInput.percentComissao),
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
      tipoEntrega: cotacao.tipoVeiculo ?? undefined,
    })
    .returning();

  // Remove a cotação
  await db.delete(cotacoes).where(eq(cotacoes.id, id));

  return { cargaId: novaCarga.id };
}
