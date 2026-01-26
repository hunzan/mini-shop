import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "./api/client";
import type { Product } from "./types/product";
import { useCartStore } from "./store/cartStore";
import Admin from "./pages/Admin";
import ProductCard from "./components/ProductCard";

type OrderCreated = { order_id: number; total_amount: number };
type ShippingMethod = "post" | "cvs_711" | "cvs_family" | "courier";
type Category = { id: number; name: string; sort_order: number };
type ActiveCategory = "all" | "uncat" | number;

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function toAbsUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // 確保中間只有一個 /
  if (path.startsWith("/")) {
    return `${API_BASE}${path}`;
  }
  return `${API_BASE}/${path}`;
}

function buildFallbackShippingAddress(args: {
  shippingMethod: ShippingMethod;
  recipientName: string;
  recipientPhone: string;
  postAddress: string;
  cvsStoreId: string;
  cvsStoreName: string;
}) {
  const { shippingMethod, recipientName, recipientPhone, postAddress, cvsStoreId, cvsStoreName } = args;

  if (shippingMethod === "post") {
    return `郵寄｜收件人：${recipientName}｜電話：${recipientPhone}｜地址：${postAddress}`;
  }

  if (shippingMethod === "cvs_711" || shippingMethod === "cvs_family") {
    const brand = shippingMethod === "cvs_711" ? "7-11" : "family";
    const brandLabel = brand === "7-11" ? "7-11" : "全家";
    return `超商取貨｜收件人：${recipientName}｜電話：${recipientPhone}｜門市：${brandLabel} ${cvsStoreName}（${cvsStoreId}）`;
  }

  // courier
  return `快遞｜收件人：${recipientName}｜電話：${recipientPhone}`;
}

export default function App() {
  const [admin, setAdmin] = useState(false);

  // ✅ 先切換：後台模式就直接顯示 Admin
  if (admin) {
    return (
      <main style={{ padding: 16, fontFamily: "system-ui" }}>
        <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>老闆後台 🐒🍌</h1>
          <button onClick={() => setAdmin(false)}>回商店</button>
        </header>
        <Admin />
      </main>
    );
  }

  // ✅ 商店模式（把你原本 App 的內容搬進 Shop）
  return <Shop onGoAdmin={() => setAdmin(true)} />;
}

function methodLabel(m: ShippingMethod) {
  switch (m) {
    case "post": return "郵局宅配";
    case "cvs_711": return "超商 7-11";
    case "cvs_family": return "超商 全家";
    case "courier": return "快遞";
    default: return "未知方式";
  }
}

