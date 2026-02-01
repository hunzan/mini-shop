// src/api/client.ts
console.log("[API_BASE RAW]", import.meta.env.VITE_API_BASE_URL, import.meta.env.VITE_API_BASE);

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

export const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

function joinUrl(base: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function parseError(res: Response): Promise<string> {
  const statusPrefix = `[HTTP ${res.status}] `;

  // 常見狀態碼中文化（買家端也會遇到）
  if (res.status === 404) return `${statusPrefix}找不到資源。`;
  if (res.status === 429) return `${statusPrefix}請求太頻繁，請稍後再試。`;
  if (res.status >= 500) return `${statusPrefix}伺服器暫時忙碌，請稍後再試。`;

  try {
    const rawText = await res.text();
    const ct = res.headers.get("content-type") || "";

    if (ct.includes("application/json") && rawText) {
      try {
        const data = JSON.parse(rawText);
        if (typeof data === "string") return `${statusPrefix}${data}`;
        if (data?.detail) {
          return `${statusPrefix}${
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail)
          }`;
        }
        return `${statusPrefix}${JSON.stringify(data)}`;
      } catch {
        return `${statusPrefix}${rawText}`;
      }
    }

    return rawText ? `${statusPrefix}${rawText}` : `${statusPrefix}發生錯誤`;
  } catch {
    return `${statusPrefix}無法解析錯誤訊息`;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  console.log("GET", url);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);

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
  const url = joinUrl(API_BASE, path);

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

