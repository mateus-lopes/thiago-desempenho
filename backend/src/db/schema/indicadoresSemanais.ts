import { integer, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const indicadoresSemanais = pgTable(
  "indicadores_semanais",
  {
    id: serial("id").primaryKey(),
    mes: varchar("mes", { length: 7 }).notNull(),
    semana: integer("semana").notNull(),
    ligacoes: integer("ligacoes").notNull().default(0),
    leadsAdicionados: integer("leads_adicionados").notNull().default(0),
    leadsDeclinados: integer("leads_declinados").notNull().default(0),
    clientesFechados: integer("clientes_fechados").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    mesSemanaunico: uniqueIndex("indicadores_mes_semana_idx").on(table.mes, table.semana),
  }),
);
