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

function RequireAdmin() {
  const loc = useLocation();
  if (!isAdminUnlocked()) {
    const next = encodeURIComponent(loc.pathname + loc.search + loc.hash);
    return <Navigate to={`/?next=${next}`} replace />;
  }
  return <Outlet />;
}

const router = createBrowserRouter([
  // ✅ admin domain 的根：Gate（輸入密碼）
  { path: "/", element: <AdminGate /> },

  // ✅ 管理區：一定要先過 RequireAdmin，再進 Admin layout
  {
    path: "/app",
    element: <RequireAdmin />,
    children: [
      {
        element: <Admin />,
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          { path: "orders", element: <AdminOrders /> },
          { path: "products", element: <AdminProducts /> },
          { path: "categories", element: <AdminCategories /> },
        ],
      },
    ],
  },

  // ✅ 兼容：如果有人直接打舊路徑，就導到 /app
  { path: "/admin", element: <Navigate to="/app" replace /> },
  { path: "/admin/*", element: <Navigate to="/app" replace /> },

  // fallback
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
