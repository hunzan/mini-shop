// src/pages/AdminOrders.tsx
import { useEffect, useMemo, useState } from "react";
import { adminGet, adminPatch } from "../api/adminClient";

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
  const [list, setList] = useState<OrderRow[]>([]);
  const [full, setFull] = useState<OrderFull | null>(null);
  const [err, setErr] = useState("");
  const [announce, setAnnounce] = useState("");

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
    setList(await adminGet("/admin/orders"));
  }

  async function loadOne(id: number) {
    setErr("");
    setFull(await adminGet(`/admin/orders/${id}`));
  }

  async function setStatus(id: number, status: OrderStatus) {
    try {
      await adminPatch(`/admin/orders/${id}/status?status=${status}`);
      setAnnounce(`訂單 #${id} 已更新為「${labelOf(STATUS_LABEL, status)}」`);
      await loadList();
      await loadOne(id);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    loadList().catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="admin-scope">
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      {/* 左：列表 */}
      <section>
        <h2>訂單列表</h2>
        {err && <p className="danger">{err}</p>}
        <ul>
          {list.map((o) => (
            <li key={o.id}>
              <button className="list-btn" onClick={() => loadOne(o.id)}>
                #{o.id}｜{labelOf(STATUS_LABEL, o.status)}｜{o.total_amount} 元｜
                {o.customer_name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 右：詳情 */}
      <section>
        <h2>訂單詳情</h2>

        {!full ? (
          <p>請從左側選擇訂單</p>
        ) : (
          <>
            <p>
              <strong>狀態：
              {labelOf(STATUS_LABEL, full.order.status)}
              </strong>
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className="btn"
                  onClick={() => setStatus(full.order.id, s)}
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
            <ul>
              {full.items.map((it) => (
                <li key={it.product_id}>
                  {it.name} × {it.qty}（{it.unit_price}）＝{it.line_total}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
