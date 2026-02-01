import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isAdmin = mode === "admin";
  const isShop = mode === "shop";

  // 預設：沒指定 mode 時就當 shop（避免意外打包到 admin）
  const entryHtml = isAdmin
    ? "admin.html"
    : isShop
      ? "index.html"
      : "index.html";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: isAdmin ? "dist-admin" : "dist-shop",
      emptyOutDir: true,
      rollupOptions: {
        // ✅ 用「單一入口」字串，避免多入口殘留/混包
        input: path.resolve(__dirname, entryHtml),
      },
    },
  };
});
