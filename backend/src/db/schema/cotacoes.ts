import { integer, numeric, pgEnum, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { clientes } from "./clientes";

export const situacaoCotacaoEnum = pgEnum("situacao_cotacao", ["pendente", "batida"]);

export const cotacoes = pgTable("cotacoes", {
  id: serial("id").primaryKey(),
  data: varchar("data", { length: 10 }).notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),

  origem: varchar("origem", { length: 255 }),
  destino: varchar("destino", { length: 255 }),
  km: numeric("km", { precision: 10, scale: 2 }),
  tipoVeiculo: varchar("tipo_veiculo", { length: 100 }),

  // Inputs — percentuais no formato legível (ex: 4 para 4%, 0.03 para 0.03%)
  valorMotorista: numeric("valor_motorista", { precision: 14, scale: 4 }),
  valorEmpresa: numeric("valor_empresa", { precision: 14, scale: 4 }),
  valorNf: numeric("valor_nf", { precision: 14, scale: 4 }),
  icmsPercent: numeric("icms_percent", { precision: 8, scale: 4 }).notNull().default("4"),
  coPercent: numeric("co_percent", { precision: 8, scale: 4 }).notNull().default("3.5"),
  impostoPercent: numeric("imposto_percent", { precision: 8, scale: 4 }).notNull().default("6.5"),
  seguroPercent: numeric("seguro_percent", { precision: 8, scale: 4 }).notNull().default("0.03"),
  diasPagamento: integer("dias_pagamento").notNull().default(15),
  percentComissao: numeric("percent_comissao", { precision: 8, scale: 4 }).notNull().default("10"),

  // Calculados
  comissaoValor: numeric("comissao_valor", { precision: 14, scale: 4 }).notNull().default("0"),
  lucro: numeric("lucro", { precision: 14, scale: 4 }).notNull().default("0"),
  percentRentabilidade: numeric("percent_rentabilidade", { precision: 10, scale: 8 }).notNull().default("0"),

  situacao: situacaoCotacaoEnum("situacao").notNull().default("pendente"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