function Shop({ onGoAdmin }: { onGoAdmin: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string>("");
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<OrderCreated | null>(null);

  // ====== 表單 state ======
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");
  const [catAnnounce, setCatAnnounce] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("post");

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  const [query, setQuery] = useState("");
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const [imgPreview, setImgPreview] = useState<{ src: string; name: string } | null>(null);
  const lastImgBtnRef = useRef<HTMLButtonElement | null>(null);

  // ====== ⭐ 無障礙用 refs（放這裡）⭐ ======
  const fieldRefs = useRef({
    customerName: null as HTMLInputElement | null,
    customerEmail: null as HTMLInputElement | null,
    recipientName: null as HTMLInputElement | null,
    recipientPhone: null as HTMLInputElement | null,
    postAddress: null as HTMLTextAreaElement | null,
    cvsStoreId: null as HTMLInputElement | null,
    cvsStoreName: null as HTMLInputElement | null,
  });

  // ====== 其他 state ======
  const [postAddress, setPostAddress] = useState("");

  const [cvsStoreId, setCvsStoreId] = useState("");
  const [cvsStoreName, setCvsStoreName] = useState("");

  const cart = useCartStore();

  const productById = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  const total = useMemo(
    () => cart.items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [cart.items]
  );

    const methodOrder: ShippingMethod[] = ["post", "cvs_711", "cvs_family", "courier"];

    const availableShippingMethods = useMemo<ShippingMethod[]>(() => {
      // 空購物車：全部可選
      if (cart.items.length === 0) return methodOrder;

      // 用 products 當商品字典
      const byId = new Map(products.map((p) => [p.id, p]));

      // 每個商品的可寄方式集合
      const sets: Array<Set<ShippingMethod>> = [];

      for (const it of cart.items) {
        const prod = byId.get(it.productId);
        const options = prod?.shipping_options ?? [];
        sets.push(new Set(options.map((o) => o.method as ShippingMethod)));
      }

      // 若購物車內有商品找不到（理論上不該發生），直接回空
      if (sets.length === 0) return [];

      // 交集：全部商品都必須支援
      let inter = new Set<ShippingMethod>(sets[0]);
      for (let i = 1; i < sets.length; i++) {
        const next = new Set<ShippingMethod>();
        for (const m of inter) if (sets[i].has(m)) next.add(m);
        inter = next;
      }

      // 固定順序輸出
      return methodOrder.filter((m) => inter.has(m));
    }, [cart.items, products]);

    useEffect(() => {
      // 1) 沒購物車就不處理
      if (cart.items.length === 0) return;

      // 2) 若無共同寄送方式：丟錯誤（提前讓 UI 更明確）
      if (availableShippingMethods.length === 0) {
        setError("購物車內商品沒有共同可用的寄送方式，請調整購物車內容。");
        return;
      }

      // 3) 若目前選的方式不可用：自動切到第一個可用
      if (!availableShippingMethods.includes(shippingMethod)) {
        const next = availableShippingMethods[0];
        setShippingMethod(next);

        // 無障礙提示（你現在用 catAnnounce OK）
        setCatAnnounce("");
        setTimeout(() => setCatAnnounce(`已切換寄送方式為：${methodLabel(next)}`), 0);
      }
    }, [cart.items, availableShippingMethods, shippingMethod]);

  const baseProducts = products; // 後端已過濾 is_active，前端不再重複過濾
  const filteredProducts = useMemo(() => {
    const byCat =
      activeCategory === "all"
        ? baseProducts
        : activeCategory === "uncat"
        ? baseProducts.filter((p) => p.category_id == null)
        : baseProducts.filter((p) => p.category_id === activeCategory);

    const q = query.trim().toLowerCase();
    if (!q) return byCat;

    return byCat.filter((p) => {
      const hay = `${p.name} ${p.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [baseProducts, activeCategory, query]);

  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    Promise.all([
      apiGet<Product[]>("/products"),
      apiGet<Category[]>("/categories"),
    ])
      .then(([ps, cs]) => {
        if (!alive) return;
        setProducts(ps);
        setCategories(cs);
        setError("");
      })
      .catch((err) => {
        if (!alive) return;
        setError(String(err));
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (success && successRef.current) {
      successRef.current.focus();
    }
  }, [success]);

  function openPreview(src: string, name: string, btn: HTMLButtonElement) {
    lastImgBtnRef.current = btn;
    setImgPreview({ src, name });
  }

  function closePreview() {
    setImgPreview(null);
    // 關閉後把焦點還回去（鍵盤友善）
    setTimeout(() => lastImgBtnRef.current?.focus(), 0);
  }

  function switchCategory(next: ActiveCategory) {
    setActiveCategory(next);

    const label =
      next === "all"
        ? "所有商品"
        : next === "uncat"
        ? "未分類"
        : categories.find((c) => c.id === next)?.name ?? "分類";

    // 讓同一句也能重唸
    setCatAnnounce("");
    setTimeout(() => setCatAnnounce(`已切換到：${label}`), 0);

    setTimeout(() => {
      listHeadingRef.current?.focus();
    }, 0);
  }

  function validateCheckout(): string {
    if (cart.items.length === 0)
      return "購物車是空的，無法結帳。";
    if (availableShippingMethods.length === 0) {
      return "購物車內商品沒有共同可用的寄送方式，請調整購物車內容。";
    }
    if (!availableShippingMethods.includes(shippingMethod)) {
      return "目前選擇的寄送方式不適用於購物車內所有商品，請改選可用的寄送方式。";
    }
    if (!customerName.trim()) {
      fieldRefs.current.customerName?.focus();
      return "請填寫買家姓名/暱稱。";
    }
    if (!customerEmail.trim()) {
      fieldRefs.current.customerEmail?.focus();
      return "請填寫買家 Email。";
    }
    if (!recipientName.trim()) {
      fieldRefs.current.recipientName?.focus();
      return "請填寫收件人姓名。";
    }
    if (shippingMethod === "courier") {
      return "快遞目前尚未開放結帳，請改用郵寄或超商取貨。";
    }
    if (!recipientPhone.trim()) {
      fieldRefs.current.recipientPhone?.focus();
      return "請填寫收件人電話。";
    }
    if (shippingMethod === "post") {
      if (!postAddress.trim()) {
        fieldRefs.current.postAddress?.focus();
        return "請填寫郵寄地址。";
      }
    } else {
      if (!cvsStoreId.trim()) {
        fieldRefs.current.cvsStoreId?.focus();
        return "請填寫超商門市代碼。";
      }
      if (!cvsStoreName.trim()) {
        fieldRefs.current.cvsStoreName?.focus();
        return "請填寫超商門市名稱。";
      }
    }
    return "";
  }

    async function submitOrder() {
      setError("");
      setSuccess(null);

      const msg = validateCheckout();
      if (msg) {
        setError(msg);
        return;
      }

      setPlacing(true);
      try {
        // ✅ UI 與 API 統一：直接送後端同名欄位
        const apiShippingMethod = shippingMethod; // "post" | "cvs_711" | "cvs_family" | "courier"


        const shipping_address = buildFallbackShippingAddress({
          shippingMethod, // 注意：這裡仍可用 UI 版本讓字串更清楚
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          postAddress: postAddress.trim(),
          cvsStoreId: cvsStoreId.trim(),
          cvsStoreName: cvsStoreName.trim(),
        });

        const payload: any = {
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),

          // ✅ 直接送後端支援的值：post / cvs_711 / cvs_family / courier
          shipping_method: shippingMethod,
          shipping_address,

          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),

          items: cart.items.map((it) => ({
            product_id: it.productId,
            qty: it.qty,
          })),
        };

        // ✅ 依 shipping_method 決定欄位（不再有 cvs_brand）
        if (shippingMethod === "post") {
          payload.shipping_post_address = postAddress.trim();
          payload.cvs_store_id = null;
          payload.cvs_store_name = null;
        } else if (shippingMethod === "cvs_711" || shippingMethod === "cvs_family") {
          payload.shipping_post_address = null;
          payload.cvs_store_id = cvsStoreId.trim();
          payload.cvs_store_name = cvsStoreName.trim();
        } else if (shippingMethod === "courier") {
          // 你若有宅配地址欄位，就在這裡填；沒有就先全 null 也行（看後端驗證）
          payload.shipping_post_address = null;
          payload.cvs_store_id = null;
          payload.cvs_store_name = null;
        }

        const res = await apiPost<OrderCreated>("/orders", payload);
        setSuccess(res);
        cart.clear();
        } catch (e: any) {
          const raw = String(e?.message ?? e);

          // 1) 嘗試抓出 {"detail": "..."} 這種 JSON
          const m = raw.match(/\{.*\}$/s);
          if (m) {
            try {
              const obj = JSON.parse(m[0]);
              const detail = String(obj?.detail ?? "");

              // 2) 抓 Insufficient stock 的資訊
              const mm = detail.match(/product_id=(\d+), stock=(\d+), requested=(\d+)/);
              if (mm) {
                const productId = Number(mm[1]);
                const stock_qty = Number(mm[2]);
                const requested = Number(mm[3]);

                // 用 products 找商品名
                const prod = products.find((p) => p.id === productId);
                const name = prod?.name ?? `商品 #${productId}`;

                setError(`「${name}」庫存只有 ${stock_qty} 件，你選了 ${requested} 件，請把數量調整到 ${stock_qty} 件以內。`);
                return;
              }

              // 其他後端錯誤：直接顯示 detail（至少比整包 JSON 友善）
              if (detail) {
                setError(detail);
                return;
              }
            } catch {
              // JSON parse 失敗就走 fallback
            }
          }

          // fallback
          setError(raw);
        } finally {
          setPlacing(false);
        }
        }

  const btnBase: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    border: "2px solid #111",
    fontWeight: 700,
  };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>A-kâu Shop 🐒🍌</h1>
        <button onClick={onGoAdmin}>老闆後台</button>
      </header>

        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            style={{
              border: "2px solid #d00",
              padding: 12,
              margin: "12px 0",
              borderRadius: 8,
              background: "#fff5f5",
              lineHeight: 1.5,
            }}
          >
            <strong>😅</strong> {error}
          </div>
        )}

        {success && (
          <div
            ref={successRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            style={{
              border: "2px solid #0a0",
              padding: 12,
              margin: "12px 0",
              borderRadius: 8,
              background: "#f3fff3",
              lineHeight: 1.5,
            }}
          >
            <strong>成功：</strong> 下單成功！訂單編號：{success.order_id}，金額：{success.total_amount} 元
          </div>
        )}

      {/* ====== 你原本「商品列表 / 購物車 / 結帳表單」整段 JSX 放在這裡 ====== */}
      {/* 商品列表 */}
    <section aria-labelledby="product-title">
    <h2 id="product-title" ref={listHeadingRef} tabIndex={-1}>
      商品列表
    </h2>

      {/* 讓切換分類被朗讀 */}
      <div role="status" aria-live="polite" style={{ position: "absolute", left: -9999 }}>
        {catAnnounce}
      </div>

        <div style={{ margin: "12px 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>搜尋</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="輸入商品名稱或描述"
              style={{ padding: 8, minWidth: 240 }}
              inputMode="search"
            />
          </label>

          <button
            type="button"
            onClick={() => setQuery("")}
            disabled={!query.trim()}
          >
            清除搜尋
          </button>

          <div aria-live="polite" style={{ marginLeft: 8 }}>
            共 {filteredProducts.length} 件
          </div>
        </div>

      {/* 分類篩選列 */}
      <nav aria-label="商品分類" style={{ margin: "12px 0" }}>
        <div role="toolbar" aria-label="分類篩選" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => switchCategory("all")}
            aria-pressed={activeCategory === "all"}
            style={activeCategory === "all" ? btnActive : btnBase}
          >
            所有商品
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => switchCategory(cat.id)}
              aria-pressed={activeCategory === cat.id}
              style={activeCategory === cat.id ? btnActive : btnBase}
            >
              {cat.name}
            </button>
          ))}

          <button
            type="button"
            onClick={() => switchCategory("uncat")}
            aria-pressed={activeCategory === "uncat"}
            style={activeCategory === "uncat" ? btnActive : btnBase}
          >
            未分類
          </button>
        </div>
      </nav>

        {/* 篩選後清單 */}
        {filteredProducts.length === 0 ? (
          <p>這個分類目前沒有商品。</p>
        ) : (
        <ul style={{ padding: 0, listStyle: "none" }}>
          {filteredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              toAbsUrl={toAbsUrl}
              openPreview={openPreview}
              methodLabel={methodLabel}
            />
          ))}
        </ul>
        )}

      {imgPreview && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${imgPreview.name} 圖片大圖`}
        onKeyDown={(e) => {
          if (e.key === "Escape") closePreview();
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 9999,
        }}
        onClick={() => closePreview()}
      >
        {/* 內容區：阻擋點擊冒泡（不然點圖也會關） */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 12,
            maxWidth: 900,
            width: "100%",
            padding: 12,
          }}
        >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <strong>{imgPreview.name}</strong>

          <button
            type="button"
            onClick={closePreview}
            aria-label="關閉圖片預覽"
            title="關閉（Esc）"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 24,
              lineHeight: "38px",
            }}
            autoFocus
          >
            ❌
          </button>
        </div>

          <div style={{ marginTop: 12 }}>
            <img
              src={imgPreview.src}
              alt={`${imgPreview.name} 商品圖片大圖`}
              style={{ width: "100%", height: "auto", borderRadius: 12, border: "1px solid #ddd" }}
            />
          </div>
        </div>
      </div>
    )}
    </section>

      <hr />

      {/* 購物車 */}
      <section aria-labelledby="cart-title">
        <h2 id="cart-title">購物車</h2>
        {cart.items.length === 0 ? (
          <p>目前購物車是空的。</p>
        ) : (
          <>
        <ul>
          {cart.items.map((item) => {
            const prod = productById.get(item.productId);
            const maxStock = prod?.stock_qty; // number | undefined
            const canInc = prod
              ? (maxStock == null ? true : item.qty < maxStock)
              : false;

            return (
              <li key={item.productId}>
                {item.name}（{item.price} 元）

                <button onClick={() => cart.dec(item.productId)} aria-label="減少數量">
                  −
                </button>

                <span style={{ margin: "0 8px" }}>{item.qty}</span>

                <button
                  onClick={() => cart.inc(item.productId, maxStock ?? undefined)}
                  aria-label="增加數量"
                  disabled={!canInc}
                >
                  ＋
                </button>

                {!prod && (
                  <span
                    role="status"
                    aria-live="polite"
                    style={{ marginLeft: 8, fontSize: 12 }}
                  >
                    商品資料載入中…
                  </span>
                )}

                {maxStock != null && (
                  <span style={{ marginLeft: 8, fontSize: 12 }}>
                    庫存 {maxStock}
                  </span>
                )}

                <span style={{ marginLeft: 8 }}>
                  小計：{item.price * item.qty} 元
                </span>

                {!canInc && (
                  <span role="status" aria-live="polite" style={{ marginLeft: 8, fontSize: 12 }}>
                    已達庫存上限
                  </span>
                )}
              </li>
            );
          })}
        </ul>
            <p>
              <strong>合計：</strong> {total} 元
            </p>
          </>
        )}
      </section>

      <hr />

      {/* 結帳 */}
      <section aria-labelledby="checkout-title">
        <h2 id="checkout-title">結帳</h2>

        <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
          <fieldset style={{ border: "1px solid #ccc", padding: 12 }}>
            <legend>買家資料</legend>

            <label>
              買家姓名/暱稱
              <input
                ref={(el) => (fieldRefs.current.customerName = el)}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ display: "block", width: "100%", padding: 8 }}
              />
            </label>

            <label>
              買家 Email
              <input
                ref={(el) => (fieldRefs.current.customerEmail = el)}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{ display: "block", width: "100%", padding: 8 }}
                inputMode="email"
              />
            </label>
          </fieldset>

          {cart.items.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong>可用寄送方式：</strong>
              {availableShippingMethods.length === 0
                ? "（無共同方式）"
                : availableShippingMethods.map(methodLabel).join("、")}
            </div>
          )}

        <fieldset style={{ border: "1px solid #ccc", padding: 12 }}>
          <legend>物流方式</legend>

          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="radio"
              name="shipping"
              value="post"
              checked={shippingMethod === "post"}
              onChange={() => setShippingMethod("post")}
              disabled={!availableShippingMethods.includes("post")}
            />{" "}
            郵寄
          </label>

          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="radio"
              name="shipping"
              value="cvs_711"
              checked={shippingMethod === "cvs_711"}
              onChange={() => setShippingMethod("cvs_711")}
              disabled={!availableShippingMethods.includes("cvs_711")}
            />{" "}
            超商取貨（7-11）
          </label>

          <label style={{ display: "block" }}>
            <input
              type="radio"
              name="shipping"
              value="cvs_family"
              checked={shippingMethod === "cvs_family"}
              onChange={() => setShippingMethod("cvs_family")}
              disabled={!availableShippingMethods.includes("cvs_family")}
            />{" "}
            超商取貨（全家）
          </label>

          {/* 你 courier 還沒做完整就先不要開 radio，避免使用者選到 */}
          {/*
          <label style={{ display: "block", marginTop: 6 }}>
            <input
              type="radio"
              name="shipping"
              value="courier"
              checked={shippingMethod === "courier"}
              onChange={() => setShippingMethod("courier")}
              disabled={!availableShippingMethods.includes("courier")}
            />{" "}
            快遞（限區域）
          </label>
          */}
        </fieldset>

        <fieldset style={{ border: "1px solid #ccc", padding: 12 }}>
          <legend>收件/取貨資訊</legend>

          <label>
            收件人姓名
            <input
              ref={(el) => (fieldRefs.current.recipientName = el)}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8 }}
            />
          </label>

          <label>
            收件人電話
            <input
              ref={(el) => (fieldRefs.current.recipientPhone = el)}
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8 }}
              inputMode="tel"
            />
          </label>

          {shippingMethod === "post" && (
            <label>
              郵寄地址
              <textarea
                ref={(el) => (fieldRefs.current.postAddress = el)}
                value={postAddress}
                onChange={(e) => setPostAddress(e.target.value)}
                style={{ display: "block", width: "100%", padding: 8, minHeight: 80 }}
              />
            </label>
          )}

          {(shippingMethod === "cvs_711" || shippingMethod === "cvs_family") && (
            <>
              <div style={{ marginTop: 8 }}>
                <strong>超商品牌：</strong>
                {shippingMethod === "cvs_711" ? "7-11" : "全家"}
              </div>

              <label>
                門市代碼
                <input
                  ref={(el) => (fieldRefs.current.cvsStoreId = el)}
                  value={cvsStoreId}
                  onChange={(e) => setCvsStoreId(e.target.value)}
                  style={{ display: "block", width: "100%", padding: 8 }}
                />
              </label>

              <label>
                門市名稱
                <input
                  ref={(el) => (fieldRefs.current.cvsStoreName = el)}
                  value={cvsStoreName}
                  onChange={(e) => setCvsStoreName(e.target.value)}
                  style={{ display: "block", width: "100%", padding: 8 }}
                />
              </label>
            </>
          )}

          {shippingMethod === "courier" && (
            <div style={{ marginTop: 8 }}>
              <strong>快遞：</strong>此方式目前未實作收件地址欄位（之後再加）
            </div>
          )}
        </fieldset>

        <button
          onClick={submitOrder}
          disabled={placing || cart.items.length === 0}
          style={{ padding: 12 }}
        >
          {placing ? "送出中..." : "送出訂單"}
        </button>

        </div>
      </section>
    </main>
  );
}
