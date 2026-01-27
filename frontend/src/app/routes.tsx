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

      { path: "/admin-gate", element: <AdminGate /> },
      { path: "/admin", element: <Admin /> },
      { path: "/admin/products", element: <AdminProducts /> },
      { path: "/admin/orders", element: <AdminOrders /> },
    ],
  },
]);
