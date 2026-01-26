import { useEffect, useState } from "react";
import type { Product } from "../types/product";
import { useCartStore } from "../store/cartStore";
import QuantityPicker from "./QuantityPicker";

type Props = {
  product: Product;
  toAbsUrl: (path?: string) => string;
  openPreview: (src: string, name: string, btn: HTMLButtonElement) => void;
  methodLabel: (m: "post" | "cvs_711" | "cvs_family" | "courier") => string;
};

export default function ProductCard({ product, toAbsUrl, openPreview, methodLabel }: Props) {
  const cart = useCartStore();

  const stockQty = product.stock_qty;                 // number（建議 Product 型別就是 number）
  const hasLimitedStock = stockQty != null;           // 若未來 stock_qty 可能為 null/undefined 才需要

  const [qty, setQty] = useState(1);
  const stock = product.stock_qty ?? product.stock ?? 0; // 看你現在欄位用 stock_qty
  const soldOut = stock <= 0;

  const max = hasLimitedStock ? Math.max(0, stockQty) : 999; // 無限庫存：給 UI 上限
  const upper = Math.max(1, max);

  const canAdd = !hasLimitedStock || max > 0;         // 有庫存才可加；無限庫存也可加
  const canInc = canAdd && qty < upper;
  const canDec = qty > 1;

  function inc() {
    setQty((q) => Math.min(upper, q + 1));
  }

  function dec() {
    setQty((q) => Math.max(1, q - 1));
  }

  // 商品切換時重置數量
  useEffect(() => {
    setQty(1);
  }, [product.id]);

  // 庫存變化時調整數量
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, upper)));
  }, [product.id, upper]);

    <div className="pc-title-row">
      <strong className="pc-title">{product.name}</strong>
      <span className="pc-price">（{product.price} 元）</span>
    </div>

        {/* ✅ 商品主圖（點圖放大） */}
        <div style={{ marginTop: 8, marginBottom: 8, maxWidth: 360 }}>
          {product.image_url ? (
            <button
              type="button"
              onClick={(e) => openPreview(toAbsUrl(product.image_url), product.name, e.currentTarget)}
              style={{
                display: "block",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
              aria-label={`查看 ${product.name} 圖片大圖`}
            >
              <img
                src={toAbsUrl(product.image_url)}
                alt={`${product.name} 商品圖片`}
                loading="lazy"
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.png";
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12 }}>點圖可放大</div>
            </button>
          ) : (
            <div
              role="img"
              aria-label={`${product.name} 尚無商品圖片`}
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: 12,
                border: "1px dashed #bbb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              尚無圖片
            </div>
          )}
        </div>

      {/* 商品描述 */}
      <div style={{ marginTop: 6 }}>{product.description}</div>

      {/* 數量選擇 */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
      >
        <button
          type="button"
          onClick={dec}
          disabled={!canDec}
          aria-label={`減少 ${product.name} 數量`}
        >
          —
        </button>

        <input
          type="number"
          min={1}
          max={Math.max(1, max)}
          value={qty}
          onChange={(e) => {
            const n = Number(e.target.value);
            const upper = Math.max(1, max);
            const next = Math.max(1, Math.min(Number.isFinite(n) ? n : 1, upper));
            setQty(next);
          }}
          aria-label={`${product.name} 購買數量`}
          style={{ width: 64, textAlign: "center" }}
        />

        <button
          type="button"
          onClick={inc}
          disabled={!canInc}
          aria-label={`增加 ${product.name} 數量`}
        >
          ＋
        </button>
      </div>

        <QuantityPicker
          qty={qty}
          setQty={setQty}
          max={stock > 0 ? stock : undefined}
          disabled={soldOut}
          onHitMax={() => announce("此項商品已達庫存")}
        />

      {/* 加入購物車 */}
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => {
          cart.add(
            { productId: product.id, name: product.name, price: product.price, qty },
            product.stock_qty
          );
          setQty(1);
        }}
      >
        加入購物車
      </button>

      {max === 0 && <div style={{ marginTop: 6 }}>此商品目前缺貨</div>}

    </li>
  );
}
