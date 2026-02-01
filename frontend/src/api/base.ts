export const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

export const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

if (!API_BASE) {
  throw new Error("API base missing: set VITE_API_BASE_URL or VITE_API_BASE at build time");
}
