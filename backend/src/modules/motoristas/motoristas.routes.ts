import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import {
  createMotoristaSchema,
  updateMotoristaSchema,
  criarMotorista,
  atualizarMotorista,
  deletarMotorista,
  listarMotoristas,
} from "./motoristas.service";

export const motoristasRouter = Router();
motoristasRouter.use(requireAuth);

motoristasRouter.get("/", asyncHandler(async (_req, res) => {
  res.json(await listarMotoristas());
}));

motoristasRouter.post("/", asyncHandler(async (req, res) => {
  const parsed = createMotoristaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await criarMotorista(parsed.data));
}));

motoristasRouter.put("/:id", asyncHandler(async (req, res) => {
  const parsed = updateMotoristaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const motorista = await atualizarMotorista(Number(req.params.id), parsed.data);
  if (!motorista) { res.status(404).json({ error: "Motorista não encontrado" }); return; }
  res.json(motorista);
}));

motoristasRouter.delete("/:id", asyncHandler(async (req, res) => {
  const ok = await deletarMotorista(Number(req.params.id));
  if (!ok) { res.status(404).json({ error: "Motorista não encontrado" }); return; }
  res.status(204).send();
}));
