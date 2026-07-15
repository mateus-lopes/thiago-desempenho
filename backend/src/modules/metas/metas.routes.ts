import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import { listarMetas, upsertMeta, upsertMetaSchema } from "./metas.service";

export const metasRouter = Router();
metasRouter.use(requireAuth);

metasRouter.get("/", asyncHandler(async (req, res) => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) { res.status(400).json({ error: "Parâmetro mes inválido. Use YYYY-MM." }); return; }
  res.json(await listarMetas(mes));
}));

metasRouter.put("/", asyncHandler(async (req, res) => {
  const parsed = upsertMetaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await upsertMeta(parsed.data));
}));
