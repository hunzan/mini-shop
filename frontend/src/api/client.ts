// src/api/client.ts
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function parseError(res: Response): Promise<string> {
  // 後端有時回 JSON，有時回純文字；這裡都接得住
  const contentType = res.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
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

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log("GET", url);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;

  // 兼容：有些回傳不是 json（極少），就用 text
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return (await res.text()) as unknown as T;

  return (await res.json()) as T;
}

