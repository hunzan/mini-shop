// src/pages/AdminGate.tsx
import { useEffect, useId, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

const GATE_PASS = "rabbit@0963";
const STORAGE_KEY = "admin_unlocked_v1";
const TOKEN_KEY = "admin_token";

export default function AdminGate() {
  const nav = useNavigate();
  const loc = useLocation();
  const inputId = useId();
  const hintId = useId();
  const errId = useId();
  const passRef = useRef<HTMLInputElement | null>(null);

  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  // ✅ token 來自 build-time env（Vite）
  const token = import.meta.env.VITE_ADMIN_TOKEN || "";

  // ✅ 只有「已解鎖 + token 也存在」才算真的解鎖
  const unlocked =
    sessionStorage.getItem(STORAGE_KEY) === "1" &&
    Boolean(sessionStorage.getItem(TOKEN_KEY));

  const next = new URLSearchParams(loc.search).get("next") || "/admin";

  useEffect(() => {
    passRef.current?.focus();
  }, []);

  if (unlocked) return <Navigate to={next} replace />;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setErr("");

    console.log("[AdminGate] submit fired");
    console.log("[AdminGate] token exists?", Boolean(token), "len=", token.length);

    if (pass !== GATE_PASS) {
      console.log("[AdminGate] wrong password");
      setErr("密碼不正確，請再試一次。");
      setPass("");
      passRef.current?.focus();
      return;
    }

    if (!token) {
      console.log("[AdminGate] missing VITE_ADMIN_TOKEN");
      setErr("系統未設定管理權杖（VITE_ADMIN_TOKEN）。請聯絡網管處理。");
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(STORAGE_KEY, "1");

    console.log("[AdminGate] after setItem admin_token =", sessionStorage.getItem(TOKEN_KEY));

    nav(next, { replace: true });
  }

  const describedBy = err ? `${hintId} ${errId}` : hintId;

  return (
    <section className="card gate" aria-labelledby="gate-title">
      <h1 id="gate-title" className="gate__title">管理入口</h1>

      <p id={hintId} className="gate__hint">
        這是「管理者」專用入口。買家逛商店不需要這個頁面。
      </p>

      <form onSubmit={submit} className="gate__form" aria-describedby={hintId}>
        <div className="gate__field">
          <label className="gate__label" htmlFor={inputId}>管理密碼</label>
          <input
            className="gate__input"
            id={inputId}
            ref={passRef}
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
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
          {/* ✅ 保險：onClick 也呼叫 submit，避免 onSubmit 沒觸發 */}
          <button
            className="btn gate__primary"
            type="submit"
            onClick={() => submit()}
          >
            進入管理頁
          </button>

          <button
            className="btn gate__secondary"
            type="button"
            onClick={() => {
              setPass("");
              setErr("");
              passRef.current?.focus();
            }}
          >
            清除
          </button>
        </div>

        <p className="gate__footer">
          <small>
            提醒：若你不是管理者，請回到 <a href="/products">商品頁</a>。
          </small>
        </p>
      </form>
    </section>
  );
}
