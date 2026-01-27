// src/pages/Admin.tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminCategories from "./AdminCategories";

const STORAGE_KEY = "admin_unlocked_v1";

export default function Admin() {
  const loc = useLocation();
  const unlocked = sessionStorage.getItem(STORAGE_KEY) === "1";

  // ✅ Gate：沒解鎖就送去 /admin-gate（並記住要回來的頁）
  if (!unlocked) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/admin-gate?next=${next}`} replace />;
  }

  const [tab, setTab] = useState<"orders" | "products" | "categories">("orders");
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    // 你如果想真的朗讀 tab 切換，也可以 setAnnounce(`已切換到：...`)
    setAnnounce("");
  }, [tab]);

  return (
    <div className="admin-scope">
      {/* 上方固定：tab 切換 + aria announce */}
      <div style={{ padding: 16 }}>
        <div
          role="status"
          aria-live="polite"
          style={{ position: "absolute", left: -9999 }}
        >
          {announce}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setTab("orders");
              setAnnounce("已切換到：訂單");
            }}
            aria-pressed={tab === "orders"}
          >
            訂單
          </button>

          <button
            className="btn"
            type="button"
            onClick={() => {
              setTab("products");
              setAnnounce("已切換到：商品");
            }}
            aria-pressed={tab === "products"}
          >
            商品
          </button>

          <button
            className="btn"
            type="button"
            onClick={() => {
              setTab("categories");
              setAnnounce("已切換到：分類");
            }}
            aria-pressed={tab === "categories"}
          >
            分類
          </button>

          <button
            className="btn"
            type="button"
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              window.location.href = "/admin-gate";
            }}
          >
            離開管理模式
          </button>
        </div>
      </div>

      {/* 依 tab 切換畫面（只渲染其中一個） */}
      {tab === "orders" && <AdminOrders />}
      {tab === "products" && <AdminProducts />}
      {tab === "categories" && <AdminCategories />}
    </div>
  );
}
