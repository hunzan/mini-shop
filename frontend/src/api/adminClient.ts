const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY;

function buildHeaders() {
  const token = import.meta.env.VITE_ADMIN_TOKEN || "";
  return {
    "content-type": "application/json",
    "x-admin-token": token, // ✅ 與後端 Depends 讀取一致
    "X-Admin-Key": ADMIN_KEY,
  };
}

async function throwIfNotOk(res: Response, prefix: string) {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new Error(`${prefix} failed: ${res.status} ${text}`);
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  await throwIfNotOk(res, `GET ${path}`);

  // 保險：有些 GET 也可能回空
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;

  return (await res.json()) as T;
}

// ✅ PATCH 有 body（例如：is_active true/false）
export async function adminPatchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res, `PATCH ${path}`);

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

// ✅ PATCH 沒有 body（你目前改狀態用 query param）
export async function adminPatch<T = any>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: buildHeaders(),
  });
  await throwIfNotOk(res, `PATCH ${path}`);

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

export async function adminPost<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res, `POST ${path}`);

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

// ✅ DELETE 通常回 204，回 void 最穩
export async function adminDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  await throwIfNotOk(res, `DELETE ${path}`);
}

export async function adminUploadFile<T = any>(
  path: string,
  file: File,
  fieldName = "file"
): Promise<T> {
  const token = import.meta.env.VITE_ADMIN_TOKEN || "";

  const form = new FormData();
  form.append(fieldName, file);

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "x-admin-token": token,
      // ❌ 不要加 content-type
    },
    body: form,
  });

  await throwIfNotOk(res, `POST ${path}`);

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}
