import { useEffect } from "react";

type Props = {
  qty: number;
  setQty: (next: number) => void;

  max?: number;          // 庫存上限（未給或 <=0 視為不限制）
  disabled?: boolean;

  onHitMax?: () => void; // 達上限時要做的事（例如 announce + 顯示提示）
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function QuantityPicker({ qty, setQty, max, disabled, onHitMax }: Props) {
  const hasMax = typeof max === "number" && max > 0;

  // 防呆：外部 qty 若超過上限，自動拉回來
  useEffect(() => {
    if (!hasMax) return;
    if (qty > max!) setQty(max!);
    if (qty < 1) setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMax, max]);

  const canDec = qty > 1;
  const canInc = !hasMax || qty < (max as number);

  function dec() {
    if (disabled) return;
    if (!canDec) return;
    setQty(qty - 1);
  }

  function inc() {
    if (disabled) return;
    if (!canInc) {
      onHitMax?.();
      return;
    }
    setQty(qty + 1);
  }

  function onInput(v: string) {
    if (disabled) return;
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    const upper = hasMax ? (max as number) : 9999;
    setQty(clamp(n, 1, upper));
  }

  return (
    <div className="qty" aria-label="選擇件數">
      <button type="button" className="btn" onClick={dec} disabled={disabled || !canDec} aria-label="減少件數">
        −
      </button>

      <label className="sr-only" htmlFor="qty">件數</label>
      <input
        id="qty"
        className="qty-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={hasMax ? max : undefined}
        value={qty}
        onChange={(e) => onInput(e.target.value)}
        disabled={disabled}
      />

      <button type="button" className="btn" onClick={inc} disabled={disabled || !canInc} aria-label="增加件數">
        +
      </button>
    </div>
  );
}
