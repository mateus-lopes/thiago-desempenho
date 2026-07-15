import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import { listarIndicadores, upsertIndicador, upsertIndicadorSchema } from "./indicadores.service";

export const indicadoresRouter = Router();
indicadoresRouter.use(requireAuth);

indicadoresRouter.get("/", asyncHandler(async (req, res) => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) { res.status(400).json({ error: "Parâmetro mes inválido. Use YYYY-MM." }); return; }
  res.json(await listarIndicadores(mes));
}));

indicadoresRouter.put("/", asyncHandler(async (req, res) => {
  const parsed = upsertIndicadorSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await upsertIndicador(parsed.data));
}));
