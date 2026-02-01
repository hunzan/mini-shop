// src/pages/AdminGate.tsx
import { useEffect, useId, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isAdminUnlocked, setAdminSession } from "../utils/adminSession";
import { API_BASE } from "../api/base";

const shopUrl = import.meta.env.VITE_SHOP_URL || "http://localhost:5173";

export default function AdminGate() {
  const nav = useNavigate();
  const loc = useLocation();
  const inputId = useId();
  const hintId = useId();
  const errId = useId();
  const tokenRef = useRef<HTMLInputElement | null>(null);

  const [tokenInput, setTokenInput] = useState("");
  const [err, setErr] = useState("");

  const unlocked = isAdminUnlocked();

  // ✅ admin 站內預設落點：改成你想的（/orders 或 /products）
  const next = new URLSearchParams(loc.search).get("next") || "/orders";

  useEffect(() => {
    tokenRef.current?.focus();
  }, []);

  if (unlocked) return <Navigate to={next} replace />;

    async function submit(e?: React.FormEvent) {
      e?.preventDefault();
      setErr("");

      const password = tokenInput.trim();
      if (!password) {
        setErr("請輸入管理密碼。");
        tokenRef.current?.focus();
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/admin/auth/login`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });

        if (!res.ok) {
          const raw = await res.text();
          let msg = `登入失敗（HTTP ${res.status}）`;
          try {
            const data = raw ? JSON.parse(raw) : null;
            if (data?.detail) msg = String(data.detail);
          } catch {}
          throw new Error(msg);
        }

        const data = (await res.json()) as { token: string; expires_at: string };

        if (!data?.token) throw new Error("伺服器未回傳 token");
        if (!data?.expires_at) throw new Error("伺服器未回傳 expires_at");

        // ✅ 重要：存 token + expires_at
        setAdminSession(data.token, data.expires_at);

        nav(next, { replace: true });
      } catch (err: any) {
        setErr(err?.message || "登入失敗，請稍後再試。");
        tokenRef.current?.focus();
      }
    }

  const describedBy = err ? `${hintId} ${errId}` : hintId;

  return (
    <section className="card gate" aria-labelledby="gate-title">
      <h1 id="gate-title" className="gate__title">
        管理入口
      </h1>

      <p id={hintId} className="gate__hint">
        這是「管理者」專用入口。買家逛商店不需要這個頁面。
      </p>

      <form onSubmit={submit} className="gate__form" aria-describedby={hintId}>
        <div className="gate__field">
          <label className="gate__label" htmlFor={inputId}>
            管理權杖
          </label>
          <input
            className="gate__input"
            id={inputId}
            ref={tokenRef}
            type="password"
            autoComplete="current-password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            aria-invalid={err ? "true" : "false"}
            aria-describedby={describedBy}
          />
        </div>

        {err && (
          <p id={errId} role="alert" className="gate__error">
            {err}
          </p>
        )}

        <div className="gate__actions">
          <button className="btn gate__primary" type="submit">
            進入管理頁
          </button>

          <button
            className="btn gate__secondary"
            type="button"
            onClick={() => {
              setTokenInput("");
              setErr("");
              tokenRef.current?.focus();
            }}
          >
            清除
          </button>
        </div>

        <p className="gate__footer">
          <small>
            提醒：若你不是管理者，請回到{" "}
            <a href={shopUrl}>商店前台</a>。
          </small>
        </p>
      </form>
    </section>
  );
}
