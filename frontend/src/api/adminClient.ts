// src/api/adminClient.ts
import { clearAdminSession, getAdminToken } from "../utils/adminSession";

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

function joinUrl(base: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function jsonHeaders(extra?: Record<string, string>) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Token": getAdminToken(),
    ...(extra || {}),
  };
}

function authHeaders(extra?: Record<string, string>) {
  // 上傳用：不要指定 Content-Type，讓瀏覽器自動帶 multipart boundary
  return {
    Accept: "application/json",
    "X-Admin-Token": getAdminToken(),
    ...(extra || {}),
  };
}

async function parseError(res: Response): Promise<string> {
  const statusPrefix = `[HTTP ${res.status}] `;

    if (res.status === 401) {
      return (
        statusPrefix +
        "沒有權限：管理驗證失敗或已過期。請回到「管理入口」重新登入。"
      );
    }

  try {
    const rawText = await res.text();
    const ct = res.headers.get("content-type") || "";

    if (ct.includes("application/json") && rawText) {
      try {
        const data = JSON.parse(rawText);

        if (typeof data === "string") return `${statusPrefix}${data}`;

        if (data?.detail) {
          if (data.detail === "ADMIN_TOKEN not set") {
            return `${statusPrefix}伺服器尚未設定管理權杖（ADMIN_TOKEN），請聯絡網管。`;
          }
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

    return rawText ? `${statusPrefix}${rawText}` : `錯誤代碼：${res.status}`;
  } catch {
    return `${statusPrefix}無法解析錯誤訊息`;
  }
}

async function ensureOk<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // ✅ 401：立刻清掉管理狀態
    if (res.status === 401) {
      clearAdminSession();
    }
    throw new Error(await parseError(res));
  }

  if (res.status === 204) return undefined as unknown as T;

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return (await res.text()) as unknown as T;
  }

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

export async function adminPatch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = joinUrl(API_BASE, path);

  // ✅ headers 合併：允許 init 覆蓋一般 header，但 X-Admin-Token 一定要有
  const mergedHeaders =
    init?.headers && typeof init.headers === "object"
      ? {
          ...authHeaders(),
          ...(init.headers as Record<string, string>),
          "X-Admin-Token": getAdminToken(),
        }
      : authHeaders();

  const res = await fetch(url, {
    method: "PATCH",
    ...init,
    headers: mergedHeaders,
  });

  return ensureOk<T>(res);
}

export async function adminDelete<T>(path: string): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, { method: "DELETE", headers: authHeaders() });
  return ensureOk<T>(res);
}

// ✅ 上傳（同時支援 File 或 FormData）
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
