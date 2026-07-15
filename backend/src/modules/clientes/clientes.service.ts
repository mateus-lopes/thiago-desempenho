import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { clientes } from "../../db/schema/clientes";

export const createClienteSchema = z.object({
  nome: z.string().min(1),
  cnpj: z.string().optional(),
  contato: z.string().optional(),
  meta: z.number().min(0).default(0),
});

export const updateClienteSchema = createClienteSchema.partial();

function mapRow(r: typeof clientes.$inferSelect) {
  return {
    id: r.id,
    nome: r.nome,
    cnpj: r.cnpj,
    contato: r.contato,
    meta: Number(r.metaPadrao),
    createdAt: r.createdAt,
  };
}

export async function listarClientes() {
  const rows = await db.select().from(clientes).orderBy(clientes.nome);
  return rows.map(mapRow);
}

export async function criarCliente(data: z.infer<typeof createClienteSchema>) {
  const [row] = await db
    .insert(clientes)
    .values({
      nome: data.nome.trim().toUpperCase(),
      cnpj: data.cnpj,
      contato: data.contato,
      metaPadrao: String(data.meta),
    })
    .returning();
  return mapRow(row);
}

export async function atualizarCliente(id: number, data: z.infer<typeof updateClienteSchema>) {
  const patch: Partial<typeof clientes.$inferInsert> = {};
  if (data.nome !== undefined) patch.nome = data.nome.trim().toUpperCase();
  if (data.cnpj !== undefined) patch.cnpj = data.cnpj;
  if (data.contato !== undefined) patch.contato = data.contato;
  if (data.meta !== undefined) patch.metaPadrao = String(data.meta);

  const [row] = await db.update(clientes).set(patch).where(eq(clientes.id, id)).returning();
  return row ? mapRow(row) : null;
}

export async function deletarCliente(id: number) {
  const [row] = await db.delete(clientes).where(eq(clientes.id, id)).returning();
  return Boolean(row);
}
