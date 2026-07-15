import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import {
  createCotacaoSchema,
  updateCotacaoSchema,
  patchSituacaoSchema,
  converterSchema,
  listarCotacoes,
  criarCotacao,
  atualizarCotacao,
  patchSituacao,
  deletarCotacao,
  converterParaCarga,
} from "./cotacoes.service";

export const cotacoesRouter = Router();
cotacoesRouter.use(requireAuth);

cotacoesRouter.get("/", asyncHandler(async (req, res) => {
  const raw = req.query.situacao;
  const situacao = raw === "batida" || raw === "todas" ? raw : "pendente";
  res.json(await listarCotacoes(situacao));
}));

cotacoesRouter.post("/", asyncHandler(async (req, res) => {
  const parsed = createCotacaoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.status(201).json(await criarCotacao(parsed.data));
}));

cotacoesRouter.put("/:id", asyncHandler(async (req, res) => {
  const parsed = updateCotacaoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const cotacao = await atualizarCotacao(Number(req.params.id), parsed.data);
  if (!cotacao) { res.status(404).json({ error: "Cotação não encontrada" }); return; }
  res.json(cotacao);
}));

cotacoesRouter.patch("/:id", asyncHandler(async (req, res) => {
  const parsed = patchSituacaoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const cotacao = await patchSituacao(Number(req.params.id), parsed.data.situacao);
  if (!cotacao) { res.status(404).json({ error: "Cotação não encontrada" }); return; }
  res.json(cotacao);
}));

// POST /api/cotacoes/:id/converter — converte para carga e remove a cotação
cotacoesRouter.post("/:id/converter", asyncHandler(async (req, res) => {
  const parsed = converterSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const result = await converterParaCarga(Number(req.params.id), parsed.data);
  if (!result) { res.status(404).json({ error: "Cotação não encontrada ou dados insuficientes para conversão" }); return; }
  res.status(201).json(result);
}));

cotacoesRouter.delete("/:id", asyncHandler(async (req, res) => {
  const ok = await deletarCotacao(Number(req.params.id));
  if (!ok) { res.status(404).json({ error: "Cotação não encontrada" }); return; }
  res.status(204).send();
}));
