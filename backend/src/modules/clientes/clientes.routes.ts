import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import {
  createClienteSchema,
  updateClienteSchema,
  criarCliente,
  atualizarCliente,
  deletarCliente,
  listarClientes,
} from "./clientes.service";

export const clientesRouter = Router();
clientesRouter.use(requireAuth);

clientesRouter.get("/", asyncHandler(async (_req, res) => {
  res.json(await listarClientes());
}));

clientesRouter.post("/", asyncHandler(async (req, res) => {
  const parsed = createClienteSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await criarCliente(parsed.data));
}));

clientesRouter.put("/:id", asyncHandler(async (req, res) => {
  const parsed = updateClienteSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const cliente = await atualizarCliente(Number(req.params.id), parsed.data);
  if (!cliente) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
  res.json(cliente);
}));

clientesRouter.delete("/:id", asyncHandler(async (req, res) => {
  const ok = await deletarCliente(Number(req.params.id));
  if (!ok) { res.status(404).json({ error: "Cliente não encontrado" }); return; }
  res.status(204).send();
}));
