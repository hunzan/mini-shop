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

export default function ProductCard({ product, toAbsUrl, openPreview }: Props) {
  const cart = useCartStore();

  // 若你 Product 型別保證 stock_qty 一定是 number，可簡化；這裡先保守寫
  const stockQty = product.stock_qty;
  const hasLimitedStock = stockQty != null;

  const [qty, setQty] = useState(1);

  const stock = (product.stock_qty ?? (product as any).stock ?? 0) as number;
  const soldOut = stock <= 0;

  const max = hasLimitedStock ? Math.max(0, Number(stockQty)) : 999;
  const upper = Math.max(1, max);

  const canAdd = !hasLimitedStock || max > 0;

  // ✅ 本檔案自帶 announce（避免你引用外部 LiveRegion 失敗）
  const announce = (msg: string) => {
    // 最簡單先用 console；你有 LiveRegion 的話之後再改成事件/狀態
    console.log("[a11y]", msg);
  };

  // 商品切換時重置數量
  useEffect(() => {
    setQty(1);
  }, [product.id]);

  // 庫存/上限變化時調整數量
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, upper)));
  }, [upper, product.id]);

  return (
    <li
      style={{
        marginBottom: 16,
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 12,
      }}
    >
      {/* 商品名稱 + 價格 */}
      <div className="pc-title-row">
        <strong className="pc-title">{product.name}</strong>
        <span className="pc-price">（{product.price} 元）</span>
      </div>

      {/* 商品主圖（點圖放大） */}
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
      {product.description ? <div style={{ marginTop: 6 }}>{product.description}</div> : null}

      {/* 數量選擇（統一用 QuantityPicker） */}
      <div style={{ marginTop: 10 }}>
        <QuantityPicker
          qty={qty}
          setQty={setQty}
          max={stock > 0 ? stock : undefined}
          disabled={soldOut}
          onHitMax={() => announce("此項商品已達庫存")}
        />
      </div>

      {/* 加入購物車 */}
      <div style={{ marginTop: 10 }}>
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
      </div>

      {max === 0 ? <div style={{ marginTop: 6 }}>此商品目前缺貨</div> : null}
    </li>
  );
}
