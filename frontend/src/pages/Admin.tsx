// src/pages/Admin.tsx
import { useEffect, useState } from "react";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminCategories from "./AdminCategories";

export default function Admin() {
  const [tab, setTab] = useState<"orders" | "products" | "categories">("orders");
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    setAnnounce("");
  }, [tab]);

  return (
    <div className="admin-scope">
      {/* 上方固定：tab 切換 + aria announce */}
      <div style={{ padding: 16 }}>
        <div role="status" aria-live="polite" style={{ position: "absolute", left: -9999 }}>
          {announce}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={() => setTab("orders")} aria-pressed={tab === "orders"}>
            訂單
          </button>

          <button className="btn" type="button" onClick={() => setTab("products")} aria-pressed={tab === "products"}>
            商品
          </button>

          <button className="btn" type="button" onClick={() => setTab("categories")} aria-pressed={tab === "categories"}>
            分類
          </button>
        </div>
      </div>

      {/* 依 tab 切換整個畫面（只渲染其中一個） */}
      {tab === "orders" && <AdminOrders />}
      {tab === "products" && <AdminProducts />}
      {tab === "categories" && <AdminCategories />}
    </div>
  );
}
