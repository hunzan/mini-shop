type AppConfig = {
  API_BASE_URL?: string;
  SHOW_ADMIN?: string; // "1" or "0"
  SHOP_URL?: string;
};

export function getRuntimeConfig(): AppConfig {
  // window.__APP_CONFIG__ 由 config.js 注入
  return (window as any).__APP_CONFIG__ || {};
}
