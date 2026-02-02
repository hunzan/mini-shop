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
  // 入口：admin 站 Gate（你想留 "/" 當 gate 就留）
  { path: "/", element: <AdminGate /> },

  // /admin 區：先 gate，再進 layout，再進各頁
  {
    path: "/admin",
    element: <AdminGate />, // ✅ 守門：未解鎖顯示表單；已解鎖 <Outlet/>
    children: [
      {
        element: <Admin />,   // ✅ 這裡就是你的按鈕列 + <Outlet/>
        children: [
          // /admin 預設落點（登入後/直接進 /admin）
          { index: true, element: <Navigate to="/" replace /> },

          { path: "categories", element: <AdminCategories /> },
          { path: "orders", element: <AdminOrders /> },
          { path: "products", element: <AdminProducts /> },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
