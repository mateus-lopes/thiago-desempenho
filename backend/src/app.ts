import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { clientesRouter } from "./modules/clientes/clientes.routes";
import { motoristasRouter } from "./modules/motoristas/motoristas.routes";
import { cargasRouter } from "./modules/cargas/cargas.routes";
import { metasRouter } from "./modules/metas/metas.routes";
import { indicadoresRouter } from "./modules/indicadores/indicadores.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { cotacoesRouter } from "./modules/cotacoes/cotacoes.routes";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// Rotas públicas
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);

// Rotas protegidas (cada router aplica requireAuth internamente)
app.use("/api/clientes", clientesRouter);
app.use("/api/motoristas", motoristasRouter);
app.use("/api/cargas", cargasRouter);
app.use("/api/metas", metasRouter);
app.use("/api/indicadores", indicadoresRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/cotacoes", cotacoesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
});
