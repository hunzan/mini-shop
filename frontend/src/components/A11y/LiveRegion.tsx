// src/components/A11y/LiveRegion.tsx
import { useEffect, useState } from "react";

declare global {
  interface Window {
    __liveRegionAnnounce?: (msg: string) => void;
  }
}

export default function LiveRegion() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    window.__liveRegionAnnounce = (m: string) => {
      setMsg("");
      // 讓 SR 重新朗讀同一句也能觸發
      setTimeout(() => setMsg(m), 10);
    };
    return () => {
      delete window.__liveRegionAnnounce;
    };
  }, []);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {msg}
    </div>
  );
}
