// src/utils/adminSession.ts
export const ADMIN_TOKEN_KEY = "admin_token";
export const ADMIN_UNLOCKED_KEY = "admin_unlocked_v1";

export function getAdminToken(): string {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function setAdminSession(token: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_UNLOCKED_KEY, "1");
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_UNLOCKED_KEY);
}

export function isAdminUnlocked(): boolean {
  return (
    sessionStorage.getItem(ADMIN_UNLOCKED_KEY) === "1" &&
    Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY))
  );
}
