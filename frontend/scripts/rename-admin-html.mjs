// frontend/scripts/rename-admin-html.mjs
import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist-admin");
const from = path.join(distDir, "admin.html");
const to = path.join(distDir, "index.html");

if (!fs.existsSync(from)) {
  console.error(`❌ 找不到 ${from}，請先跑 vite build --mode admin`);
  process.exit(1);
}

fs.renameSync(from, to);
console.log("✅ renamed dist-admin/admin.html -> dist-admin/index.html");
