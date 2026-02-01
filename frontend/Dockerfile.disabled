FROM node:20-slim

WORKDIR /app

# ✅ Build-time args（讓 Railway 在 build 時塞值）
ARG VITE_API_BASE_URL
ARG VITE_API_BASE
ARG VITE_ADMIN_TOKEN
ARG VITE_SHOW_ADMIN

# ✅ 轉成 ENV，vite build 才讀得到
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_ADMIN_TOKEN=${VITE_ADMIN_TOKEN}
ENV VITE_SHOW_ADMIN=${VITE_SHOW_ADMIN}

# 先拷依賴描述檔（快取）
COPY frontend/package.json ./package.json
COPY frontend/package-lock.json ./package-lock.json

RUN npm ci

# 再拷貝原始碼
COPY frontend/ ./

# build（這時候 import.meta.env 才會有值）
RUN npm run build

# 靜態伺服器
RUN npm i -g serve

# Railway 會給 PORT；本機沒給就用 3000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
