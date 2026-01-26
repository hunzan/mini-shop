// src/utils/labels.ts

export type OrderStatus = "pending" | "paid" | "shipped" | "done" | "cancelled";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "待處理",
  paid: "已收款",
  shipped: "已出貨",
  done: "已完成",
  cancelled: "已取消",
};

export const ORDER_STATUS_ACTION_LABEL: Record<string, string> = {
  pending: "設為待處理",
  paid: "設為已收款",
  shipped: "設為已出貨",
  done: "設為已完成",
  cancelled: "設為已取消",
};

// 物流方式（你畫面顯示 cvs_711）
export const SHIPPING_LABEL: Record<string, string> = {
  cvs_711: "超商取貨（7-11）",
  cvs_family: "超商取貨（全家）",
  cvs_hilife: "超商取貨（萊爾富）",
  cvs_ok: "超商取貨（OK）",
  post: "郵局寄送",
  home: "宅配到府",
};

// 顯示用：找不到就回傳原字串（避免爆炸）
export function labelOf(map: Record<string, string>, key: unknown): string {
  const k = String(key ?? "");
  return map[k] ?? k;
}
