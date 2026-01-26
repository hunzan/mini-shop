import { Link, useLocation, useSearchParams } from "react-router-dom";

export default function CheckoutResult() {
  const loc = useLocation();
  const [sp] = useSearchParams();

  const state = (loc.state as any) ?? {};
  const order = state.order ?? null;

  const orderId = String(order?.order_id ?? sp.get("id") ?? "");
  const total = order?.total_amount;

  const buyerName = state.buyerName as string | undefined;
  const buyerEmail = state.buyerEmail as string | undefined;
  const shippingLabel = state.shippingLabel as string | undefined;
  const shippingAddress = state.shippingAddress as string | undefined;

  const isCvs = shippingLabel?.includes("超商");

  return (
    <div className="card">
      <div className="result-hero" role="status" aria-live="polite">
        <div className="result-icon" aria-hidden="true">✅</div>
        <div>
          <h1 style={{ marginBottom: 6 }}>下單完成</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            我們已收到你的訂單，接下來會依照配送方式進行處理。
          </p>
        </div>
      </div>

      <div className="result-box">
        {orderId ? (
          <p>
            訂單編號：<strong>{orderId}</strong>
          </p>
        ) : null}

        {typeof total === "number" ? (
          <p>
            訂單金額：<strong>{total} 元</strong>
          </p>
        ) : null}

        {buyerName ? <p>收件人：{buyerName}</p> : null}

        {buyerEmail ? (
          <p>
            通知信將寄到：<strong>{buyerEmail}</strong>
          </p>
        ) : (
          <p className="muted">（若未填 Email，將無法收到通知信）</p>
        )}

        {shippingLabel ? (
          <p>
            配送方式：<strong>{shippingLabel}</strong>
          </p>
        ) : null}

        {shippingAddress ? (
          <p>
            {isCvs ? "取貨門市" : "配送地址"}：<strong>{shippingAddress}</strong>
          </p>
        ) : null}
      </div>

      <h3>🚚我們將盡快為您準備出貨，敬請留意 e-mail 或簡訊通知</h3>

      <div className="cta-row">
        <Link className="btn" to="/products">繼續逛商品</Link>
        <Link className="btn btn-ghost" to="/">回首頁</Link>
      </div>

      {/* DEV 才顯示（上站後不會有） */}
      {import.meta.env.DEV && order ? (
        <details style={{ marginTop: 12 }}>
          <summary>開發資訊（DEV）</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(order, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
