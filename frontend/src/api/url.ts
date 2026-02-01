// src/api/url.ts
const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

if (!API_BASE) {
  throw new Error("API base missing: set VITE_API_BASE_URL or VITE_API_BASE at build time");
}

export function toAbsUrl(u: string) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return `${API_BASE}/${u}`;
}
