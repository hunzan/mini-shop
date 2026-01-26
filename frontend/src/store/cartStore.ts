import { create } from "zustand";

export type CartItem = {
  productId: number;
  name: string;
  price: number;

  qty: number;           // ✅ 你全站都用這個
  stock_qty?: number;    // ✅ 可選：用來做庫存上限提示
};

type CartState = {
  items: CartItem[];

  // ✅ 型別要跟實作一致：加上 maxStock?: number
  add: (item: Omit<CartItem, "qty"> & { qty?: number }, maxStock?: number) => void;
  inc: (productId: number, maxStock?: number) => void;
  dec: (productId: number) => void;

  setQty: (productId: number, qty: number, maxStock?: number) => void;

  totalItems: () => number;
  totalPrice: () => number;

  clear: () => void;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// 把 maxStock 轉成上限（沒給就當無限）
const upperOf = (maxStock?: number) => (maxStock != null ? maxStock : Number.MAX_SAFE_INTEGER);

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  add: (item, maxStock) => {
    const items = [...get().items];
    const idx = items.findIndex((i) => i.productId === item.productId);

    // ✅ 防呆：qty 至少 1（外面就算亂傳 0/負數也會被修正）
    const addQty = Math.max(1, item.qty ?? 1);
    const upper = upperOf(maxStock);

    if (idx >= 0) {
      const cur = items[idx].qty;
      const next = clamp(cur + addQty, 1, upper);
      items[idx] = { ...items[idx], qty: next };
    } else {
      const next = clamp(addQty, 1, upper);
      items.push({ productId: item.productId, name: item.name, price: item.price, qty: next });
    }

    set({ items });
  },

  inc: (productId, maxStock) => {
    const items = [...get().items];
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) return;

    const upper = upperOf(maxStock);
    const cur = items[idx].qty;
    const next = clamp(cur + 1, 1, upper);

    // 已達上限就不更新
    if (next === cur) return;

    items[idx] = { ...items[idx], qty: next };
    set({ items });
  },

  dec: (productId) => {
    const items = [...get().items];
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) return;

    const nextQty = items[idx].qty - 1;
    if (nextQty <= 0) items.splice(idx, 1);
    else items[idx] = { ...items[idx], qty: nextQty };

    set({ items });
  },

  setQty: (productId, qty, maxStock) => {
    const items = [...get().items];
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) return;

    const upper = upperOf(maxStock);
    const safeQty = Number.isFinite(qty) ? qty : 0;
    const next = clamp(qty, 0, upper);

    if (next <= 0) items.splice(idx, 1);
    else items[idx] = { ...items[idx], qty: next };

    set({ items });
  },

  totalItems: () => {
    const items = get().items ?? [];
    return items.reduce((sum, it) => sum + (it.qty ?? 0), 0);
  },

  totalPrice: () => {
    const items = get().items ?? [];
    return items.reduce((sum, it) => sum + (it.price ?? 0) * (it.qty ?? 0), 0);
  },

  clear: () => set({ items: [] }),
}));
