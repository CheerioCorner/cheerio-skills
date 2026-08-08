---
name: knowledge-garden-trigger
description: >-
  當 Notion 知識花園有新啟發、靈感、或需要深度研究時，自動觸發研究流程。
  觸發條件：💡 靈感標籤、「給我的啟發？」更新、專題需要深化、知識過期、人類主動指定。
  當使用者說「有新靈感」、「這個需要深入研究」、「花園裡那篇 X 要更新」時使用。
---

# Knowledge Garden Trigger

當 Notion 知識花園有新啟發或需要深度研究時，自動觸發研究流程。

## 觸發條件

| 條件 | 說明 | 動作 |
|------|------|------|
| 💡 靈感標籤 | 種子/專題被標記 💡 靈感 | 觸發 notion-to-raw → wiki ingest |
| 啟發更新 | 「給我的啟發？」欄位有新內容 | 評估是否需要深入研究 |
| 專題深化 | 專題報告需要更多種子來完善 | 尋找新的相關種子 |
| 知識過期 | 種子內容需要更新 | 重新抓取來源、更新內容 |
| 人類主動指定 | 「花園裡那篇 X 要深入研究」 | 直接触發研究流程 |

## 流程

### 1. 檢查觸發條件

**自動檢查（cron / 手動觸發）：**
```bash
# 查詢所有 💡 靈感標籤的種子
ntn api v1/data_sources/0785b58a-9976-4163-85be-6854410b6563/query -d '{
  "filter": {
    "property": "Tags",
    "multi_select": {
      "contains": "💡 靈感"
    }
  }
}'

# 查詢 Sync Status 為「⏳ 待同步」的種子
ntn api v1/data_sources/0785b58a-9976-4163-85be-6854410b6563/query -d '{
  "filter": {
    "property": "Sync Status",
    "select": {
      "equals": "⏳ 待同步"
    }
  }
}'
```

### 2. 評估是否需要研究

對於每個觸發的種子/專題：
1. 讀取現有內容（MCP `notionApi_API-retrieve-page-markdown`）
2. 評估：
   - 內容是否足夠完整？
   - 來源是否有更新？
   - 是否需要補充新的觀點？
3. 決定動作：
   - **不需要研究** → 更新 Sync Status 為「✅ 已同步」
   - **需要輕微更新** → 使用 `notion-page-content` skill 補充
   - **需要深入研究** → 觸發完整研究流程

### 3. 執行研究

**深入研究流程：**
1. 使用 `notion-to-raw` skill 抓取 Notion 頁面內容
2. 分析頁面中的引用 URL
3. 使用 web_fetch / web_search 搜尋更多資料
4. 整合研究結果
5. 使用 `notion-page-content` skill 更新頁面內容
6. 更新 Sync Status 為「✅ 已同步」
7. 如果內容有重大變化，同步更新 wiki（notion-to-raw → wiki ingest）

### 4. 回報結果

向人類報告：
- 檢查了哪些種子/專題
- 發現了什麼
- 做了什麼更新
- 是否需要人類確認

## 範例互動

### 範例 1：💡 靈感標籤觸發
```
系統發現：Omnigent 種子被標記 💡 靈感

→ 讀取 Omnigent 頁面內容
→ 發現「給我的啟發？」有新內容：「Meta-harness 跟 Pi 的 subagent 系統有直接關聯」
→ 評估：需要深入研究 Meta-harness 與 Pi 的關聯
→ 觸發 notion-to-raw：抓取 Omnigent 頁面
→ 深入研究：搜尋 Meta-harness + Pi integration
→ 更新 Omnigent 頁面內容
→ 同步更新 wiki/entities/omnigent.md
→ 回報：已更新 Omnigent 種子，新增了與 Pi 的關聯分析
```

### 範例 2：人類主動指定
```
使用者：花園裡那篇 mattpocock/skills 要深入研究

→ 讀取 mattpocock/skills 頁面
→ 發現目前只有基本介紹
→ 觸發深入研究：抓取 GitHub README、搜尋相關文章
→ 產生完整知識卡片
→ 更新 Notion 頁面
→ 回報：已完成 mattpocock/skills 深度研究
```

## 注意事項

- **不要過度觸發**：同一個種子不要在短時間內重複研究
- **尊重人類節奏**：💡 靈感標籤不一定要立即處理，可以累積後批次處理
- **保持 Sync Status 同步**：每次更新後都要更新 Sync Status

## 相關 Skills

- `notion-to-raw` — Notion → raw 抓取
- `notion-page-content` — 頁面內容產生
- `knowledge-garden` — 花園維護
- `wiki-knowledge` — Wiki ingest
