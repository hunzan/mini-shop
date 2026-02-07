import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAdminCategories,
  createCategory,
  updateCategory,
  type AdminCategory,
} from "../api/adminCategories";

/** 穩定版：允許 11/12，但要擋掉 NaN / 小數 / 負數 */
function normalizeSortOrder(input: unknown) {
  const n = typeof input === "number" ? input : Number(input);

  if (!Number.isFinite(n)) return { ok: false as const, value: 0 };

  // 允許 11、12，但不允許小數
  const intVal = Math.trunc(n);
  if (intVal !== n) return { ok: false as const, value: 0 };

  // 依後端建議：sort_order >= 0（你後端目前沒擋，但前端先穩起來）
  if (intVal < 0) return { ok: false as const, value: 0 };

  return { ok: true as const, value: intVal };
}

export default function AdminCategories() {
  const [list, setList] = useState<AdminCategory[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(10);
  const [announce, setAnnounce] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null); // -1 表新增中

  // 防止競態：只讓最後一次 load 的結果寫進 state
  const loadSeq = useRef(0);

  const nextDefaultOrder = useMemo(() => {
    const max = list.reduce((m, c) => Math.max(m, Number(c.sort_order ?? 0)), 0);
    // 仍保留「以 10 為間距」的預設值，但不限制使用者輸入一定要 10 倍數
    return (Math.floor(max / 10) + 1) * 10 || 10;
  }, [list]);

  async function load() {
    const seq = ++loadSeq.current;
    setErr("");
    setLoading(true);
    try {
      const rows = await fetchAdminCategories();
      if (seq === loadSeq.current) setList(rows);
    } catch (e: any) {
      if (seq === loadSeq.current) setErr(e?.message ?? "載入失敗，請稍後再試");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }

  async function addCategory() {
    setErr("");
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("分類名稱不可空白");
      return;
    }

    const norm = normalizeSortOrder(order);
    if (!norm.ok) {
      setErr("排序必須是非負整數（可用 11、12 這種細分排序）");
      return;
    }

    setBusyId(-1);
    try {
      await createCategory({
        name: trimmed,
        sort_order: norm.value,
        is_active: true,
      });
      setName("");
      setAnnounce("已新增分類");
      await load();
      setOrder(nextDefaultOrder);
    } catch (e: any) {
      setErr(e?.message ?? "新增失敗，請稍後再試");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(c: AdminCategory) {
    setErr("");
    setBusyId(c.id);
    try {
      await updateCategory(c.id, { is_active: !c.is_active });
      setAnnounce(`分類「${c.name}」已${c.is_active ? "停用" : "啟用"}`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "更新失敗，請稍後再試");
    } finally {
      setBusyId(null);
    }
  }

  async function updateField(
    c: AdminCategory,
    field: "name" | "sort_order",
    value: string | number
  ) {
    setErr("");
    setBusyId(c.id);
    try {
      if (field === "name") {
        const trimmed = String(value).trim();
        if (!trimmed) {
          setErr("分類名稱不可空白");
          return;
        }
        await updateCategory(c.id, { name: trimmed });
      } else {
        const norm = normalizeSortOrder(value);
        if (!norm.ok) {
          setErr("排序必須是非負整數（可用 11、12 這種細分排序）");
          return;
        }
        await updateCategory(c.id, { sort_order: norm.value });
      }

      setAnnounce(`分類「${c.name}」已更新`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "更新失敗，請稍後再試");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isAdding = busyId === -1;

  return (
    <section className="admin-scope" style={{ padding: 16 }}>
      <h2>分類管理</h2>

      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      {err && <p className="danger">{err}</p>}
      {loading && <p className="muted">載入中…</p>}

      {/* 新增分類 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="分類名稱"
          aria-label="分類名稱"
          disabled={isAdding}
        />
        <input
          type="number"
          value={order}
          onChange={(e) => {
            // 使用者清空會變成 NaN，先放進去讓他繼續輸入，送出/blur 再驗證
            const v = Number(e.target.value);
            setOrder(v);
          }}
          aria-label="排序"
          style={{ width: 80 }}
          disabled={isAdding}
        />
        <button className="btn-success" type="button" onClick={addCategory} disabled={isAdding}>
          {isAdding ? "新增中…" : "新增分類"}
        </button>
      </div>

      {/* 分類清單 */}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {list.map((c) => {
          const rowBusy = busyId === c.id;
          return (
            <li
              key={c.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                opacity: c.is_active ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <input
                  defaultValue={c.name}
                  aria-label={`分類名稱 ${c.name}`}
                  disabled={rowBusy}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v) {
                      setErr("分類名稱不可空白");
                      e.target.value = c.name; // 回填原值，避免留空造成困惑
                      return;
                    }
                    if (v !== c.name) updateField(c, "name", v);
                  }}
                />

                <input
                  type="number"
                  defaultValue={c.sort_order}
                  aria-label={`排序 ${c.name}`}
                  style={{ width: 80 }}
                  disabled={rowBusy}
                  onBlur={(e) => {
                    const norm = normalizeSortOrder(e.target.value);
                    if (!norm.ok) {
                      setErr("排序必須是非負整數（可用 11、12 這種細分排序）");
                      e.target.value = String(c.sort_order); // 回填原值
                      return;
                    }
                    if (norm.value !== c.sort_order) updateField(c, "sort_order", norm.value);
                  }}
                />

                <button
                  type="button"
                  className="btn-secondary"
                  aria-pressed={c.is_active}
                  onClick={() => toggleActive(c)}
                  disabled={rowBusy}
                >
                  {rowBusy ? "更新中…" : c.is_active ? "停用" : "啟用"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

