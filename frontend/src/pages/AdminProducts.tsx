import { useEffect, useState } from "react";
import { adminGet, adminPost, adminPatchJson, adminDelete, adminUploadFile } from "../api/adminClient";
import { Navigate, useLocation } from "react-router-dom";

type ShippingMethod = "post" | "cvs_711" | "cvs_family" | "courier";

type ShippingOption = {
  id?: number; // ✅ 編輯/建立 payload 不需要 id，避免卡型別
  method: ShippingMethod;
  fee: number;
  region_note: string;
};

type AdminProduct = {
  id: number;
  name: string;
  category_id: number | null;
  stock_qty: number;
  price: number;
  description: string;
  description_text: string;
  image_url: string;
  is_active: boolean;
  shipping_options: ShippingOption[];
};

type Category = { id: number; name: string; sort_order: number };

function methodLabel(m: ShippingMethod) {
  switch (m) {
    case "post":
      return "郵寄";
    case "cvs_711":
      return "7-11 取貨";
    case "cvs_family":
      return "全家取貨";
    case "courier":
      return "宅配";
  }
}

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

function toAbsUrl(u: string) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return `${API_BASE}/${u}`;
}

  const STORAGE_KEY = "admin_unlocked_v1";

// ====== 1️⃣ state 區 ======
export default function AdminProducts() {
  // ✅ hooks 一律放在 component 內
  const loc = useLocation();
  const unlocked = sessionStorage.getItem(STORAGE_KEY) === "1";

  if (!unlocked) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/admin-gate?next=${next}`} replace />;
  }
  const [editingId, setEditingId] = useState<number | null>(null);

  const [list, setList] = useState<AdminProduct[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  // 表單 state（新增 + 編輯共用）
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | "uncat">("uncat");
  const [stockQty, setStockQty] = useState(0);
  const [price, setPrice] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [ok, setOk] = useState("");

  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uploadErr, setUploadErr] = useState("");
  const [previewMap, setPreviewMap] = useState<Record<number, string>>({});

  // ✅ 編輯模式用（直接拿後端的 shipping_options）
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  // ====== 運送方式（新增表單用：用勾選組 payload） ======
  const [shipPostOn, setShipPostOn] = useState(true);
  const [shipPostFee, setShipPostFee] = useState(60);

  const [ship711On, setShip711On] = useState(true);
  const [ship711Fee, setShip711Fee] = useState(45);

  const [shipFamilyOn, setShipFamilyOn] = useState(false);
  const [shipFamilyFee, setShipFamilyFee] = useState(45);

  const [shipCourierOn, setShipCourierOn] = useState(false);
  const [shipCourierFee, setShipCourierFee] = useState(120);
  const [shipCourierRegion, setShipCourierRegion] = useState("限雙北");

  // ====== 2️⃣ helper / API functions 區 ======
  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [plist, clist] = await Promise.all([
        adminGet<AdminProduct[]>("/admin/products"),
        adminGet<Category[]>("/categories"),
      ]);
      setList(plist);
      setCategories(clist);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setCategoryId("uncat");
    setStockQty(0);
    setPrice(0);
    setIsActive(true);
    setImageUrl("");
    setDescription("");
    setDescriptionText("");

    setShippingOptions([]); // ✅ 編輯模式也要清掉

    setShipPostOn(true);
    setShipPostFee(60);
    setShip711On(true);
    setShip711Fee(45);
    setShipFamilyOn(false);
    setShipFamilyFee(45);
    setShipCourierOn(false);
    setShipCourierFee(120);
    setShipCourierRegion("限雙北");
  }

    async function submitCreate() {
      if (creating) return;
      setErr("");

      // ===== 基本驗證 =====
      if (!name.trim()) {
        setErr("請填寫商品名稱。");
        return;
      }
      if (price < 0) {
        setErr("售價不可小於 0。");
        return;
      }
      if (stockQty < 0) {
        setErr("庫存不可小於 0。");
        return;
      }

      // ===== shipping_options 來源切換 =====
      // ✅ 新增模式：用 checkbox 組合
      // ✅ 編輯模式：用你 startEdit() 已載入的 shippingOptions state
      let shipping_options: Array<{ method: ShippingOption["method"]; fee: number; region_note: string }> = [];

      if (editingId !== null) {
        // 編輯：用 shippingOptions
        // ※ 若你 shippingOptions 的型別是 ShippingOption[]（含 id），就只取需要欄位
        shipping_options =
          (shippingOptions ?? []).map((o: any) => ({
            method: o.method,
            fee: Number(o.fee ?? 0),
            region_note: (o.region_note ?? "").trim(),
          }));
      } else {
        // 新增：用 checkbox
        if (shipPostOn) shipping_options.push({ method: "post", fee: shipPostFee, region_note: "" });
        if (ship711On) shipping_options.push({ method: "cvs_711", fee: ship711Fee, region_note: "" });
        if (shipFamilyOn) shipping_options.push({ method: "cvs_family", fee: shipFamilyFee, region_note: "" });
        if (shipCourierOn) shipping_options.push({ method: "courier", fee: shipCourierFee, region_note: shipCourierRegion.trim() });
      }

      if (shipping_options.length === 0) {
        setErr("請至少設定一種寄送方式。");
        return;
      }

      // （可選）防呆：fee 不可負
      if (shipping_options.some((o) => !Number.isFinite(o.fee) || o.fee < 0)) {
        setErr("運費不可為負數。");
        return;
      }

      setCreating(true);
      try {
        // ✅ payload（POST / PATCH 都能用）
        const payload = {
          name: name.trim(),
          category_id: categoryId === "uncat" ? null : categoryId,
          stock_qty: stockQty,
          price,
          is_active: isActive,
          image_url: imageUrl.trim(),
          description: description.trim(),
          description_text: descriptionText.trim(),
          shipping_options,
        };

        if (editingId !== null) {
          // ✅ PATCH：更新既有商品
          await adminPatchJson(`/admin/products/${editingId}`, payload);

          setOk(`已更新商品：${payload.name}`);
        } else {
          // ✅ POST：新增商品
          await adminPost("/admin/products", payload);

          setOk(`已新增商品：${payload.name}`);
        }

        window.setTimeout(() => setOk(""), 2500);

        await load();
        setShowCreate(false);
        resetForm();
        setEditingId(null);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setCreating(false);
      }
    }

  function startEdit(p: AdminProduct) {
    setShowCreate(true); // ✅ 進入編輯就打開表單
    setEditingId(p.id);

    setName(p.name);
    setCategoryId(p.category_id ?? "uncat");
    setPrice(p.price);
    setStockQty(p.stock_qty);
    setDescription(p.description ?? "");
    setDescriptionText(p.description_text ?? "");
    setImageUrl(p.image_url ?? "");
    setIsActive(!!p.is_active);

    // ✅ 編輯直接用後端回來的 options（不靠勾選器）
    setShippingOptions(
      (p.shipping_options ?? []).map((o) => ({
        id: o.id,
        method: o.method,
        fee: o.fee,
        region_note: o.region_note ?? "",
      }))
    );
  }

  async function uploadImage(productId: number, file: File) {
    setUploadErr("");
    setUploadingId(productId);
    try {
      const updated = await adminUploadFile<AdminProduct>(`/admin/products/${productId}/image`, file);

      setList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

      setPreviewMap((prev) => {
        const next = { ...prev };
        const url = next[productId];
        if (url) URL.revokeObjectURL(url);
        delete next[productId];
        return next;
      });

      setOk(`已更新商品圖片：${updated.name}`);
      window.setTimeout(() => setOk(""), 2500);
    } catch (e: any) {
      setUploadErr(e?.message || String(e));
    } finally {
      setUploadingId(null);
    }
  }

  async function toggleActive(p: AdminProduct) {
    try {
      const updated = await adminPatchJson<AdminProduct>(`/admin/products/${p.id}/active`, { is_active: !p.is_active });
      setList((prev) => prev.map((it) => (it.id === p.id ? updated : it)));
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function deleteOne(id: number) {
    setErr("");
    const ok = window.confirm(
      `確定要刪除商品 #${id} 嗎？\n⚠️ 若商品曾有訂單紀錄，系統會禁止刪除，請改用下架。`
    );
    if (!ok) return;

    try {
      await adminDelete(`/admin/products/${id}`);
      setOk(`已刪除商品 #${id}`);
      window.setTimeout(() => setOk(""), 2500);
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  // ====== 3️⃣ lifecycle（useEffect）=====
  useEffect(() => {
    load();
  }, []);

    // ====== 4️⃣ JSX render ======
    return (
      <section className="admin-scope" aria-labelledby="admin-products-title" style={{ padding: 16 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* ✅ 只留一個主標題（也負責 aria-labelledby） */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 id="admin-products-title" style={{ margin: 0 }}>
              商品管理
            </h2>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("admin_unlocked_v1");
                window.location.href = "/products";
              }}
            >
              離開管理模式
            </button>

            {/* ✅ 狀態標籤（不再塞第二個 h2） */}
            <span className="muted">
              {editingId ? "✏️ 編輯模式" : showCreate ? "➕ 新增模式" : "列表模式"}
            </span>

            {editingId && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setShowCreate(false);
                }}
              >
                取消編輯
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                if (showCreate) {
                  setShowCreate(false);
                  if (editingId !== null) {
                    resetForm();
                    setEditingId(null);
                  }
                } else {
                  setShowCreate(true);
                }
              }}
            >
              {showCreate ? "關閉表單" : "新增商品"}
            </button>

            <button
              className="btn-secondary"
              type="button"
              onClick={load}
              disabled={loading}
            >
              {loading ? "載入中..." : "重新載入"}
            </button>

          </div>
        </header>

        {/* ✅ OK / ERR 放在頂部，比較清楚 */}
        {ok && (
          <div role="status" aria-live="polite" style={{ border: "1px solid green", padding: 12, marginTop: 12 }}>
            {ok}
          </div>
        )}

        {err && (
          <div role="alert" style={{ border: "1px solid red", padding: 12, marginTop: 12 }}>
            {err}
          </div>
        )}

        {/* ✅ 表單區（新增/編輯共用） */}
        {showCreate && (
          <section
            aria-label={editingId ? "編輯商品" : "新增商品"}
            aria-describedby="product-form-help"
            aria-busy={creating ? "true" : "false"}
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, marginTop: 12 }}
          >
            <h3 style={{ marginTop: 0 }}>{editingId ? "編輯商品" : "新增商品"}</h3>

            <p id="product-form-help" className="muted">
              {editingId
                ? "你正在編輯既有商品，儲存後會直接更新此商品。"
                : "你正在新增商品，送出後會建立一筆新商品。"}
            </p>

            <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
              <label>
                商品名稱
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ display: "block", width: "100%", padding: 8 }}
                />
              </label>

              <label>
                商品類別
                <select
                  value={categoryId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCategoryId(v === "uncat" ? "uncat" : Number(v));
                  }}
                  style={{ display: "block", width: "100%", padding: 8 }}
                >
                  <option value="uncat">未分類</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                庫存數量
                <input
                  type="number"
                  value={stockQty}
                  onChange={(e) => setStockQty(Number(e.target.value))}
                  style={{ display: "block", width: "100%", padding: 8 }}
                  inputMode="numeric"
                  min={0}
                />
              </label>

              <label>
                售價（元）
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  style={{ display: "block", width: "100%", padding: 8 }}
                  inputMode="numeric"
                  min={0}
                />
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                立即上架
              </label>

              <label>
                商品主圖 URL（先用文字，下一步做上傳）
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={{ display: "block", width: "100%", padding: 8 }}
                  placeholder="https://... 或 /uploads/..."
                />
              </label>

              <label>
                商品短描述（列表用）
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ display: "block", width: "100%", padding: 8, minHeight: 60 }}
                />
              </label>

              <label>
                商品說明（長文）
                <textarea
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  style={{ display: "block", width: "100%", padding: 8, minHeight: 120 }}
                />
              </label>

            {editingId && (
              <fieldset style={{ border: "1px solid #ccc", padding: 12, borderRadius: 10 }}>
                <legend>寄送方式（編輯）</legend>

                {shippingOptions.length === 0 && (
                  <p className="muted">尚未設定寄送方式。</p>
                )}

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  {shippingOptions.map((o, idx) => (
                    <li
                      key={o.id ?? idx}
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        border: "1px dashed #aaa",
                        padding: 8,
                        borderRadius: 8,
                      }}
                    >
                      {/* 方式 */}
                      <select
                        value={o.method}
                        onChange={(e) => {
                          const method = e.target.value as ShippingOption["method"];
                          setShippingOptions((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, method } : it))
                          );
                        }}
                      >
                        <option value="post">郵局宅配</option>
                        <option value="cvs_711">超商 7-11</option>
                        <option value="cvs_family">超商 全家</option>
                        <option value="courier">快遞</option>
                      </select>

                      {/* 運費 */}
                      <input
                        type="number"
                        value={o.fee}
                        min={0}
                        inputMode="numeric"
                        onChange={(e) => {
                          const fee = Number(e.target.value);
                          setShippingOptions((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, fee } : it))
                          );
                        }}
                        style={{ width: 120 }}
                        aria-label="運費"
                      />
                      <span>元</span>

                      {/* 限區說明（只在快遞顯示） */}
                      {o.method === "courier" && (
                        <input
                          value={o.region_note ?? ""}
                          onChange={(e) => {
                            const region_note = e.target.value;
                            setShippingOptions((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, region_note } : it))
                            );
                          }}
                          placeholder="限區說明"
                          style={{ minWidth: 200 }}
                          aria-label="限區說明"
                        />
                      )}

                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => {
                            setShippingOptions((prev) => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          刪除
                        </button>

                    </li>
                  ))}
                </ul>

                {/* 新增一種寄送方式 */}
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() =>
                      setShippingOptions((prev) => [
                        ...prev,
                        { id: Date.now(), method: "post", fee: 0, region_note: "" },
                      ])
                    }
                  >
                    ＋ 新增寄送方式
                  </button>
                </div>
              </fieldset>
            )}

              {/* ✅ 目前你這組「勾選器」是新增用；編輯 shipping_options 我們下一步會換成可編輯清單 */}
              {!editingId && (
                <fieldset style={{ border: "1px solid #ccc", padding: 12, borderRadius: 10 }}>
                  <legend>寄送方式與運費</legend>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={shipPostOn} onChange={(e) => setShipPostOn(e.target.checked)} />
                      郵局宅配
                    </label>
                    {shipPostOn && (
                      <>
                        <span>運費</span>
                        <input
                          type="number"
                          value={shipPostFee}
                          onChange={(e) => setShipPostFee(Number(e.target.value))}
                          style={{ width: 120, padding: 8 }}
                          min={0}
                          inputMode="numeric"
                          aria-label="郵局宅配運費"
                        />
                        <span>元</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={ship711On} onChange={(e) => setShip711On(e.target.checked)} />
                      超商 7-11
                    </label>
                    {ship711On && (
                      <>
                        <span>運費</span>
                        <input
                          type="number"
                          value={ship711Fee}
                          onChange={(e) => setShip711Fee(Number(e.target.value))}
                          style={{ width: 120, padding: 8 }}
                          min={0}
                          inputMode="numeric"
                          aria-label="7-11 運費"
                        />
                        <span>元</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={shipFamilyOn} onChange={(e) => setShipFamilyOn(e.target.checked)} />
                      超商 全家
                    </label>
                    {shipFamilyOn && (
                      <>
                        <span>運費</span>
                        <input
                          type="number"
                          value={shipFamilyFee}
                          onChange={(e) => setShipFamilyFee(Number(e.target.value))}
                          style={{ width: 120, padding: 8 }}
                          min={0}
                          inputMode="numeric"
                          aria-label="全家 運費"
                        />
                        <span>元</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={shipCourierOn} onChange={(e) => setShipCourierOn(e.target.checked)} />
                      快遞（限區域）
                    </label>
                    {shipCourierOn && (
                      <>
                        <span>運費</span>
                        <input
                          type="number"
                          value={shipCourierFee}
                          onChange={(e) => setShipCourierFee(Number(e.target.value))}
                          style={{ width: 120, padding: 8 }}
                          min={0}
                          inputMode="numeric"
                          aria-label="快遞運費"
                        />
                        <span>元</span>
                        <input
                          value={shipCourierRegion}
                          onChange={(e) => setShipCourierRegion(e.target.value)}
                          style={{ minWidth: 240, padding: 8 }}
                          placeholder="例如：限雙北 / 限台北市"
                          aria-label="快遞限區說明"
                        />
                      </>
                    )}
                  </div>

                  <p style={{ margin: "10px 0 0 0" }}>
                    ※ 買家結帳只會看到你勾選的選項。
                  </p>
                </fieldset>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-success"
                  onClick={submitCreate}
                  disabled={creating}
                  開啟圖片
                >
                  {creating ? "送出中..." : editingId ? "儲存修改" : "送出新增"}
                </button>

                <button
                  type="button"
                  className="btn-muted"
                  onClick={resetForm}
                >
                  清空表單
                </button>

              </div>

              {/* ✅ 編輯提示 */}
              {editingId ? (
                <p className="muted" style={{ margin: 0 }}>
                  ※ 目前表單已進入「編輯模式」。
                </p>
              ) : null}
            </div>
          </section>
        )}

        {/* ✅ 列表區 */}
        {loading ? (
          <p style={{ marginTop: 12 }}>載入中...</p>
        ) : list.length === 0 ? (
          <p style={{ marginTop: 12 }}>目前沒有商品。</p>
        ) : (
          <ul aria-label="商品列表" style={{ marginTop: 12, display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
            {list.map((p) => {
              const fees = (p.shipping_options ?? []).map((o) => o.fee);
              const minFee = fees.length ? Math.min(...fees) : null;

              return (
                <li key={p.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                  {/* 第一列：標題 + 操作 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div>
                            <strong>{p.price}</strong> 元
                          </div>

                          {/* 編輯：次級 */}
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => startEdit(p)}
                          >
                            編輯
                          </button>

                          {/* 上架 / 下架：次級（狀態切換） */}
                          <button
                            type="button"
                            className={`btn-secondary ${p.is_active ? "is-on" : "is-off"}`}
                            aria-pressed={p.is_active}
                            onClick={() => toggleActive(p)}
                          >
                            aria-label={`${p.name} ${p.is_active ? "下架" : "上架"}`}
                          </button>

                          {/* 刪除：危險 */}
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => deleteOne(p.id)}
                          >
                            刪除
                          </button>
                        </div>
                    </div>
                  </div>

                  {/* 第二列：庫存/分類 */}
                  <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>庫存：{p.stock_qty}</span>
                    <span>分類ID：{p.category_id ?? "未分類"}</span>
                  </div>

                  {/* 短描述 */}
                  {p.description ? <div style={{ marginTop: 6 }}>{p.description}</div> : null}

                  {/* 配送摘要 */}
                  <div style={{ marginTop: 10 }}>
                    <strong>配送摘要：</strong>
                    {p.shipping_options?.length ? (
                      <span>共 {p.shipping_options.length} 種｜最低運費 {minFee} 元</span>
                    ) : (
                      <span>未設定</span>
                    )}
                  </div>

                  {/* 寄送方式明細 */}
                  <div style={{ marginTop: 10 }}>
                    <strong>寄送方式：</strong>
                    {p.shipping_options?.length ? (
                      <ul style={{ marginTop: 6 }}>
                        {p.shipping_options.map((o, idx) => (
                          <li key={o.id ?? `${o.method}-${idx}`}>
                            {methodLabel(o.method)}：{o.fee} 元
                            {o.method === "courier" && o.region_note ? `（${o.region_note}）` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>（未設定）</span>
                    )}
                  </div>

                  {/* 主圖 */}
                  <div style={{ marginTop: 10 }}>
                    <strong>主圖：</strong>{" "}
                    {p.image_url ? (
                      <>
                        <a href={toAbsUrl(p.image_url)} target="_blank" rel="noreferrer">
                          開啟圖片
                        </a>
                        <div style={{ marginTop: 8 }}>
                          <img
                            src={toAbsUrl(p.image_url)}
                            alt={`${p.name} 主圖`}
                            style={{ maxWidth: 240, height: "auto", borderRadius: 8, border: "1px solid #ddd" }}
                            loading="lazy"
                          />
                        </div>
                      </>
                    ) : (
                      "（未設定）"
                    )}
                  </div>

                  {/* ✅ 圖片上傳（後台） */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (!f) return;
                      uploadImage(p.id, f);
                    }}
                    aria-label={`拖拉圖片到這裡可直接上傳：${p.name}`}
                    aria-describedby={`upload-help-${p.id}`}
                    style={{
                      marginTop: 10,
                      border: "1px dashed #aaa",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <p id={`upload-help-${p.id}`} className="sr-only">
                      可拖曳圖片到此區，或使用下方「選擇檔案」按鈕上傳。
                    </p>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span>上傳主圖</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;

                          const url = URL.createObjectURL(f);
                          setPreviewMap((prev) => ({ ...prev, [p.id]: url }));

                          uploadImage(p.id, f);
                          e.currentTarget.value = "";
                        }}
                        disabled={uploadingId === p.id}
                      />
                    </label>

                    {uploadingId === p.id ? <div style={{ marginTop: 6 }}>上傳中...</div> : null}

                    {uploadErr ? (
                      <div role="alert" style={{ border: "1px solid red", padding: 8, marginTop: 8 }}>
                        {uploadErr}
                      </div>
                    ) : null}

                    {previewMap[p.id] ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12 }}>預覽：</div>
                        <img
                          src={previewMap[p.id]}
                          alt="即將上傳的圖片預覽"
                          style={{ maxWidth: 220, width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

