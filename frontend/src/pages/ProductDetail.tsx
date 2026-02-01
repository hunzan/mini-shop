import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { API_BASE } from "../api/base";
import type { Product } from "../types/product";
import { useCartStore } from "../store/cartStore";
import DOMPurify from "dompurify";


const SHIPPING_METHOD_LABEL: Record<string, string> = {
  post: "郵寄",
  cvs_711: "7-11 取貨",
  cvs_family: "全家取貨",
  courier: "宅配",
};

function announce(msg: string) {
  (window as any).__liveRegionAnnounce?.(msg);
}

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);
  const nav = useNavigate();

  const add = useCartStore((s) => s.add);

  const [p, setP] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErr("");
        const data = await apiGet<Product>(`/products/${productId}`);
        if (!mounted) return;
        setP(data);
        setQty(1);
      } catch (e: any) {
        const msg = e?.message || "載入商品失敗";
        setErr(msg);
        announce(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (Number.isFinite(productId) && productId > 0) load();
    else setErr("商品 ID 不正確");

    return () => {
      mounted = false;
    };
  }, [productId]);

  const safeHtml = useMemo(() => {
    // ✅ 長敘述優先；沒填就用短敘述補
    const raw = (p?.description_text?.trim() ? p.description_text : p?.description) ?? "";

    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
    });
  }, [p?.description_text, p?.description]);

  const imgSrc = useMemo(() => {
    if (!p?.image_url) return "";
    return p.image_url.startsWith("http") ? p.image_url : `${API_BASE}${p.image_url}`;
  }, [p?.image_url]);

  if (!p) return <div className="card"><p>載入中…</p></div>;
  if (err) return <div className="card"><p className="danger">⚠️ {err}</p></div>;
  if (!p) return null;

  const stock = p.stock_qty ?? 0;
  const soldOut = stock <= 0;

  const hasLong = !!p?.description_text?.trim();

  const clamp = (n: number) => {
    if (!Number.isFinite(n)) return 1;
    if (stock > 0) return Math.max(1, Math.min(n, stock));
    return Math.max(1, n);
  };

  return (
    <div className="card">
      <p className="muted">
        <Link to="/products">⬅️回商品列表</Link>
      </p>

      <h1 className="product-title">{p.name}</h1>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 360, maxWidth: "100%" }}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={`${p.name} 商品圖片`}
              style={{
                width: "100%",
                height: 320,
                objectFit: "contain",
                background: "#f6f6f6",
                borderRadius: 12,
                border: "1px solid var(--border)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 320,
                background: "#f6f6f6",
                borderRadius: 12,
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              無圖片
            </div>
          )}
        </div>

        <div className="product-meta">
          <p className="price">
            價格：<strong>{p.price}</strong> 元
          </p>

          <div className="stock-info muted">
            {stock <= 0 ? (
              <span className="stock-out">庫存 0 件（售完）</span>
            ) : (
              <>
                <span className="stock">
                  庫存 <strong>{stock}</strong> 件
                </span>
                <span className="picked">
                  已選 <strong>{qty}</strong> 件
                </span>
                <span className="remain">
                  剩餘 <strong>{Math.max(0, stock - qty)}</strong> 件
                </span>
              </>
            )}
          </div>

          {stock > 0 && qty >= stock ? <p className="danger">此項商品已達庫存上限</p> : null}

          <div className="qty" aria-label="選擇件數">
            <button
              type="button"
              className="btn"
              onClick={() => setQty((q) => clamp(q - 1))}
              disabled={qty <= 1}
              aria-label="減少件數"
            >
              —
            </button>

            <label className="sr-only" htmlFor="qty">件數</label>
            <input
              id="qty"
              className="qty-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={stock > 0 ? stock : undefined}
              value={qty}
              onChange={(e) => {
                const n = Number(e.target.value);
                setQty(clamp(Number.isFinite(n) ? n : 1));
              }}
            />

            <button
              type="button"
              className="btn"
              onClick={() => {
                if (stock > 0 && qty >= stock) {
                  announce("此項商品已達庫存");
                  return;
                }
                setQty((q) => clamp(q + 1));
              }}
              disabled={soldOut || (stock > 0 && qty >= stock)}
              aria-label="增加件數"
            >
              ＋
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              disabled={soldOut}
              onClick={() => {
                if (soldOut) {
                  announce("此商品已售完。");
                  return;
                }
                add({ productId: p.id, name: p.name, price: p.price, qty }, stock);
                announce(`已加入購物車：${p.name}，${qty} 件。`);

                setAddedMsg("✅ 商品已放入購物車");
                window.setTimeout(() => setAddedMsg(""), 2000);
              }}
            >
              {soldOut ? "售完" : "加入購物車"}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => nav("/cart")}
            >
              去購物車
            </button>
          </div>

          {addedMsg ? <p className="ok" role="status">{addedMsg}</p> : null}

          <h2 style={{ marginTop: 18 }}>運送方式</h2>
          {p.shipping_options?.length ? (
            <ul>
              {p.shipping_options.map((s, idx) => (
                <li key={idx}>
                  {SHIPPING_METHOD_LABEL[s.method] ?? s.method}（運費 {s.fee} 元）
                  {s.region_note ? `｜${s.region_note}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">未設定運送選項</p>
          )}
        </div>
      </div>

      {/* ✅ 下半部：商品說明（放在 flex 外，版面才不會亂） */}
      <h2 style={{ marginTop: 18 }}>{hasLong ? "商品說明" : "商品簡介"}</h2>
      <div className="product-desc" dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
}
