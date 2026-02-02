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

import AdminGate from "./pages/AdminGate";
import Admin from "./pages/Admin";
import AdminProducts from "./pages/AdminProducts";
import AdminCategories from "./pages/AdminCategories";
import AdminOrders from "./pages/AdminOrders";

import { isAdminUnlocked } from "./utils/adminSession";

// ✅ 只在 admin app 內使用的 guard
function RequireAdmin() {
  const loc = useLocation();
  if (!isAdminUnlocked()) {
    const next = encodeURIComponent(loc.pathname + loc.search + loc.hash);
    return <Navigate to={`/?next=${next}`} replace />;
  }
  return <Outlet />;
}

const router = createBrowserRouter([
  // ✅ Gate：登入頁（admin domain 的根）
  { path: "/", element: <AdminGate /> },

  // ✅ 受保護的 admin 區：一定要先過 RequireAdmin
  {
    path: "/admin",
    element: <RequireAdmin />,
    children: [
      // ✅ Admin layout：上方按鈕列 + Outlet
      {
        element: <Admin />,
        children: [
          // /admin 預設落點
          { index: true, element: <Navigate to="orders" replace /> },

          { path: "orders", element: <AdminOrders /> },
          { path: "products", element: <AdminProducts /> },
          { path: "categories", element: <AdminCategories /> },
        ],
      },
    ],
  },

  // ✅ 兼容：如果有人直接打 /orders，就導到 /admin/orders
  { path: "/orders", element: <Navigate to="/admin/orders" replace /> },
  { path: "/products", element: <Navigate to="/admin/products" replace /> },
  { path: "/categories", element: <Navigate to="/admin/categories" replace /> },

  // fallback
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
