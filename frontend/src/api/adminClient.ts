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

function adminToken() {
  return import.meta.env.VITE_ADMIN_TOKEN || "";
}

function jsonHeaders(extra?: Record<string, string>) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Token": adminToken(),
    ...(extra || {}),
  };
}

function authHeaders(extra?: Record<string, string>) {
  // 上傳用：不要指定 Content-Type，讓瀏覽器自動帶 multipart boundary
  return {
    Accept: "application/json",
    "X-Admin-Token": adminToken(),
    ...(extra || {}),
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      if (typeof data === "string") return data;
      if (data?.detail)
        return typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail);
      return JSON.stringify(data);
    }
    return await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function ensureOk<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}

// ✅ 你需要的：adminGet / adminPost / adminPatchJson

export async function adminGet<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, { headers: authHeaders() });
  return ensureOk<T>(res);
}

// 相容舊用法：adminPost(...) 一律當 JSON POST
export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return ensureOk<T>(res);
}

export async function adminPutJson<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return ensureOk<T>(res);
}

export async function adminPatchJson<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return ensureOk<T>(res);
}

export async function adminPatch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = joinUrl(API_BASE, path);

  const res = await fetch(url, {
    method: "PATCH",
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeaders(),
    },
  });

  return ensureOk<T>(res);
}

export async function adminDelete<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, { method: "DELETE", headers: authHeaders() });
  return ensureOk<T>(res);
}

// ✅ 你之前也缺過：上傳（同時支援 File 或 FormData）
export async function adminUploadFile<T>(
  path: string,
  fileOrForm: File | FormData,
  fieldName = "file"
): Promise<T> {
  const url = joinUrl(API_BASE, path);

  const form =
    fileOrForm instanceof FormData
      ? fileOrForm
      : (() => {
          const fd = new FormData();
          fd.append(fieldName, fileOrForm);
          return fd;
        })();

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  return ensureOk<T>(res);
}
