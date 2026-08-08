---
name: notion-wiki-feedback
description: >-
  當 Notion 知識花園的內容需要回流到 wiki 大腦時，執行有條件的回流機制。
  不是所有 Notion 頁面都回流，只在有價值或需要深度研究時才觸發。
  觸發條件：💡 靈感、啟發更新、專題深化、知識過期、人類主動指定。
---

# Notion → Wiki 回流機制

當 Notion 知識花園的內容需要回流到 wiki 大腦時，執行有條件的回流。

## 核心理念

> **知識是會改變的、成長的、過期的。**
> Notion 花園不只是成品展示廳，它是一個活的知識有機體。
> 當知識在花園裡長大、變化、或需要更深研究時，它應該能夠回流到大腦。

## ⚠️ 重要：不是所有頁面都回流

回流是有條件的。只有在以下情況才觸發：

| 觸發條件 | 說明 | 優先度 |
|----------|------|--------|
| 💡 靈感標籤 | 人類在 Notion 標記某個種子/專題有新啟發 | 🔴 高 |
| 「給我的啟發？」更新 | 種子的啟發欄位有新內容 | 🔴 高 |
| 專題需要深化 | 專題報告需要更多種子來完善 | 🟡 中 |
| 知識過期 | 種子的內容需要更新（知識是會過期的） | 🟡 中 |
| 人類主動指定 | 「花園裡那篇 X 要深入研究」 | 🔴 高 |

## 回流流程

```
Notion 知識花園
    │
    ├── 觸發條件檢測
    │   ├── 💡 靈感標籤？
    │   ├── 啟發更新？
    │   ├── 專題需要深化？
    │   ├── 知識過期？
    │   └── 人類指定？
    │
    ├── 評估是否需要回流
    │   ├── 不需要 → 結束
    │   ├── 輕微更新 → 直接更新 Notion
    │   └── 深入研究 → 觸發回流
    │
    ├── 執行回流
    │   ├── notion-to-raw：抓取 Notion 頁面 → raw/
    │   ├── wiki-knowledge：ingest raw → wiki/
    │   └── 更新 Notion Sync Status
    │
    └── 回報結果
```

### Step 1：觸發條件檢測

**自動檢測（cron / 手動觸發）：**

```bash
# 查詢 💡 靈感標籤的種子
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

### Step 2：評估是否需要回流

對於每個觸發的種子/專題：
1. 讀取 Notion 頁面內容
2. 讀取對應的 wiki 頁面（如果有）
3. 比對兩者的內容
4. 決定動作：
   - **不需要回流** → 內容一致，更新 Sync Status 為「✅ 已同步」
   - **Notion 需要更新** → 內容有誤，從 wiki 回寫到 Notion
   - **需要深入研究** → Notion 有新觀點，回流到 wiki 進行更深入的研究

### Step 3：執行回流

**回流到 wiki：**
1. 使用 `notion-to-raw` skill 抓取 Notion 頁面 → `raw/notion/`
2. 使用 `wiki-knowledge` skill 進行 wiki ingest
3. 更新 wiki 頁面的 frontmatter（updated 日期、sources 數量）
4. 更新 `wiki/index.md` 和 `wiki/log.md`
5. 更新 Notion Sync Status 為「✅ 已同步」

**回寫到 Notion：**
1. 如果 wiki 內容比 Notion 更完整
2. 使用 `notion-page-content` skill 產生頁面內容
3. 使用 ntn CLI 寫入 Notion 頁面
4. 更新 Notion Sync Status 為「✅ 已同步」

### Step 4：回報結果

向人類報告：
- 檢查了哪些種子/專題
- 發現了什麼差異
- 做了什麼回流
- 是否需要人類確認

## 使用範例

### 範例 1：💡 靈感觸發回流
```
系統發現：Omnigent 種子被標記 💡 靈感
→ 讀取 Notion 頁面：有新啟發「Meta-harness 跟 Pi 的 subagent 系統有直接關聯」
→ 讀取 wiki 頁面：沒有這個關聯
→ 決定：需要深入研究，觸發回流
→ notion-to-raw：抓取 Omnigent 頁面 → raw/notion/2026-08-08-omnigent-update.md
→ wiki-knowledge：ingest → 更新 wiki/entities/omnigent.md
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
→ 觸發回流：notion-to-raw → wiki-knowledge ingest
→ 回報：已將 OKF 的新應用案例回流到 wiki
```

## 回流方向矩陣

| 情境 | 方向 | 工具 |
|------|------|------|
| Notion 有新觀點 | Notion → wiki | notion-to-raw + wiki-knowledge |
| Wiki 內容更完整 | Wiki → Notion | notion-page-content + ntn CLI |
| 兩邊都需要更新 | 雙向同步 | 先比對，再決定方向 |
| 知識過期 | 重新研究 | web_search → 整合 → 更新兩邊 |

## 注意事項

- **避免迴圈**：不要讓 Notion → wiki → Notion 的流程無限循環。使用 Sync Status 追蹤同步狀態
- **保留差異**：如果 Notion 和 wiki 有不同的觀點，保留兩邊的差異，標記為「待討論」
- **尊重人類**：回流後要回報結果，讓人類知道發生了什麼

## 相關 Skills

- `notion-to-raw` — Notion → raw 抓取
- `wiki-knowledge` — Wiki ingest
- `notion-page-content` — 頁面內容產生
- `knowledge-garden-trigger` — 研究觸發
- `knowledge-garden` — 花園維護
