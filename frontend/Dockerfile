FROM node:20-slim

WORKDIR /app

# 先拷依賴描述檔（快取）
COPY frontend/package.json ./package.json
COPY frontend/package-lock.json ./package-lock.json

RUN npm ci

# 再拷貝原始碼
COPY frontend/ ./

# build
RUN npm run build

# 靜態伺服器
RUN npm i -g serve

# Railway 會給 PORT；本機沒給就用 3000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
