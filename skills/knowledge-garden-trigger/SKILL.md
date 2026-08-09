---
name: knowledge-garden-trigger
description: >-
  偵測 Notion 知識花園的觸發條件，並執行有條件的回流（Notion↔wiki）。
  觸發條件：💡 靈感標籤、「給我的啟發？」更新、專題需要深化、知識過期、人類主動指定。
  當使用者說「有新靈感」、「這個需要深入研究」、「花園裡那篇 X 要更新」時使用。
---

# Knowledge Garden Trigger

偵測 Notion 知識花園的觸發條件，並執行有條件的回流。

## 核心理念

> **不是所有 Notion 頁面都回流。** 只有在有價值或需要深度研究時才觸發。
> 避免無意義的同步噪音。

## 觸發條件

| 條件 | 說明 | 動作 |
|------|------|------|
| 💡 靈感標籤 | 種子/專題被標記 💡 靈感 | 觸發回流 |
| 啟發更新 | 「給我的啟發？」欄位有新內容 | 評估是否需要深入研究 |
| 專題深化 | 專題報告需要更多種子來完善 | 尋找新的相關種子 |
| 知識過期 | 種子內容需要更新（最後更新 > 14 天） | 重新抓取來源、更新內容 |
| 人類主動指定 | 「花園裡那篇 X 要深入研究」 | 直接触發 |

---

## 流程

### Phase 1：偵測（自動/手動）

```bash
# 查詢 💡 靈感標籤的種子
ntn api v1/data_sources/0785b58a-9976-4163-85be-6854410b6563/query -d '{
  "filter": {
    "property": "Tags",
    "multi_select": { "contains": "💡 靈感" }
  }
}'

# 查詢 Sync Status 為「⏳ 待同步」的種子
ntn api v1/data_sources/0785b58a-9976-4163-85be-6854410b6563/query -d '{
  "filter": {
    "property": "Sync Status",
    "select": { "equals": "⏳ 待同步" }
  }
}'
```

### Phase 2：評估（決定方向）

對於每個觸發的種子/專題：

1. 讀取 Notion 頁面內容（MCP `notionApi_API-retrieve-page-markdown`）
2. 讀取對應的 wiki 頁面（如果有）
3. 比對兩者的內容
4. 決定動作：

| 情境 | 方向 | 動作 |
|------|------|------|
| Notion 有新觀點 | Notion → wiki | 觸發回流 |
| Wiki 內容更完整 | Wiki → Notion | 回寫到 Notion |
| 兩邊都需要更新 | 雙向同步 | 先比對，再決定方向 |
| 知識過期 | 重新研究 | web_search → 整合 → 更新兩邊 |
| 不需要同步 | — | 更新 Sync Status 為「✅ 已同步」 |

### Phase 3：執行

#### 路徑 A：Notion → wiki（回流）

1. 使用 `notion-to-raw` skill 抓取 Notion 頁面 → `raw/web/`
2. 使用 `wiki-ingest` skill 進行 wiki ingest
3. 更新 wiki 頁面的 frontmatter（updated 日期、sources 數量）
4. 更新 `wiki/index.md` 和 `wiki/log.md`
5. 更新 Notion Sync Status 為「✅ 已同步」

#### 路徑 B：Wiki → Notion（回寫）

1. 使用 `notion-page-content` skill 產生頁面內容
2. 使用 ntn CLI 寫入 Notion 頁面
3. 更新 Notion Sync Status 為「✅ 已同步」

#### 路徑 C：深入研究（知識過期/人類指定）

1. 使用 `notion-to-raw` skill 抓取 Notion 頁面
2. 分析頁面中的引用 URL
3. 使用 web_fetch / web_search 搜尋更多資料
4. 整合研究結果
5. 使用 `notion-page-content` skill 更新頁面內容
6. 同步更新 wiki（如有重大變化）
7. 更新 Notion Sync Status 為「✅ 已同步」

### Phase 4：回報

向人類報告：
- 檢查了哪些種子/專題
- 發現了什麼差異
- 做了什麼回流
- 是否需要人類確認

---

## 使用範例

### 範例 1：💡 靈感觸發回流
```
系統發現：Omnigent 種子被標記 💡 靈感
→ 讀取 Notion 頁面：有新啟發「Meta-harness 跟 Pi 的 subagent 系統有直接關聯」
→ 讀取 wiki 頁面：沒有這個關聯
→ 決定：需要深入研究，觸發回流
→ notion-to-raw：抓取 Omnigent 頁面 → raw/web/2026-08-08-omnigent-update.md
→ wiki-ingest：ingest → 更新 wiki/entities/omnigent.md
→ 回報：已將 Omnigent 的新啟發回流到 wiki
```

### 範例 2：知識過期回流
```
系統發現：mattpocock/skills 的最後更新是 2026-07-29（已過期 10 天）
→ 讀取 Notion 頁面：內容仍為基本介紹
→ 讀取 wiki 頁面：有更詳細的分析
→ 決定：wiki 內容更完整，回寫到 Notion
→ notion-page-content：產生完整知識卡片
→ ntn pages update：寫入 Notion 頁面
→ 回報：已將 wiki 的完整分析回寫到 Notion
```

### 範例 3：人類主動指定
```
使用者：花園裡那篇 OKF 要深入研究
→ 讀取 Notion OKF 頁面
→ 讀取 wiki OKF 頁面
→ 發現 Notion 有新的 OKF 應用案例
→ 觸發回流：notion-to-raw → wiki-ingest
→ 回報：已將 OKF 的新應用案例回流到 wiki
```

---

## 避免迴圈

- 使用 Sync Status 追蹤同步狀態
- 同一個種子不要在短時間內重複研究
- 如果 Notion 和 wiki 有不同的觀點，保留兩邊的差異，標記為「待討論」

---

## 相關 Skills

- `knowledge-garden-to-raw` — Notion → raw 抓取
- `wiki-ingest` — Wiki ingest
- `knowledge-garden-page-content` — 頁面內容產生
- `knowledge-garden` — 花園維護
