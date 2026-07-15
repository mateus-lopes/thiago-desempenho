import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import { getDashboardMes, getDashboardAnual } from "./dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/", asyncHandler(async (req, res) => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) { res.status(400).json({ error: "Parâmetro mes inválido. Use YYYY-MM." }); return; }
  res.json(await getDashboardMes(mes));
}));

dashboardRouter.get("/anual", asyncHandler(async (req, res) => {
  const ano = Number(req.query.ano ?? new Date().getFullYear());
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) { res.status(400).json({ error: "Parâmetro ano inválido." }); return; }
  res.json(await getDashboardAnual(ano));
}));
