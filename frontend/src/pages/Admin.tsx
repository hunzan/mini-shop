// src/pages/Admin.tsx
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession } from "../utils/adminSession";

export default function Admin() {
  const [announce, setAnnounce] = useState("");
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    setAnnounce("");
  }, [loc.pathname]);

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
            to="/orders"
            onClick={() => setAnnounce("已切換到：訂單")}
            aria-current={loc.pathname === "/orders" ? "page" : undefined}
          >
            訂單
          </NavLink>

          <NavLink
            className="btn"
            to="/products"
            onClick={() => setAnnounce("已切換到：商品")}
            end={false}
          >
            商品
          </NavLink>

          <NavLink
            className="btn"
            to="/categories"
            onClick={() => setAnnounce("已切換到：分類")}
            aria-current={loc.pathname === "/categories" ? "page" : undefined}
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
