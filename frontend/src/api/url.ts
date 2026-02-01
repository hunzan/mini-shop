// src/api/url.ts
import { getRuntimeConfig } from "../config/runtime";

const runtime = getRuntimeConfig();

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

export const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

export function toAbsUrl(u: string) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return `${API_BASE}/${u}`;
}
