# CLAUDE.md — 行人地獄 App（passenger）

完整規格見 `docs/spec.md`。本檔是開發時必須遵守的規範。

## 專案概要

- 純前端 PWA 示意版（MVP），部署在 GitHub Pages：`https://bluedog0050.github.io/passenger/`
- 沒有後端、沒有資料庫伺服器、沒有登入；資料存在瀏覽器 IndexedDB
- 地圖使用 Leaflet + OpenStreetMap，範圍是全台灣
- 介面一律使用繁體中文；手機優先

## 技術選擇

- React 18 + Vite + TypeScript（strict 模式）
- Tailwind CSS；不使用其他元件庫
- react-leaflet；hash 路由（`#/`、`#/report`）
- `idb` 套件操作 IndexedDB
- vite-plugin-pwa
- 測試：Vitest（單元測試）、Playwright（端對端測試）
- 檢查：ESLint + Prettier + `tsc --noEmit`
- Vite `base` 設為 `/passenger/`

## 常用指令（階段 1 建立後）

- `npm run dev`：本機開發
- `npm run build`：打包
- `npm run typecheck`：型別檢查
- `npm run lint`：程式碼檢查
- `npm run test`：單元測試
- 每個階段結束前，typecheck、lint、test、build 都必須通過

## 工作規則

- 一次只做一個開發階段；完成後執行檢查、git commit、依照報告格式回報，然後**停下來等確認**
- 只做本階段範圍內的功能；新點子寫在報告的「建議可新增的功能」
- 需求沒寫到的情況，選比較安全、比較保護使用者的做法，並在報告中說明
- 使用者是初學者：重要決定要用白話說明原因
- commit 訊息用繁體中文或英文，清楚說明做了什麼

## 程式碼規範

- 目錄結構：
  - `src/pages/`：頁面（MapPage、ReportPage）
  - `src/components/`：共用元件
  - `src/lib/`：邏輯（storage、geo、image、validation）
  - `src/data/`：範例資料、類別定義
  - `src/types.ts`：共用型別
- 禁止使用 `any`；外部資料要先驗證再使用
- 類別代碼、顏色、名稱只定義在 `src/data/categories.ts` 這一個地方
- 每個頁面都要處理載入中、沒有資料、錯誤、成功四種狀態
- 表單錯誤顯示在欄位下方，並寫出怎麼修正
- 可以點的元素至少 44×44px；注意 iPhone safe area
- 驗證邏輯（`src/lib/validation.ts`）和照片處理（`src/lib/image.ts`）要有單元測試

## 安全與隱私規則（不可為了趕進度而跳過）

- 上傳的照片**一律**經過 canvas 重新輸出成 JPEG，移除 EXIF/GPS；長邊 ≤ 1280px；最多 3 張；原始檔 ≤ 10MB；只接受 JPG/PNG/HEIC
- 禁止 `dangerouslySetInnerHTML`、`eval`、`innerHTML` 寫入使用者內容
- 不收集姓名、電話、email 或其他個人資料
- 不從外部 CDN 載入程式；只允許向 OSM 圖磚網域請求圖片
- 保留 OSM 來源標示「© OpenStreetMap contributors」
- 不在程式碼中放任何金鑰；`.env*` 列入 `.gitignore`（`.env.example` 除外）
- 不新增會把使用者資料送到第三方的服務（分析、追蹤、廣告），除非使用者明確同意
- 輸入驗證：類別必須是 6 種之一；說明 ≤ 200 字；座標必須在台灣範圍內（緯度 21.5–26.6、經度 117.8–122.4，且不在中國大陸陸地上，使用 `isInTaiwan()`）；時間不能是未來，也不能早於 30 天前
