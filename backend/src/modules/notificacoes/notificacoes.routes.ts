import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import { gerarEListar, listarHistorico, marcarLida, marcarTodasLidas, descartar } from "./notificacoes.service";

export const notificacoesRouter = Router();
notificacoesRouter.use(requireAuth);

notificacoesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const lista = await gerarEListar();
    res.json(lista);
  }),
);

notificacoesRouter.get(
  "/historico",
  asyncHandler(async (_req, res) => {
    const lista = await listarHistorico();
    res.json(lista);
  }),
);

notificacoesRouter.patch(
  "/lidas",
  asyncHandler(async (_req, res) => {
    await marcarTodasLidas();
    res.json({ ok: true });
  }),
);

notificacoesRouter.patch(
  "/:id/lida",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const row = await marcarLida(id);
    if (!row) { res.status(404).json({ error: "Notificação não encontrada" }); return; }
    res.json(row);
  }),
);

notificacoesRouter.patch(
  "/:id/descartar",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const row = await descartar(id);
    if (!row) { res.status(404).json({ error: "Notificação não encontrada" }); return; }
    res.json(row);
  }),
);
