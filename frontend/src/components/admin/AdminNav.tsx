// src/components/admin/AdminNav.tsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession } from "../../utils/adminSession";

export default function AdminNav() {
  const loc = useLocation();
  const nav = useNavigate();

  function logout() {
    clearAdminSession();
    nav(`/?next=${encodeURIComponent(loc.pathname)}`, { replace: true });
  }

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
      <NavLink
        className="btn"
        to="/admin/orders"
        aria-current={loc.pathname === "/admin/orders" ? "page" : undefined}
      >
        訂單
      </NavLink>

      <NavLink className="btn" to="/admin/products">
        商品
      </NavLink>

      <NavLink
        className="btn"
        to="/admin/categories"
        aria-current={loc.pathname === "/admin/categories" ? "page" : undefined}
      >
        分類
      </NavLink>

      <button className="btn" type="button" onClick={logout}>
        離開管理模式
      </button>
    </div>
  );
}
