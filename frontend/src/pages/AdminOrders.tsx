// src/pages/AdminOrders.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import AdminNav from "../components/admin/AdminNav";
import { adminGet, adminPatchJson } from "../api/adminClient"; // ✅ 用你有的函式
// 如果你 adminClient 真的有 adminPatch（無 body），再改回 adminPatch

const STORAGE_KEY = "admin_unlocked_v1";

type OrderRow = {
  id: number;
  status: string;
  customer_name: string;
  total_amount: number;
};

type OrderFull = {
  order: {
    id: number;
    status: string;
    customer_name: string;
    customer_email: string;
    shipping_method: string;
    shipping_address: string;
    recipient_name: string | null;
    recipient_phone: string | null;
    shipping_post_address: string | null;
    cvs_brand: string | null;
    cvs_store_id: string | null;
    cvs_store_name: string | null;
    total_amount: number;
  };
  items: Array<{
    product_id: number;
    name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
};

const STATUSES = ["pending", "paid", "shipped", "done", "cancelled"] as const;
type OrderStatus = (typeof STATUSES)[number];

function labelOf(map: Record<string, string>, key: unknown): string {
  const k = String(key ?? "");
  return map[k] ?? k;
}

export default function AdminOrders() {
  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [list, setList] = useState<OrderRow[]>([]);
  const [full, setFull] = useState<OrderFull | null>(null);
  const [err, setErr] = useState("");
  const [announce, setAnnounce] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const STATUS_LABEL = useMemo(
    () => ({
      pending: "待處理",
      paid: "已收款",
      shipped: "已出貨",
      done: "已完成",
      cancelled: "已取消",
    }),
    []
  );

  const STATUS_ACTION_LABEL = useMemo(
    () => ({
      pending: "⏰待處理",
      paid: "💰已收款",
      shipped: "🚛已出貨",
      done: "✔️已完成",
      cancelled: "❌已取消",
    }),
    []
  );

  const SHIPPING_LABEL = useMemo(
    () => ({
      post: "郵局寄送",
      home: "宅配到府",
      cvs_711: "超商取貨（7-11）",
      cvs_family: "超商取貨（全家）",
      cvs_hilife: "超商取貨（萊爾富）",
      cvs_ok: "超商取貨（OK）",
    }),
    []
  );

  async function loadList() {
    setErr("");
    setList(await adminGet<OrderRow[]>("/admin/orders"));
  }

  async function loadOne(id: number, opts?: { announce?: boolean }) {
    setErr("");
    setSelectedId(id);
    const data = await adminGet<OrderFull>(`/admin/orders/${id}`);
    setFull(data);
    if (opts?.announce) {
      setAnnounce(`已載入訂單 #${id} 詳情`);
    }
    // 焦點移到詳情標題（維持你原本的可及性設計）
    setTimeout(() => detailHeadingRef.current?.focus(), 0);
  }

  async function setStatus(id: number, status: OrderStatus) {
    try {
      setBusy(true);
      await adminPatchJson(`/admin/orders/${id}/status?status=${status}`, {});
      setAnnounce(`訂單 #${id} 已更新為「${labelOf(STATUS_LABEL, status)}」`);
      await loadList();
      await loadOne(id);  // ❗ 不傳 announce
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadList().catch((e) => setErr(String(e)));
  }, []);

  // ...後面你的 return UI 保持原樣即可

    return (
    <div className="admin-scope">
      <AdminNav />
      <main className="admin-scope" aria-label="訂單管理">
        <div role="status" aria-live="polite" className="sr-only">
          {announce}
        </div>

        {/* 左：列表 */}
        <section aria-label="訂單列表">
          <h2>訂單列表</h2>

          {err && (
            <p className="danger" role="alert">
              {err}
            </p>
          )}

          <ul aria-label="訂單清單">
            {list.map((o) => {
              const isSelected = selectedId === o.id;
              return (
                <li key={o.id}>
                    <button
                      className="list-btn"
                      aria-current={selectedId === o.id ? "true" : undefined}
                      onClick={() => loadOne(o.id, { announce: true })}
                    >

                    #{o.id}｜{labelOf(STATUS_LABEL, o.status)}｜{o.total_amount} 元｜
                    {o.customer_name}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 右：詳情 */}
        <section aria-label="訂單詳情">
          {/* 讓焦點可以移動到這裡：tabIndex=-1 */}
          <h2 tabIndex={-1} ref={detailHeadingRef}>
            訂單詳情
          </h2>

          {!full ? (
            <p>請從左側選擇訂單</p>
          ) : (
            <>
              <p>
                <strong>狀態：</strong> {labelOf(STATUS_LABEL, full.order.status)}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn"
                    onClick={() => setStatus(full.order.id, s)}
                    disabled={busy}
                  >
                    {labelOf(STATUS_ACTION_LABEL, s)}
                  </button>
                ))}
              </div>

              <hr />

              <p>
                <strong>買家：</strong>
                {full.order.customer_name}（{full.order.customer_email}）
              </p>

              <p>
                <strong>物流：</strong>
                {labelOf(SHIPPING_LABEL, full.order.shipping_method)}
              </p>

              <p>
                <strong>備註：</strong>
                {full.order.shipping_address}
              </p>

              <h3>商品明細</h3>
              <ul aria-label="商品明細">
                {full.items.map((it) => (
                  <li key={`${it.product_id}-${it.name}`}>
                    {it.name} × {it.qty}（{it.unit_price}）＝{it.line_total}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
      </div>
    );
  }
