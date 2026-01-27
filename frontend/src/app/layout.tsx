import { Outlet, Link, NavLink } from "react-router-dom";
import SkipToContent from "../components/A11y/SkipToContent";
import LiveRegion from "../components/A11y/LiveRegion";
import { useCartStore } from "../store/cartStore";

export default function Layout() {
  const items = useCartStore((s) => s.items ?? []);
  const count = items.reduce((sum, it) => sum + (it.qty ?? 0), 0);
  const showAdmin = Boolean(import.meta.env.VITE_ADMIN_TOKEN);

  return (
    <div>
      <SkipToContent targetId="main" />
      <LiveRegion />

      <header className="site-header">
        <div className="container row-between">
          <Link to="/" className="brand">🐰思融的精品店🥕</Link>

          <nav aria-label="主要導覽" className="nav nav-actions">
            <NavLink to="/products" className="nav-btn">
              商品
            </NavLink>

            <NavLink to="/cart" className="nav-btn" aria-label={`購物車，目前 ${count} 件`}>
              <span className="nav-cart">
                購物車
                {count > 0 && <span className="cart-badge">{count}</span>}
              </span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main" className="container">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <small>© {new Date().getFullYear()} Julie's Boutique</small>
        </div>
      </footer>
    </div>
  );
}
