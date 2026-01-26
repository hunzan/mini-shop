# mini-shop

一個輕量、可及、可實際運作的迷你電商專案（V1）。

本專案目前用於「小規模實際營運＋職訓用途」，  
讓使用者可以從 **商品上架 → 管理 → 下單流程**，完整體驗一個可運作的商店系統。

---

## 🎯 專案定位

- **V1 / 微型商店**
- 不追求一次到位的商業規模
- 重視：
  - 可實際使用
  - 可理解、可修改
  - 可 fork、可擴充
- 設計時特別考量：
  - 行動裝置操作
  - 輔助科技（鍵盤操作、ARIA、簡化流程）
  - 身心障礙者也能參與的後台操作流程（職訓取向）

---

## 🧱 技術架構

### Frontend
- React + Vite
- TypeScript
- React Router
- 無 UI 框架（以原生 CSS 為主，利於理解與客製）
- 注重可及性（ARIA、焦點、鍵盤操作）

### Backend
- FastAPI
- SQLAlchemy
- SQLite（V1）
- Token-based Admin 驗證（`X-Admin-Token`）

---

## ✨ 目前功能（V1）

### 買家端
- 商品列表
- 商品詳細頁
- 購物車
- 結帳流程（未串金流，支援：
  - 郵寄
  - 超商取貨
  - 宅配貨到付款）

### 管理端（Admin）
- 商品管理
  - 新增 / 編輯 / 下架 / 刪除
  - 庫存管理
  - 商品圖片上傳
- **商品分類管理（前端化）**
  - 新增 / 編輯 / 排序 / 啟用停用
- 訂單列表與訂單狀態更新

---

## 🔐 環境變數

### Backend
```env
ADMIN_TOKEN=your-secret-token
```

### Frontend
```env
VITE_ADMIN_TOKEN=your-secret-token
VITE_API_BASE=http://127.0.0.1:8000
```
### 🚫 不納入版本控制的內容
.env

*.db（SQLite）

uploads/ 實際檔案（僅保留資料夾結構）

---

## 🚀 本地啟動方式

### Backend
```env
uvicorn app.main:app --reload --port 8000
```

### Frontend
```env
npm install
npm run dev
```
## 🧪 Seed 說明
本專案 不依賴 seed 才能運作。

seed.py 僅用於：

初始化資料表

建立示範資料（可選）

```env
# 僅在需要時才執行
$env:SEED="1"
python -m app.seed
```
---

## © 版權與使用說明（保留商業權利）

© A-kâu & Kim-chio Studio（阿猴 & 金蕉工作室）  
All rights reserved.

本專案（mini-shop）由 A-kâu（林阿猴）與 Kim-chio（金蕉）共同構思與實作，  
作為實際營運、職能訓練、可及性設計與生活型創業的實驗專案。

### 使用範圍說明
- 本專案 **未採用開放原始碼授權（Not Open Source）**
- 原始碼僅供作者本人及其授權對象使用
- 未經明確書面同意，不得：
  - 用於商業用途
  - 作為課程教材或收費教學內容
  - 複製、再散佈、或公開展示為衍生產品
  - 移除或更改作者與工作室署名

### 關於 fork 與參考
- 若僅作為**個人學習參考**，可閱讀原始碼結構與設計思路
- 若希望 fork 或延伸使用，請先聯繫作者取得授權

本專案為實際使用中的系統，而非範例模板。  
請尊重創作、使用者與背後的生活實踐。


