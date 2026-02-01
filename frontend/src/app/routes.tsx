import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./layout";

import Home from "../pages/Home";
import ProductList from "../pages/ProductList";
import ProductDetail from "../pages/ProductDetail";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import CheckoutResult from "../pages/CheckoutResult";

import Admin from "../pages/Admin";
import AdminProducts from "../pages/AdminProducts";
import AdminOrders from "../pages/AdminOrders";
import AdminCategories from "../pages/AdminCategories";
import AdminGate from "../pages/AdminGate";

const SHOW_ADMIN = import.meta.env.VITE_SHOW_ADMIN === "1";

const adminRoutes = SHOW_ADMIN
  ? [
      // ✅ 讓 /admin 本身存在，並可導到預設頁（例如 orders）
      {
        path: "/admin",
        element: <AdminGate />,
        children: [
          // 進 /admin 時導到預設落點（也可以改 products）
          { index: true, element: <Navigate to="/admin/orders" replace /> },

          // ✅ AdminGate 解鎖後會 render <Outlet />，所以子頁都會被 gate
          { path: "home", element: <Admin /> },
          { path: "products", element: <AdminProducts /> },
          { path: "orders", element: <AdminOrders /> },
          { path: "categories", element: <AdminCategories /> },
        ],
      },

      // （可選）如果你還想保留舊網址 /admin-gate，讓它跳到 /admin
      { path: "/admin-gate", element: <Navigate to="/admin" replace /> },
    ]
  : [];

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/products", element: <ProductList /> },
      { path: "/products/:id", element: <ProductDetail /> },
      { path: "/cart", element: <Cart /> },
      { path: "/checkout", element: <Checkout /> },
      { path: "/checkout/result", element: <CheckoutResult /> },

      ...adminRoutes,
    ],
  },
]);
