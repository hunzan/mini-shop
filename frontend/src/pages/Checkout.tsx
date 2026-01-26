import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import { useCartStore } from "../store/cartStore";
import type { Product, ShippingMethod } from "../types/product";

function announce(msg: string) {
  (window as any).__liveRegionAnnounce?.(msg);
}

const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  post: "郵寄",
  cvs_711: "7-11 取貨",
  cvs_family: "全家取貨",
  courier: "宅配",
};

const SHIPPING_METHODS: ShippingMethod[] = [
  "post",
  "courier",
  "cvs_711",
  "cvs_family",
];

type EnrichedItem = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  stock_qty?: number;
  product?: Product;
};

export default function Checkout() {
  const nav = useNavigate();

  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 送貨/取貨資訊（MVP）
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("post");

  // 郵寄/宅配地址（先用一個欄位）
  const [address, setAddress] = useState("");

  // 超商門市資訊
  const CITY_OPTIONS = [
    "台北市","新北市","基隆市","桃園市","新竹市","新竹縣",
    "苗栗縣","台中市","彰化縣","南投縣","雲林縣",
    "嘉義市","嘉義縣","台南市","高雄市","屏東縣",
    "宜蘭縣","花蓮縣","台東縣",
  ] as const;

  const [cvsCity, setCvsCity] = useState<string>("");
  const [cvsDistrict, setCvsDistrict] = useState<string>("");
  const [cvsStoreName, setCvsStoreName] = useState<string>("");

  // 取得商品資料（為了：確認每個商品支援哪些運送方式 + 計算運費 + 確認庫存）
  const [enriched, setEnriched] = useState<EnrichedItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadProductsForCart() {
      if (!items.length) {
        setEnriched([]);
        return;
      }
      try {
        setErr("");
        // 逐一抓商品（MVP；未來可做 batch endpoint）
        const results: EnrichedItem[] = [];
        for (const it of items) {
          const p = await apiGet<Product>(`/products/${it.productId}`);
          results.push({ ...it, product: p, stock_qty: it.stock_qty ?? 0 });
        }
        if (!mounted) return;
        setEnriched(results);
      } catch (e: any) {
        const msg = e?.message || "載入商品資料失敗";
        if (!mounted) return;
        setErr(msg);
        announce(msg);
      }
    }

    loadProductsForCart();
    return () => {
      mounted = false;
    };
  }, [items]);

  const subtotal = useMemo(() => {
    return (items ?? []).reduce((sum, it) => sum + (it.price ?? 0) * (it.qty ?? 0), 0);
  }, [items]);

  // 運送方式是否每個商品都支援
  const shippingSupported = useMemo(() => {
    if (!enriched.length) return true;
    for (const it of enriched) {
      const opts = it.product?.shipping_options ?? [];
      if (!opts.some((o) => o.method === shippingMethod)) return false;
    }
    return true;
  }, [enriched, shippingMethod]);

  // 運費計算（建議規則：同一張訂單運費取「各商品該運送方式運費的最大值」）
  const shippingFee = useMemo(() => {
    if (!enriched.length) return 0;
    let fee = 0;
    for (const it of enriched) {
      const opts = it.product?.shipping_options ?? [];
      const opt = opts.find((o) => o.method === shippingMethod);
      if (!opt) return 0; // 不支援就先回 0（並且 shippingSupported 會變 false）
      fee = Math.max(fee, opt.fee ?? 0);
    }
    return fee;
  }, [enriched, shippingMethod]);

  const total = subtotal + shippingFee;

  const canSubmit = useMemo(() => {
    if (!items.length) return false;
    if (!buyerName.trim()) return false;
    if (!buyerEmail.trim()) return false;
    if (!buyerPhone.trim()) return false;
    if (!shippingSupported) return false;

    // 地址/門市必填（依運送方式）
    if (shippingMethod === "post" || shippingMethod === "courier") {
      if (!address.trim()) return false;
    } else {
      if (!cvsCity.trim()) return false;
      if (!cvsDistrict.trim()) return false;
      if (!cvsStoreName.trim()) return false;
    }

    // 庫存檢查（有拿到 product.stock 才檢）
    for (const it of enriched) {
      const stock = (it.product as any)?.stock_qty;
      if (typeof stock === "number" && stock >= 0 && it.qty > stock) return false;
    }

    return true;
    }, [
      items,
      buyerName,
      buyerEmail,
      buyerPhone,
      shippingSupported,
      shippingMethod,
      address,
      cvsCity,
      cvsDistrict,
      cvsStoreName,
      enriched,
    ]);

  if (!items.length) {
    return (
      <div className="card">
        <h1>結帳</h1>
        <p>購物車目前是空的。</p>
        <p><Link to="/products">去逛商品</Link></p>
      </div>
    );
  }

     async function submit() {
      try {
        setLoading(true);
        setErr("");

        const isPost = shippingMethod === "post" || shippingMethod === "courier";
        const isCvs711 = shippingMethod === "cvs_711";
        const isCvsFamily = shippingMethod === "cvs_family";
        const isCvs = isCvs711 || isCvsFamily;

        // ✅ 共用必填
        if (!buyerName.trim()) throw new Error("請填寫姓名。");
        if (!buyerEmail.trim()) throw new Error("請填寫 Email。");
        if (!buyerPhone.trim()) throw new Error("請填寫聯絡電話。");

        // ✅ 物流驗證
        if (isPost) {
          if (!address.trim()) throw new Error("請填寫收件地址。");
        } else if (isCvs) {
          if (!cvsCity.trim()) throw new Error("請選擇取貨縣市。");
          if (!cvsDistrict.trim()) throw new Error("請填寫行政區。");
          if (!cvsStoreName.trim()) throw new Error("請填寫取貨門市名稱。");
        } else {
          throw new Error("運送方式不正確，請重新選擇。");
        }

        const payload: any = {
          customer_name: buyerName.trim(),
          customer_email: buyerEmail.trim(),
          customer_phone: buyerPhone.trim(), // ✅ 一定要送

          shipping_method: shippingMethod,   // ✅ 只能是 post/courier/cvs_711/cvs_family
          shipping_address: isPost
            ? address.trim()
            : `${cvsCity.trim()}${cvsDistrict.trim()}`,

          recipient_name: buyerName.trim(),
          recipient_phone: buyerPhone.trim(),

          items: items.map((it) => ({ product_id: it.productId, qty: it.qty })),
        };

        if (isPost) {
          payload.shipping_post_address = address.trim();
        } else {
          payload.cvs_brand = isCvs711 ? "7-11" : "全家";
          payload.cvs_store_name = cvsStoreName.trim(); // ✅ 建議純門市名
          // payload.cvs_store_id = "" // 有的話再加
        }

        const created = await apiPost<any>("/orders", payload);

        clear();
        announce("訂單建立成功");

        const orderId = created?.order_id ?? created?.id ?? "";

        const shipLabel = isPost
          ? shippingMethod === "courier" ? "宅配" : "郵寄"
          : `超商取貨（${shippingMethod === "cvs_711" ? "7-11" : "全家"}）`;

        const shipAddr = isPost
          ? address.trim()
          : `${cvsCity}${cvsDistrict}｜${cvsStoreName.trim()}`;

        nav(`/checkout/result${orderId ? `?id=${encodeURIComponent(orderId)}` : ""}`, {
          state: {
            order: created,
            buyerEmail: buyerEmail.trim(),
            buyerName: buyerName.trim(),
            shippingLabel: shipLabel,
            shippingAddress: shipAddr,
          },
        });
      } catch (e: any) {
        const msg = e?.message || "建立訂單失敗";
        setErr(msg);
        announce(msg);
      } finally {
        setLoading(false);
      }
    }

  return (
    <div className="card">
      <h1 className="checkout-title">結帳</h1>

      {err ? <p className="danger">⚠️ {err}</p> : null}

      {/* 訂單摘要 */}
      <h2>訂單內容</h2>
      <ul aria-label="購物明細">
        {items.map((it) => (
          <li key={it.productId}>
            {it.name} × {it.qty}（小計 {it.price * it.qty}）
          </li>
        ))}
      </ul>

      <p>商品小計：{subtotal} 元</p>
      <p>
        運費：{shippingFee} 元（{SHIPPING_METHOD_LABEL[shippingMethod]}）
      </p>
      <p><strong>總計：{total} 元</strong></p>

        {/* 買家資料 */}
        <h2>買家資料</h2>
        <div className="form">
          <label>
            姓名（必填）
            <input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              required
            />
          </label>

          <label>
            Email（必填）
            <input
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              inputMode="email"
              required
            />
          </label>

          <label>
            電話
            <input
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </label>
        </div>

      {/* 運送方式 */}
        <h2>運送方式</h2>
        <fieldset>
          <legend className="sr-only">選擇運送方式</legend>

          {SHIPPING_METHODS.map((m) => (
            <label key={m} style={{ display: "block", marginBottom: 6 }}>
              <input
                type="radio"
                name="shipping"
                value={m}
                checked={shippingMethod === m}
                onChange={() => setShippingMethod(m)}
              />{" "}
              {SHIPPING_METHOD_LABEL[m]}
            </label>
          ))}

          {!shippingSupported ? (
            <p className="danger">⚠️ 目前選的運送方式，部分商品不支援，請改選。</p>
          ) : null}
        </fieldset>


        {/* 地址/門市 */}
        {(shippingMethod === "post" || shippingMethod === "courier") ? (
          <div className="form" style={{ marginTop: 10 }}>
            <label>
              收件地址（必填）
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="form" style={{ marginTop: 10 }}>
            <label>
              取貨縣市（必填）
              <select
                value={cvsCity}
                onChange={(e) => {
                  setCvsCity(e.target.value);
                  setCvsDistrict(""); // ✅ 換縣市就清空行政區
                }}
              >
                <option value="">請選擇縣市</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label>
              行政區（必填）
              <input
                value={cvsDistrict}
                onChange={(e) => setCvsDistrict(e.target.value)}
                placeholder="例：三重區 / 中山區 / 板橋區"
              />
            </label>

            <label>
              取貨門市名稱（必填）
              <input
                value={cvsStoreName}
                onChange={(e) => setCvsStoreName(e.target.value)}
                placeholder="例：台北車站門市（不用填完整地址）"
              />
            </label>

            {/* ✅ 讓買家自己確認一次（防呆感很重要） */}
            {(cvsCity || cvsDistrict || cvsStoreName) ? (
              <p className="muted" style={{ marginTop: 8 }}>
                你填的門市：<strong>{`${cvsCity} ${cvsDistrict}｜${cvsStoreName}`.trim()}</strong>
              </p>
            ) : null}
          </div>
        )}

      {/* 庫存提醒（有拿到 stock 才顯示） */}
      {enriched.some((it) => typeof (it.product as any)?.stock === "number" && it.qty > (it.product as any).stock) ? (
        <p className="danger">⚠️ 其中有商品購買數量超過庫存，請回購物車調整。</p>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={() => nav("/cart")}>
          回購物車
        </button>

        <button className="btn" type="button" disabled={!canSubmit || loading} onClick={submit}>
          {loading ? "送出中…" : "送出訂單"}
        </button>
      </div>
    </div>
  );
}
