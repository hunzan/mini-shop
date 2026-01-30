import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isAdmin = mode === "admin";

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
        // ✅ 強制輸出成 index.html，讓 preview / 靜態部署都吃得懂
        input: {
          index: isAdmin
            ? path.resolve(__dirname, "admin.html")
            : path.resolve(__dirname, "index.html"),
        },
      },
    },
  };
});
