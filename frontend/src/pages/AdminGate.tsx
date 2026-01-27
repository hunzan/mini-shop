import { useEffect, useId, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

const GATE_PASS = "rabbit-1234"; // ✅ 教學用：你要寫死就寫死（之後要改再改碼）
const STORAGE_KEY = "admin_unlocked_v1";

export default function AdminGate() {
  const nav = useNavigate();
  const loc = useLocation();
  const inputId = useId();
  const hintId = useId();
  const errId = useId();
  const passRef = useRef<HTMLInputElement | null>(null);

  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string>("");

  const unlocked = sessionStorage.getItem(STORAGE_KEY) === "1";
  const next = new URLSearchParams(loc.search).get("next") || "/admin";

  useEffect(() => {
    passRef.current?.focus();
  }, []);

  if (unlocked) return <Navigate to={next} replace />;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (pass !== GATE_PASS) {
      setErr("密碼不正確，請再試一次。");
      setPass("");
      passRef.current?.focus();
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, "1");
    nav(next, { replace: true });
  }

  return (
    <section className="card" aria-labelledby="gate-title">
      <h1 id="gate-title">管理入口</h1>

      <p id={hintId}>
        這是「管理者」專用入口。買家逛商店不需要這個頁面。
      </p>

      <form onSubmit={submit} className="stack" aria-describedby={hintId}>
        <label htmlFor={inputId}>管理密碼</label>
        <input
          id={inputId}
          ref={passRef}
          type="password"
          inputMode="text"
          autoComplete="current-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          aria-invalid={err ? "true" : "false"}
          aria-describedby={err ? errId : undefined}
        />

        {err && (
          <p id={errId} role="alert">
            {err}
          </p>
        )}

        <div className="row">
          <button type="submit">進入管理頁</button>
          <button
            type="button"
            onClick={() => {
              setPass("");
              setErr("");
              passRef.current?.focus();
            }}
          >
            清除
          </button>

          <button type="button" className="btn" onClick={() => nav("/products")}>
            回商品頁
          </button>
        </div>

        <p>
          <small>
            提醒：若你不是管理者，請回到{" "}
            <a href="/products">商品頁</a>。
          </small>
        </p>
      </form>
    </section>
  );
}
