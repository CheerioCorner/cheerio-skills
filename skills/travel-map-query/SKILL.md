---
name: travel-map-query
description: >-
  查詢 Cheerio 旅遊地圖既有資料——地方誌（洲/國家/城市或區域）、見聞錄（餐廳/景點/
  住宿/店家/主題筆記）、旅程、行程項目。回答「這裡有什麼推薦」「之前去過哪裡」
  「當地交通/簽證怎麼辦」「這趟旅程排了什麼」。唯讀，不新增/修改任何頁面或屬性。
  要新增/修改旅程或行程項目用 travel-map-trip-planner；要新增/修改地方誌或見聞錄
  用 travel-map-knowledge-capture；旅程結束的心得回饋用 travel-map-trip-feedback；
  要幫頁面查證寫內容用 travel-map-page-content。
---

# Travel Map Query

查地方誌/見聞錄/旅程/行程項目的既有資料並回答問題。**唯讀。**

## 何時改用其他 skill
- 要「新增/修改旅程、排行程項目」→ `travel-map-trip-planner`
- 要「新增/修改地方誌或見聞錄記錄」→ `travel-map-knowledge-capture`
- 要「旅程完成、整理心得寫回去」→ `travel-map-trip-feedback`
- 要「幫某頁查證/寫內容」→ `travel-map-page-content`

## 開工前必讀

`schemas/travel_map_schema.yaml`（本 skill 目錄下）—— 所有 data source ID、屬性名稱的 SSOT，其他 4 個 travel-map-* skill 都引用這份檔案，不要憑記憶編欄位名稱。**開工前也看一下檔案最下方的 `known_limitations`**，尤其 status 欄位選項還是 Notion 預設值這一點，會影響你怎麼解讀查詢結果。

`assets/hub-page.md`（本 skill 目錄下）—— 主頁正文排版的原始碼備份，純粹是萬一主頁遺失時的復原依據，日常查詢不會用到它。

## 流程

### 1. 查地方（哪裡能去、當地怎麼玩、交通/簽證）
1. 查地方誌，找到分類/洲/國家/城市或區域對應的條目
2. 沒有直接命中就往上一層查（例如查「大阪的交通」查不到，退而查「日本」的交通通則）
3. 用「關聯見聞錄」反查底下所有具體條目，依「類別」整理成餐廳/景點/住宿/店家
4. **讀正文，不要只看 Properties** —— 「蒐集資料」「親身驗證心得」兩區才是實際內容，Properties 只是篩選用的中繼資料
5. 被問到「哪裡好吃／推薦餐廳」時，一定要交叉比對 `飲食適配` 與該趟的 `同行者組合`，並讀 `travel-map-page-content/references/dining-profile.md`。只回「評價很好」而沒說「媽媽/女朋友能不能吃」，視為沒回答完
6. 被問到非英語系國家的地方時，把 `當地語言名稱` 一起附上（搜尋、給司機看都要用）
5. 查不到就老實說「地方誌/見聞錄裡還沒有這筆紀錄」，不要杜撰

### 2. 查旅程/行程
1. 查旅程的狀態、日期區間、目的地
2. 查某趟旅程底下排了什麼：查行程項目，filter「所屬旅程」= 該趟旅程
3. 狀態欄位目前可能還是 Notion 預設的「未開始/進行中/完成」三段（見 schema 的 known_limitations），不要假設已經是設計提案裡的五段式，回報時用查到的實際值

## 規則
- 只查 Properties 就回答視為查詢未完成
- 不確定的資訊要說明是從哪一頁查到的，方便使用者回頭核對

### 3. 查 Inbox 待分類清單
使用者問「還有哪些待分類」「Inbox 清一下」時，查見聞錄 `所屬地方誌` = 地方誌裡的
「📥 待分類（Inbox 佔位）」條目，或 `收集狀態` = `📥 待分類` 的見聞錄，列出來讓
使用者一次歸位。這批是 `travel-map-knowledge-capture` 的 Inbox 模式批次收進來、
還沒確定真正城市/國家的項目，正常查詢（流程 1/2）不會特別找到它們——它們掛在
一個佔位條目底下，不屬於任何真正的地方誌。

## 相關 Skills
- `travel-map-trip-planner` — 旅程與行程項目的寫入
- `travel-map-knowledge-capture` — 地方誌與見聞錄的寫入（含 Inbox 批次收集模式）
- `travel-map-trip-feedback` — 旅程完成回饋
- `travel-map-page-content` — 頁面內容查證與撰寫
- `notion-cli` — Notion CLI 命令參考
