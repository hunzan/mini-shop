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

const router = createBrowserRouter([
  { path: "/", element: <AdminGate /> },
  {
    path: "/orders",
    element: <Admin />,
    children: [
      { index: true, element: <AdminOrders /> },
    ],
  },
  { path: "/products", element: <Admin /><* children... */ },
  { path: "/categories", element: <Admin /><* children... */ },
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
