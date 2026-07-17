import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema/users";
import { env } from "../../config/env";

export async function login(email: string, senha: string): Promise<{ token: string; role: string }> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) throw new Error("Credenciais inválidas");

  const senhaOk = await bcrypt.compare(senha, user.passwordHash);
  if (!senhaOk) throw new Error("Credenciais inválidas");

  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: "7d" });
  return { token, role: user.role };
}
