import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { clientes } from "./clientes";
import { motoristas } from "./motoristas";

export const statusCargaEnum = pgEnum("status_carga", ["em_andamento", "entregue"]);

export const cargas = pgTable("cargas", {
  id: serial("id").primaryKey(),
  data: date("data").notNull(),
  cte: varchar("cte", { length: 100 }),
  origem: varchar("origem", { length: 255 }),
  destino: varchar("destino", { length: 255 }),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  motoristaId: integer("motorista_id")
    .notNull()
    .references(() => motoristas.id),

  // Inputs manuais (colunas N,O,P,Q,S,U,X,AA,AD do Excel original)
  valorMotorista: numeric("valor_motorista", { precision: 14, scale: 4 }).notNull(),
  valorEmpresa: numeric("valor_empresa", { precision: 14, scale: 4 }).notNull(),
  valorNF: numeric("valor_nf", { precision: 14, scale: 4 }).notNull(),
  seguroPercent: numeric("seguro_percent", { precision: 8, scale: 6 }).notNull(),
  icmsPercent: numeric("icms_percent", { precision: 8, scale: 6 }).notNull(),
  coPercent: numeric("co_percent", { precision: 8, scale: 6 }).notNull(),
  impostoPercent: numeric("imposto_percent", { precision: 8, scale: 6 }).notNull(),
  diasPagamento: integer("dias_pagamento").notNull(),
  percentComissao: numeric("percent_comissao", { precision: 8, scale: 6 }).notNull(),

  // Campos calculados por @thiago/core (nunca recebidos direto do cliente HTTP)
  seguroValor: numeric("seguro_valor", { precision: 14, scale: 4 }).notNull(),
  coValor: numeric("co_valor", { precision: 14, scale: 4 }).notNull(),
  impostoValor: numeric("imposto_valor", { precision: 14, scale: 4 }).notNull(),
  boletoPercent: numeric("boleto_percent", { precision: 8, scale: 6 }).notNull(),
  movaValor: numeric("mova_valor", { precision: 14, scale: 4 }).notNull(),
  adqTabValor: numeric("adq_tab_valor", { precision: 14, scale: 4 }).notNull(),
  totalTaxasPercent: numeric("total_taxas_percent", { precision: 8, scale: 6 }).notNull(),
  valorImpostoTotal: numeric("valor_imposto_total", { precision: 14, scale: 4 }).notNull(),
  comissaoValor: numeric("comissao_valor", { precision: 14, scale: 4 }).notNull(),
  boletosValor: numeric("boletos_valor", { precision: 14, scale: 4 }).notNull(),
  lucro: numeric("lucro", { precision: 14, scale: 4 }).notNull(),
  percentRentabilidade: numeric("percent_rentabilidade", { precision: 10, scale: 8 }).notNull(),

  status: statusCargaEnum("status").notNull().default("em_andamento"),
  canhotoPago: boolean("canhoto_enviado").notNull().default(false),
  tipoEntrega: varchar("tipo_entrega", { length: 100 }),
  formaPagamento: varchar("forma_pagamento", { length: 100 }),
  diaPagamento: integer("dia_pagamento"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
