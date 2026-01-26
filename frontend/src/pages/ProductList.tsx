import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";
import type { Product } from "../types/product";
import { useCartStore } from "../store/cartStore";
import { API_BASE } from "../api/client";
import { Link } from "react-router-dom";

function stripHtml(s: string) {
  return (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function shortDesc(desc: string, max = 60) {
  const t = stripHtml(desc);
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function announce(msg: string) {
  (window as any).__liveRegionAnnounce?.(msg);
}

export default function ProductList() {
  const add = useCartStore((s) => s.add);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 每個商品選購數量
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({});
  // 哪些商品正在顯示「到上限提示」
  const [limitMap, setLimitMap] = useState<Record<number, boolean>>({});

  // 圖片放大 modal
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const [addedMsgById, setAddedMsgById] = useState<Record<number, string>>({});

  function flashAdded(id: number, msg: string) {
    setAddedMsgById((m) => ({ ...m, [id]: msg }));
    window.setTimeout(() => {
      setAddedMsgById((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
    }, 2000);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet<Product[]>("/products");
        if (!mounted) return;

        const actives = (data || []).filter((p) => p.is_active);
        setProducts(actives);

        // 預設 qty = 1
        const init: Record<number, number> = {};
        for (const p of actives) init[p.id] = 1;
        setQtyMap(init);
      } catch (e: any) {
        const msg = e?.message || "載入商品失敗";
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

  // Esc 關 modal
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const setQty = (id: number, next: number, stock: number) => {
    const upper = Math.max(0, stock ?? 0);
    const clamped = Math.max(1, Math.min(next, upper === 0 ? 1 : upper));

    setQtyMap((m) => ({ ...m, [id]: clamped }));

    // 上限提示處理
    if (upper > 0 && clamped >= upper) {
      setLimitMap((m) => ({ ...m, [id]: true }));
      announce("此項商品已達庫存");
    } else {
      setLimitMap((m) => ({ ...m, [id]: false }));
    }
  };

  const inc = (p: Product) => {
    const cur = qtyMap[p.id] ?? 1;
    if (p.stock > 0 && cur >= p.stock) {
      setLimitMap((m) => ({ ...m, [p.id]: true }));
      announce("此項商品已達庫存");
      return;
    }
    setQty(p.id, cur + 1, p.stock_qty);
  };

  const dec = (p: Product) => {
    const cur = qtyMap[p.id] ?? 1;
    setQty(p.id, cur - 1, p.stock_qty);
  };

  return (
    <div className="card">
      <h1 className="product-title">商品列表</h1>

      {loading ? <p>載入中…</p> : null}
      {err ? <p className="danger">⚠️ {err}</p> : null}

      <ul aria-label="商品清單">
        {products.map((p) => {
        const imgSrc =
          p.image_url
            ? (p.image_url.startsWith("http") ? p.image_url : `${API_BASE}${p.image_url}`)
            : "/placeholder.png";

          const qty = qtyMap[p.id] ?? 1;
          const atLimit = p.stock > 0 && qty >= p.stock;
          const soldOut = p.stock <= 0;
          const showLimit = !!limitMap[p.id] && atLimit;

          return (
            <li key={p.id} style={{ marginBottom: 16 }}>
              <div className="row-between" style={{ gap: 12, alignItems: "flex-start" }}>
                {/* 左：圖＋文字 */}
                <div style={{ flex: 1 }}>
                  <div className="pl-row">
                    {/* 小圖（button，方便無障礙） */}
                    <button
                      type="button"
                      className="thumb-btn"
                      onClick={() => setPreview({ url: imgSrc, name: p.name })}
                      aria-label={`放大查看商品圖片：${p.name}`}
                      disabled={!p.image_url}
                      title={p.image_url ? "點擊放大" : "無圖片"}
                    >
                      {p.image_url ? (
                        <img
                          src={imgSrc}
                          alt={`${p.name} 商品圖片`}
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            const ratio = img.naturalWidth / img.naturalHeight;

                            if (ratio < 0.6 || ratio > 1.8) {    /* ✅ 調縮圖比例參數 */
                              img.classList.remove("thumb--cover", "thumb--contain");
                              img.classList.add(ratio < 0.6 || ratio > 1.8 ? "thumb--cover" : "thumb--contain");
                            } else {
                              img.classList.add("thumb--contain");
                            }
                          }}
                        />
                      ) : (
                        <span>無圖</span>
                      )}
                    </button>

                    <div className="pl-text">
                      <div>
                        <Link to={`/products/${p.id}`} className="product-title">
                          {p.name}
                        </Link>
                      </div>
                      <div className="muted">{shortDesc(p.description, 80)}</div>
                      <div>價格：{p.price} 元</div>
                        <div className="stock-info muted" style={{ marginTop: 4 }}>
                          {p.stock_qty <= 0 ? (
                            <span className="stock-out">庫存 0（售完）</span>
                          ) : (
                            <>
                              <span className="stock">庫存 {p.stock_qty}</span>
                              <span className="picked">已選 {qty}</span>
                              <span className="remain">
                                剩餘 {Math.max(0, p.stock_qty - qty)}
                              </span>
                            </>
                          )}
                        </div>

                        {showLimit ? <p className="danger">此項商品已達庫存</p> : null}
                    </div>
                  </div>
                </div>

                {/* 右：數量＋加入購物車 */}
                <div style={{ minWidth: 260 }}>
                  <div className="qty" aria-label={`${p.name} 選擇件數`}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => dec(p)}
                      aria-label={`減少 ${p.name} 件數`}
                      disabled={qty <= 1}
                    >
                      —
                    </button>

                    <label className="sr-only" htmlFor={`qty-${p.id}`}>{p.name} 件數</label>
                    <input
                      id={`qty-${p.id}`}
                      className="qty-input"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={p.stock_qty > 0 ? p.stock_qty : undefined}
                      value={qty}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        const next = Number.isFinite(n) ? n : 1;
                        setQty(p.id, next, p.stock_qty ?? 0);
                      }}
                    />

                    <button
                      type="button"
                      className="btn"
                      onClick={() => inc(p)}
                      aria-label={`增加 ${p.name} 件數`}
                      disabled={soldOut || atLimit}
                    >
                      ＋
                    </button>
                  </div>

                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn"
                        disabled={soldOut}
                        onClick={() => {
                          if (soldOut) {
                            announce(`「${p.name}」已售完。`);
                            return;
                          }

                          add(
                            { productId: p.id, name: p.name, price: p.price, qty },
                            p.stock_qty ?? 0
                          );

                          announce(`已加入購物車：${p.name}，${qty} 件。`);
                          flashAdded(p.id, "✅ 商品已放入購物車");
                        }}
                        aria-label={`加入購物車：${p.name}，${qty} 件`}
                      >
                        {soldOut ? "售完" : "加入購物車"}
                      </button>

                      {addedMsgById[p.id] ? (
                        <p className="ok" role="status">{addedMsgById[p.id]}</p>
                      ) : null}
                    </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {products.length === 0 && !loading ? <p>目前沒有商品。</p> : null}

      {/* 圖片放大 modal */}
      {preview ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`商品圖片放大檢視：${preview.name}`}
          onClick={() => setPreview(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setPreview(null)}
              aria-label="關閉圖片預覽"
            >
              ❎
            </button>
            <img className="modal-img" src={preview.url} alt={`${preview.name} 商品圖片放大`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
