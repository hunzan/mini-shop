// src/utils/adminSession.ts
export const ADMIN_TOKEN_KEY = "admin_token";
export const ADMIN_UNLOCKED_KEY = "admin_unlocked_v1";
export const ADMIN_EXPIRES_AT_KEY = "admin_expires_at"; // ✅ 新增

export function getAdminToken(): string {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function getAdminExpiresAt(): string {
  return sessionStorage.getItem(ADMIN_EXPIRES_AT_KEY) || "";
}

export function setAdminSession(token: string, expiresAtIso: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_UNLOCKED_KEY, "1");
  sessionStorage.setItem(ADMIN_EXPIRES_AT_KEY, expiresAtIso);
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_UNLOCKED_KEY);
  sessionStorage.removeItem(ADMIN_EXPIRES_AT_KEY);
}

// ✅ 是否已過期（沒有 expires_at 視為過期）
export function isAdminExpired(): boolean {
  const exp = getAdminExpiresAt();
  if (!exp) return true;

  const t = new Date(exp).getTime();
  if (!Number.isFinite(t)) return true;

  return Date.now() >= t;
}

export function isAdminUnlocked(): boolean {
  // ✅ 前端主動踢出：過期就清
  if (isAdminExpired()) {
    clearAdminSession();
    return false;
  }

  return (
    sessionStorage.getItem(ADMIN_UNLOCKED_KEY) === "1" &&
    Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY))
  );
}
