# 面試系統 InterviewAI

企業級 AI 模擬面試訓練平台。使用者輸入應徵職位與職缺說明後，由 AI 自動生成面試題目、錄音作答，並由 AI 進行多維度評分與回饋；管理員則可透過後台管理使用者、調整評分參數、稽核所有面試紀錄。

## 功能特色

- **面試準備大廳**：輸入應徵職位、職缺說明（JD），AI 自動生成對應的面試題目
- **模擬面試作答**：錄音回答問題，語音自動轉逐字稿（OpenAI Whisper）
- **AI 智慧評分**：依技術符合度、邏輯清晰度、表達自信等維度評分，產出雷達圖與總評
- **面試表現報告**：檢視歷次面試紀錄、逐題逐字稿與 AI 評語
- **後台管理**：
  - 系統營運總覽（使用者數、面試數、平均分數、趨勢圖）
  - 使用者帳號與權限管理
  - AI 評分模型參數設定
  - 面試詳細稽核紀錄
  - 系統核心參數（題數、時限、評分權重等）

## 技術棧

- [Next.js 16](https://nextjs.org)（App Router + Turbopack）
- React 19 / TypeScript
- Tailwind CSS v4
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)（本地 SQLite 資料庫）
- [OpenAI API](https://platform.openai.com/)（題目生成 / 語音轉文字 / AI 評分）
- Recharts（雷達圖、趨勢圖表）

## 開始使用

### 1. 安裝套件

```bash
npm install
```

### 2. 設定環境變數

在專案根目錄建立 `.env.local`：

```bash
OPENAI_API_KEY_1=sk-xxxxxxxxxxxxxxxx
OPENAI_API_KEY_2=sk-xxxxxxxxxxxxxxxx   # 選填，用於 API Key 輪替
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 即可使用。首次啟動會自動建立 SQLite 資料庫（`interview.db`）並植入預設帳號。

### 預設測試帳號

| 角色 | Email | 密碼 |
|------|-------|------|
| 管理員 | admin@interviewai.com | admin123 |
| 一般使用者 | user@interviewai.com | user123 |

## 其他指令

```bash
npm run build   # 建置正式版
npm run start   # 啟動正式版伺服器
npm run lint    # 執行 ESLint 檢查
```

## 注意事項

本專案目前以功能展示 / 本機開發為主要用途，尚未針對正式上線環境做安全性強化（例如登入 session 機制、跨使用者存取權限檢查等），部署到公開環境前請先進行安全性審查。
