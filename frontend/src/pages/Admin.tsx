// src/pages/Admin.tsx
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession, isAdminUnlocked } from "../utils/adminSession";


export default function Admin() {
  const [announce, setAnnounce] = useState("");
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    setAnnounce("");
  }, [loc.pathname]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isAdminUnlocked()) {
        clearAdminSession();
        nav("/", { replace: true }); // ✅ 回 admin 站 Gate（同一個 origin）
      }
    }, 5_000); // 5 秒檢查一次，踢出更快

    return () => window.clearInterval(id);
  }, [nav]);

  function logout() {
    clearAdminSession();
    // ✅ gate 在 "/"（admin 站），並帶 next 讓你回來方便
    nav(`/?next=${encodeURIComponent(loc.pathname)}`, { replace: true });
  }

  return (
    <div className="admin-scope">
      <div style={{ padding: 16 }}>
        <div
          role="status"
          aria-live="polite"
          style={{ position: "absolute", left: -9999 }}
        >
          {announce}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <NavLink
            className="btn"
            to="/admin/orders"
            onClick={() => setAnnounce("已切換到：訂單")}
            aria-current={loc.pathname === "/admin/orders" ? "page" : undefined}
          >
            訂單
          </NavLink>

          <NavLink
            className="btn"
            to="/admin/products"
            onClick={() => setAnnounce("已切換到：商品")}
            end={false}
          >
            商品
          </NavLink>

          <NavLink
            className="btn"
            to="/admin/categories"
            onClick={() => setAnnounce("已切換到：分類")}
            aria-current={loc.pathname === "/admin/categories"? "page" : undefined}
          >
            分類
          </NavLink>

          <button className="btn" type="button" onClick={logout}>
            離開管理模式
          </button>
        </div>
      </div>

      {/* ✅ 真正內容交給 router */}
      <Outlet />
    </div>
  );
}
