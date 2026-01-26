import { useEffect, useState } from "react";
import {
  fetchAdminCategories,
  createCategory,
  updateCategory,
  type AdminCategory,
} from "../api/adminCategories";

export default function AdminCategories() {
  const [list, setList] = useState<AdminCategory[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(10);
  const [announce, setAnnounce] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const rows = await fetchAdminCategories();
    setList(rows);
  }

  async function addCategory() {
    if (!name.trim()) {
      setErr("分類名稱不可空白");
      return;
    }
    await createCategory({
      name: name.trim(),
      sort_order: order,
      is_active: true,
    });
    setName("");
    setOrder(order + 10);
    setAnnounce("已新增分類");
    load();
  }

  async function toggleActive(c: AdminCategory) {
    await updateCategory(c.id, { is_active: !c.is_active });
    setAnnounce(`分類「${c.name}」已${c.is_active ? "停用" : "啟用"}`);
    load();
  }

  async function updateField(
    c: AdminCategory,
    field: "name" | "sort_order",
    value: string | number
  ) {
    await updateCategory(c.id, { [field]: value });
    setAnnounce(`分類「${c.name}」已更新`);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="admin-scope" style={{ padding: 16 }}>
      <h2>分類管理</h2>

      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      {err && <p className="danger">{err}</p>}

      {/* 新增分類 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="分類名稱"
          aria-label="分類名稱"
        />
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          aria-label="排序"
          style={{ width: 80 }}
        />
        <button className="btn-success" type="button" onClick={addCategory}>
          新增分類
        </button>
      </div>

      {/* 分類清單 */}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {list.map((c) => (
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
                onBlur={(e) =>
                  e.target.value !== c.name &&
                  updateField(c, "name", e.target.value.trim())
                }
              />

              <input
                type="number"
                defaultValue={c.sort_order}
                aria-label={`排序 ${c.name}`}
                style={{ width: 80 }}
                onBlur={(e) =>
                  Number(e.target.value) !== c.sort_order &&
                  updateField(c, "sort_order", Number(e.target.value))
                }
              />

              <button
                type="button"
                className="btn-secondary"
                aria-pressed={c.is_active}
                onClick={() => toggleActive(c)}
              >
                {c.is_active ? "停用" : "啟用"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
