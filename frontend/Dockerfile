FROM node:20-slim

WORKDIR /app

COPY frontend/package*.json /app/
RUN npm ci

COPY frontend /app
RUN npm run build

# 用 vite preview 或 serve 都可；你已裝 serve，我用 serve
RUN npm i -g serve
CMD ["bash","-lc","serve -s dist -l ${PORT:-3000}"]
