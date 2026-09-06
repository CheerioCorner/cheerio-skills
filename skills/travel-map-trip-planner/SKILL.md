---
name: travel-map-trip-planner
description: >-
  規劃 Cheerio 旅遊地圖的旅程與行程項目——建立新旅程（複製範本、設定目的地/日期/
  狀態）、幫某趟旅程排入景點/餐廳/住宿/交通/知識筆記（含候選/待確認）。使用者
  不需要講「新增旅程」「行程項目」這種術語，只要是在規劃某一趟具體的旅行都算，
  例如「我要去日本玩五天，幫我排一下」「這次去泰國還沒定住哪」「這個週末想去
  台東走走」「幫這趟加一個景點」「我要排一趟去 XX 的行程」。這是唯一負責寫入
  旅程與行程項目的 skill。要查詢既有資料用 travel-map-query；要新增/修改地方誌
  或見聞錄本身用 travel-map-knowledge-capture；旅程結束的心得回饋用
  travel-map-trip-feedback。
---

# Travel Map Trip Planner

建立旅程、排入行程項目。**唯一負責寫入旅程／行程項目的 skill。**

## 何時改用其他 skill
- 只是要「看/查」旅程或行程 → `travel-map-query`
- 要「新增/修改地方誌或見聞錄」本身 → `travel-map-knowledge-capture`
- 要「旅程完成、整理心得」→ `travel-map-trip-feedback`
- 要「排動線」（一批候選點怎麼串成順暢行程）→ `travel-map-route`，排好後再回來這裡實際建立
- 要「出行前包」→ `travel-map-briefing`

## 開工前必讀

`travel-map-query/schemas/travel_map_schema.yaml`（另一個 skill 目錄下）—— data source ID、屬性名稱、`example_trip_page` 位置、`known_limitations` 都在這裡，不要憑記憶編。

`assets/example-trip-page.md`（本 skill 目錄下）—— 平常複製 Notion 頁面不需要用到這份檔案，但它是 `example_trip_page` 正文排版（即時匯率/待辦/點子收集箱/行程項目三欄兩欄配置）的原始碼備份，該頁遺失時靠這份重建，也是唯一寫下「這個版面長什麼樣」的地方。

## 流程

### 1. 建立新旅程
1. 用 `notion-duplicate-page` 複製 schema 裡的 `example_trip_page`（不要從零建立，範本已經帶好即時匯率/待辦/點子收集箱/內嵌行程項目 Data Table 的版面）
2. 改新頁面的：標題（旅程名稱）、狀態、日期區間、目的地（關聯地方誌，可複選——多城市/多國行程直接勾多筆）、**同行者組合**、匯率 embed 的幣別
   - `同行者組合` 決定這趟要套哪些飲食限制。排餐廳前先讀這欄，再對照 `travel-map-page-content/references/dining-profile.md`——一個人出差跟帶全家出國該推的餐廳不一樣
   - 目的地要用 `travel-map-query` 先確認地方誌裡有沒有對應條目；沒有就先用 `travel-map-knowledge-capture` 建立
3. **⚠️ 必須手動修正**：新頁面裡「行程項目（本趟）」內嵌連結檢視的篩選還指向被複製的舊旅程頁面，要改成指向新頁面自己（打開檢視的篩選設定，把「所屬旅程」的值換掉）。這是 Notion API 目前做不到的自動化，忘記做的話新旅程會顯示舊旅程的行程項目或空白。
4. 待辦事項、點子收集箱依實際狀況填寫

### 2. 幫旅程加一筆行程項目
1. 建立行程項目記錄，「所屬旅程」必填
2. 優先關聯「相關見聞錄」而不是只寫「地點備用」文字——用 `travel-map-query` 先查有沒有對應的見聞錄條目，沒有就用 `travel-map-knowledge-capture` 先建立一筆
3. 沒有對應見聞錄條目的臨時項目（機場報到、轉機等），才用「地點備用」文字欄
4. `狀態` 先查目前實際選項再填（見 schema 的 known_limitations，可能還是 Notion 預設的三段式，不是設計提案裡的候選/待確認/已預訂/已完成）

## 規則
- **排餐廳前先看 `同行者組合` ＋ 見聞錄的 `飲食適配`**。有人吃素或不吃牛卻只排了牛肉專門店，是這個系統最該避免的失敗
- 見聞錄的 `飲食適配` 還是 `❓ 待確認菜單` 就先別排進確定行程，請 `travel-map-page-content` 補查
- 見聞錄的 `所屬地方誌` 還掛在「📥 待分類（Inbox 佔位）」的，先請使用者確認真正地方誌、`travel-map-knowledge-capture` 改好關聯，再排進行程——佔位條目底下的項目代表連城市都還沒確定，不該出現在確定行程裡
- 不要自己編見聞錄的內容細節（地址、營業時間等）——那是 `travel-map-page-content` 的職責，這裡只負責建立關聯
- 不確定目的地/見聞錄是否已存在，先查再建，避免重複條目

## 相關 Skills
- `travel-map-query` — 查詢既有資料
- `travel-map-knowledge-capture` — 地方誌／見聞錄的寫入
- `travel-map-trip-feedback` — 旅程完成回饋
- `travel-map-page-content` — 頁面內容查證與撰寫
- `travel-map-route` — 動線規劃，排好後交給本 skill 寫入
- `travel-map-briefing` — 行程確定後產出離線行前包
- `notion-cli` — Notion CLI 命令參考
