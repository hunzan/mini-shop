// src/api/url.ts
import { API_BASE } from "./base";

export function toAbsUrl(u: string) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return `${API_BASE}/${u}`;
}
