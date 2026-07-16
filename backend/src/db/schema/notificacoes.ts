import { boolean, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const tipoNotifEnum = pgEnum("tipo_notif", ["danger", "warn", "success"]);

export const notificacoes = pgTable(
  "notificacoes",
  {
    id: serial("id").primaryKey(),
    tipo: tipoNotifEnum("tipo").notNull(),
    titulo: varchar("titulo", { length: 255 }).notNull(),
    corpo: text("corpo").notNull(),
    lida: boolean("lida").notNull().default(false),
    descartada: boolean("descartada").notNull().default(false),
    chave: varchar("chave", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    chaveUnico: uniqueIndex("notif_chave_idx").on(table.chave),
  }),
);
