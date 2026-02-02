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
  { path: "/", element: <AdminGate /> },

  {
    path: "/admin",
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

  // 兼容舊路徑
  { path: "/orders", element: <Navigate to="/admin/orders" replace /> },
  { path: "/products", element: <Navigate to="/admin/products" replace /> },
  { path: "/categories", element: <Navigate to="/admin/categories" replace /> },

  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
