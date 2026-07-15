import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import {
  createCargaSchema,
  updateCargaSchema,
  patchStatusSchema,
  listarCargas,
  criarCarga,
  atualizarCarga,
  patchCarga,
  deletarCarga,
} from "./cargas.service";

export const cargasRouter = Router();
cargasRouter.use(requireAuth);

cargasRouter.get("/", asyncHandler(async (req, res) => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) { res.status(400).json({ error: "Parâmetro mes inválido. Use YYYY-MM." }); return; }
  res.json(await listarCargas(mes));
}));

cargasRouter.post("/", asyncHandler(async (req, res) => {
  const parsed = createCargaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await criarCarga(parsed.data));
}));

cargasRouter.put("/:id", asyncHandler(async (req, res) => {
  const parsed = updateCargaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const carga = await atualizarCarga(Number(req.params.id), parsed.data);
  if (!carga) { res.status(404).json({ error: "Carga não encontrada" }); return; }
  res.json(carga);
}));

cargasRouter.patch("/:id", asyncHandler(async (req, res) => {
  const parsed = patchStatusSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const carga = await patchCarga(Number(req.params.id), parsed.data);
  if (!carga) { res.status(404).json({ error: "Carga não encontrada" }); return; }
  res.json(carga);
}));

cargasRouter.delete("/:id", asyncHandler(async (req, res) => {
  const ok = await deletarCarga(Number(req.params.id));
  if (!ok) { res.status(404).json({ error: "Carga não encontrada" }); return; }
  res.status(204).send();
}));
