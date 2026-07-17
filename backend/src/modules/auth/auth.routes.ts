import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login } from "./auth.service";
import { requireAuth } from "../../middlewares/auth";
import { env } from "../../config/env";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 8 * 60 * 60 * 1000, // 8 horas
  path: "/",
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, senha } = req.body as { email?: string; senha?: string };

  if (!email || !senha) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  try {
    const { token, role } = await login(email, senha);
    res.cookie("auth_token", token, cookieOptions);
    res.json({ ok: true, role });
  } catch {
    res.status(401).json({ error: "Email ou senha inválidos" });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("auth_token", { path: "/" });
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req: any, res) => {
  res.json({ userId: req.userId, role: req.userRole });
});
