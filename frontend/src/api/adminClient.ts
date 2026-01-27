// src/api/adminClient.ts

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

function joinUrl(base: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function buildHeaders() {
  const token = import.meta.env.VITE_ADMIN_TOKEN || "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Token": token, // ✅ 對應後端 require_admin(x_admin_token=Header)
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      if (typeof data === "string") return data;
      if (data?.detail) return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      return JSON.stringify(data);
    }
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function adminGet<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function adminPut<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function adminDelete<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}
