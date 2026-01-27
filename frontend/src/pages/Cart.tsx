// src/pages/Cart.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { apiGet } from "../api/client";

type ProductLite = {
  id: number;
  stock_qty: number;
};

function announce(msg: string) {
  // LiveRegion.tsx 若有掛 window.__liveRegionAnnounce 就會朗讀
  (window as any).__liveRegionAnnounce?.(msg);
}

export default function Cart() {
  const navigate = useNavigate();

  const items = useCartStore((s) => s.items);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const setQty = useCartStore((s) => s.setQty);
  const clear = useCartStore((s) => s.clear);

  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // 抓庫存（讓 maxStock 生效）
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        // 假設後端 GET /products 回傳含 id, stock 的商品列表
        const products = await apiGet<ProductLite[]>("/products");
        if (!mounted) return;

        const map: Record<number, number> = {};
        for (const p of products) map[p.id] = p.stock_qty ?? 0;
        setStockMap(map);
      } catch (e: any) {
        const msg = e?.message || "載入商品庫存失敗";
        setErr(msg);
        announce(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + (it.qty ?? 0), 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, it) => sum + (it.price ?? 0) * (it.qty ?? 0), 0),
    [items]
  );

  if (items.length === 0) {
    return (
      <div className="card">
        <h1 className="cart-title">🛒 購物車</h1>
        <p>目前尚未加入商品。</p>
        <p>
          <Link to="/products" className="btn">去逛商品</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>🛒購物車</h1>

      {err ? <p className="danger">⚠️ {err}</p> : null}
      {loading ? <p>載入庫存中…</p> : null}

      <ul aria-label="購物車商品清單">
        {items.map((it) => {
          const maxStock = stockMap[it.productId]; // 可能是 undefined（還沒載到）
          const hasStock = typeof maxStock === "number";
          const upper = hasStock ? maxStock : Number.MAX_SAFE_INTEGER;
          const atLimit = hasStock && it.qty >= maxStock;

          return (
            <li key={it.productId} style={{ marginBottom: 12 }}>
              <div className="row-between" style={{ gap: 12 }}>
                <div>
                  <div>
                    <strong>{it.name}</strong>
                  </div>
                    <div className="item-info">
                      <span className="price">單價：{it.price} 元</span>
                      <span className="subtotal">小計：{it.price * it.qty} 元</span>
                      {typeof maxStock === "number" ? (
                        maxStock <= 0 ? (
                          <span className="stock-out">庫存：0 件（售完）</span>
                        ) : (
                          <>
                            <span className="stock">庫存：{maxStock} 件</span>
                            <span className="remain">剩餘：{Math.max(0, maxStock - it.qty)} 件</span>
                          </>
                        )
                      ) : null}
                    </div>
                </div>

                <div className="qty" aria-label={`${it.name} 數量調整`}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => dec(it.productId)}
                    aria-label={`減少 ${it.name} 數量`}
                  >
                    —
                  </button>

                  <label className="sr-only" htmlFor={`qty-${it.productId}`}>
                    {it.name} 數量
                  </label>
                  <input
                    id={`qty-${it.productId}`}
                    className="qty-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={upper === Number.MAX_SAFE_INTEGER ? undefined : upper}
                    value={it.qty}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      const next = Number.isFinite(n) ? n : 0;

                      if (typeof maxStock === "number" && next > maxStock) {
                        const msg = `「${it.name}」庫存不足，最多只能 ${maxStock} 件。`;
                        announce(msg);
                      }
                      setQty(it.productId, next, maxStock);
                    }}
                    aria-describedby={`hint-${it.productId}`}
                  />

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      if (typeof maxStock === "number" && it.qty >= maxStock) {
                        announce(`「${it.name}」最多只能買 ${maxStock} 件（已選 ${it.qty} 件）。`);
                        return;
                      }
                      inc(it.productId, maxStock);
                    }}
                    aria-label={`增加 ${it.name} 數量`}
                    disabled={atLimit}
                  >
                    ＋
                  </button>
                </div>
              </div>

              <div id={`hint-${it.productId}`} className="sr-only">
                可輸入數量，或用加減按鈕調整。輸入 0 會移除商品。
              </div>

            {atLimit ? <p className="danger">📢 此項商品已達庫存上限。</p> : null}

            </li>
          );
        })}
      </ul>

      <hr />

      <p>
        共 <strong>{totalItems}</strong> 件 👉合計 <strong>{totalPrice}</strong> 元
      </p>

      <div className="row-between">
        <button
          type="button"
          className="btn"
          onClick={() => {
            clear();
            announce("已清空購物車。");
          }}
        >
          清空購物車
        </button>

        <button
          type="button"
          className="btn"
          onClick={() => navigate("/checkout")}
        >
          前往結帳
        </button>
      </div>
    </div>
  );
}
