import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const STORAGE_KEY = "admin_unlocked_v1";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const unlocked = sessionStorage.getItem(STORAGE_KEY) === "1";

  if (!unlocked) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/admin-gate?next=${next}`} replace />;
  }

  return <>{children}</>;
}
