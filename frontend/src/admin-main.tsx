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
  // ✅ 保留 "/"：避免某些環境實際載入在 "/" 時白屏
  { path: "/", element: <AdminGate /> },

  // ✅ 真正的 admin 區域
  {
    path: "/admin",
    element: <AdminGate />, // 未解鎖顯示表單；已解鎖 <Outlet/>
    children: [
      {
        element: <Admin />, // 按鈕列 + <Outlet/>
        children: [
          // ✅ /admin 預設落點：訂單
          { index: true, element: <Navigate to="orders" replace /> },

          { path: "orders", element: <AdminOrders /> },
          { path: "products", element: <AdminProducts /> },
          { path: "categories", element: <AdminCategories /> },
        ],
      },
    ],
  },

  // ✅ 其它路徑全部導回 /admin（不要導 "/"）
  { path: "*", element: <Navigate to="/admin" replace /> },
]);


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
