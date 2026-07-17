import axios from "axios";

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
  // Path relativo (ex: /api) → proxy via Nginx, sem alterar
  if (raw.startsWith("/")) return raw;
  // URL externa sem protocolo → adiciona https://
  if (!raw.startsWith("http")) return `https://${raw}`;
  return raw;
}

const baseURL = resolveBaseUrl();

export const api = axios.create({
  baseURL,
  // withCredentials necessário apenas para cross-origin (sem proxy Nginx)
  withCredentials: !baseURL.startsWith("/"),
});
