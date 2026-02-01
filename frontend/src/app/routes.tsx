import { createBrowserRouter } from "react-router-dom";
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
import AdminGate from "../pages/AdminGate";
import RequireAdmin from "../components/Admin/RequireAdmin";
import AdminCategories from "../pages/AdminCategories";
import { getRuntimeConfig } from "../config/runtime";

const runtime = getRuntimeConfig();

const SHOW_ADMIN =
  runtime.SHOW_ADMIN === "1" ||
  import.meta.env.VITE_SHOW_ADMIN === "1";

const adminRoutes = SHOW_ADMIN
  ? [
      // ✅ 管理入口不包 RequireAdmin
      { path: "/admin-gate", element: <AdminGate /> },

      // ✅ 後台路由全部包起來
      { path: "/admin", element: <RequireAdmin><Admin /></RequireAdmin> },
      { path: "/admin/products", element: <RequireAdmin><AdminProducts /></RequireAdmin> },
      { path: "/admin/orders", element: <RequireAdmin><AdminOrders /></RequireAdmin> },
      { path: "/admin/categories", element: <RequireAdmin><AdminCategories /></RequireAdmin> },
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