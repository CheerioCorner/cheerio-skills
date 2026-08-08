---
name: notion-page-content
description: >-
  根據 Notion Database 頁面的 Property 資訊，產生並寫入完整的頁面內容。
  適用於：種子頁面（完整知識卡片）、研究專題頁面（完整研究報告）。
  當使用者說「幫這個種子寫內容」、「更新專題報告」、「填入頁面內容」時使用。
---

# Notion Page Content Writer

根據 Notion Database 頁面的 Property 資訊，產生並寫入完整的頁面內容。

## 前置條件

- MCP `notionApi` 可用（讀取頁面 Property）
- `ntn` CLI 可用（寫入頁面內容）
- Notion 頁面已共享給 **CheerioPi** integration

## 核心理念

Notion Database 建立頁面後，AI 通常只會填入 Properties（標題、標籤等），但**不會寫入頁面內容（Block body）**。
本 Skill 補足這個缺口：根據 Properties 的資訊，自動產生完整的頁面內容。

## 兩種頁面類型

### 1. 種子頁面（完整知識卡片）

**觸發條件：** 使用者說「幫這個種子寫內容」、「更新種子頁面」等。

**頁面模板：**

```markdown
# 🌱 [種子名稱] — 一句話描述

## 這是什麼？
[概念的完整定義，2-3 句話。根據「給我的啟發？」和 Tags 推斷。]

## 核心原理
[這個概念背後的原理是什麼？為什麼它有效？]

## 運作機制
[它是怎麼運作的？步驟或流程是什麼？]

## 關鍵組成
[它由哪些部分組成？各部分的關係是什麼？]

## 💡 我的啟發
[從「給我的啟發？」Property 提取，並擴展]

## 🔗 連結
- 原始來源：[來源 URL]
- Wiki 頁面：[Wiki Path]
- 相關專題：[研究專題 Relation]
```

**流程：**

1. 使用 MCP 讀取頁面 Properties：
   ```
   notionApi_API-retrieve-a-page → 取得所有 Properties
   ```
2. 根據 Properties 推斷頁面內容：
   - `種子` (Title) → 頁面標題
   - `成長狀態` → 決定內容深度（🌱 簡短 / 🌿 中等 / 🌳 完整）
   - `Tags` → 推斷主題領域
   - `給我的啟發？` → 核心內容基礎
   - `來源 URL` → 抓取原始來源內容
   - `研究專題` → 關聯上下文
3. 產生 Markdown 內容
4. 使用 ntn CLI 寫入頁面：
   ```bash
   ntn pages update <page-id> --content '<markdown>'
   ```

### 2. 研究專題頁面（完整研究報告）

**觸發條件：** 使用者說「更新專題報告」、「幫專題寫內容」等。

**頁面模板：**

```markdown
# 🔬 [專題名稱]

## 研究問題
[從「研究問題」Property 提取]

## 研究範圍
[涉及哪些領域？邊界在哪裡？]

## 目前已知
[綜合所有相關種子的知識，描述目前的認知狀態]

## 種子地圖
[列出所有相關種子，以及它們之間的關聯]
| 種子 | 成長狀態 | 主要貢獻 |
|------|---------|---------|
| ... | ... | ... |

## 研究進展
### 📋 立案階段
- [ ] 確定研究問題
- [ ] 盤點相關種子

### 🔬 研究階段
- [ ] 各種子的貢獻...

### 📚 結案階段
- [ ] 整理核心發現
- [ ] 決定哪些知識要灌溉成 🌳

## 💡 關鍵洞察
[這個專題最重要的發現是什麼？]

## 🔗 連結
- 相關種子：[links]
- Wiki Topic：[Wiki Link]
```

**流程：**

1. 使用 MCP 讀取專題頁面 Properties
2. 查詢所有相關種子（透過 Relation）：
   ```
   notionApi_API-query-data-source → 篩選研究專題 = 此專題
   ```
3. 讀取每顆種子的 Properties 和頁面內容
4. 綜合產生研究報告
5. 使用 ntn CLI 寫入頁面

## 使用範例

### 範例 1：幫 Plannotator 種子寫內容
```
使用者：幫 Plannotator 種子寫內容

→ MCP 讀取 Plannotator Properties
→ 看到：🌿 成長期、Tags: 🛠️實作+🔬研究、啟發: "Shared Event API 設計優秀..."
→ 抓取來源 URL: https://github.com/backnotprop/plannotator
→ 產生完整知識卡片 Markdown
→ ntn pages update <page-id> --content '<markdown>'
→ 完成
```

### 範例 2：更新 AI Agent 架構研究專題報告
```
使用者：更新 AI Agent 架構研究的專題報告

→ MCP 讀取專題 Properties
→ 查詢相關種子：Plannotator, Omnigent, mattpocock/skills, OpenCodeReview
→ 讀取每顆種子的內容
→ 綜合產生研究報告
→ ntn pages update <page-id> --content '<markdown>'
→ 完成
```

## 注意事項

- **內容深度隨成長階段調整**：🌱 種子期只寫基本定義；🌿 成長期加入比較分析；🌳 成熟期寫完整知識體系
- **不要覆寫人類手動寫的內容**：先讀取現有頁面內容，如果已有豐富內容，只補充不足的部分
- **來源 URL 抓取失敗時**：跳過「運作機制」章節，其他章節根據已有資訊填寫
- **每次寫入後**：更新 Sync Status 為「✅ 已同步」

## 相關 Skills

- `knowledge-garden` — 花園維護（wiki → Notion 方向）
- `notion-to-raw` — Notion → raw 抓取（反向流程）
- `notion-cli` — Notion CLI 命令參考
