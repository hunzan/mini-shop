// src/admin-main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router-dom";

import "./styles/globals.css";

// ✅ 管理入口（輸入 token）
import AdminGate from "./pages/AdminGate";

// ✅ admin session 判斷
import { isAdminUnlocked } from "./utils/adminSession";

// ✅ Admin layout（上方 tab + Outlet）
import Admin from "./pages/Admin";

// ✅ admin pages
import AdminProducts from "./pages/AdminProducts";
import AdminCategories from "./pages/AdminCategories";
import AdminOrders from "./pages/AdminOrders";

// ----------------------
// RequireAdmin（保護 admin routes）
// ----------------------
function RequireAdmin() {
  const loc = useLocation();

  if (!isAdminUnlocked()) {
    const next = `${loc.pathname}${loc.search}${loc.hash}`;
    return <Navigate to={`/?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}

// ----------------------
// Router（admin 站）
// ----------------------
const router = createBrowserRouter([
  // ✅ 入口：Gate
  { path: "/", element: <AdminGate /> },

  // ✅ 受保護的 admin 區
  {
    element: <RequireAdmin />,
    children: [
      // ✅ 管理區 layout：固定 tab + Outlet
      {
        element: <Admin />,
        children: [
          // 預設進管理區導到訂單（你可改 products）
          { path: "/admin", element: <Navigate to="/orders" replace /> },

          { path: "/orders", element: <AdminOrders /> },
          { path: "/products", element: <AdminProducts /> },
          { path: "/categories", element: <AdminCategories /> },
        ],
      },
    ],
  },

  // fallback
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
