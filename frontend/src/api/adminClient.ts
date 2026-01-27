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
function adminToken() {
  return import.meta.env.VITE_ADMIN_TOKEN || "";
}

function jsonHeaders(extra?: Record<string, string>) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Token": token, // ✅ 對應後端 require_admin(x_admin_token=Header)
    "X-Admin-Token": adminToken(),
    ...(extra || {}),
  };
}

function authHeaders(extra?: Record<string, string>) {
  // 給上傳用：不強制 Content-Type，讓瀏覽器自動帶 multipart boundary
  return {
    Accept: "application/json",
    "X-Admin-Token": adminToken(),
    ...(extra || {}),
  };
}

@@ -27,7 +40,10 @@
    if (ct.includes("application/json")) {
      const data = await res.json();
      if (typeof data === "string") return data;
      if (data?.detail) return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      if (data?.detail)
        return typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail);
      return JSON.stringify(data);
    }
    return await res.text();
@@ -36,45 +52,94 @@
  }
}

export async function adminGet<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, { headers: buildHeaders() });
async function ensureOk<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
// -------- 基本 CRUD（你以後也可以用） --------

export async function adminGet<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, { headers: authHeaders() });
  return ensureOk<T>(res);
}

export async function adminPostJson<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
  return ensureOk<T>(res);
}

export async function adminPut<T>(path: string, body: unknown): Promise<T> {
export async function adminPutJson<T>(path: string, body: unknown): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "PUT",
    headers: buildHeaders(),
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
  return ensureOk<T>(res);
}

export async function adminDelete<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(),
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
  return ensureOk<T>(res);
}

// -------- 你目前缺的：PATCH & PATCH JSON --------

export async function adminPatch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "PATCH",
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeaders(), // 確保一定帶 token
    },
  });
  return ensureOk<T>(res);
}

export async function adminPatchJson<T>(
  path: string,
  body: unknown
): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return ensureOk<T>(res);
}

// -------- 你目前缺的：上傳檔案 --------

export async function adminUploadFile<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(), // 不要 Content-Type
    body: formData,
  });
  return ensureOk<T>(res);
}