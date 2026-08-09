---
name: knowledge-garden-to-raw
description: >-
  從 Notion 花園抓取頁面內容，進行研究或建立 raw 來源。
  當使用者提到「花園裡那篇 X 要深入研究」、「從 Notion 研究」、
  「Notion ingest」、提供 Notion URL 要求處理時使用此 skill。
argument-hint: <Notion page URL 或花園種子名稱>
---

# Notion to Raw

從 Notion 知識花園抓取頁面內容，根據需求進行閱讀、研究、或建立 raw 來源。

## 前置條件

- MCP `notionApi` 伺服器可用（已設定於 `~/.pi/agent/mcp.json`）
- 知識庫位於 `C:/Cheerio/Obsidian/`
- Notion 頁面已共享給 **CheerioPi** integration

## 核心理念

Notion 頁面是一個「起點」，不是每次都需要寫進 raw。根據使用者需求，有三種路徑：

```
Notion 頁面
    │
    ├──→ 📖 只是看看（摘要 + 回答問題）
    │
    ├──→ 🔬 深入研究（抓引用 URL → 搜尋 → 整合）
    │         │
    │         └──→ 決定是否寫 raw
    │
    └──→ 📝 直接寫 raw → wiki ingest
```

## 流程

### Phase 1：取得內容（永遠先做）

#### Step 1：解析輸入

根據使用者輸入，取得 Notion Page ID：

**情況 A：提供 Notion URL**
```
https://www.notion.so/3ad5979e3a8c81528374f39d4c1216c0
→ Page ID: 3ad5979e-3a8c-8152-8374-f39d4c1216c0
```
Notion URL 格式：`https://www.notion.so/<page-id>`（32 hex，可能帶 dashes）

**情況 B：提供種子名稱**
1. 讀取 `wiki/entities/knowledge-garden.md`（花園 manifest）
2. 在表格中搜尋匹配的種子名稱
3. 取得對應的 Notion Link → 提取 Page ID

**情況 C：不確定是哪一篇**
1. 讀取 `wiki/entities/knowledge-garden.md`
2. 列出所有種子，讓使用者選擇

#### Step 2：抓取 Notion 頁面內容

使用 MCP `notionApi` 抓取頁面 markdown：

```
mcp({ tool: "notionApi_API-retrieve-page-markdown", args: { page_id: "<page-id>" } })
```

**注意：** 如果遇到 404 `object_not_found`，表示頁面尚未共享給 CheerioPi。請人類在 Notion 中將頁面連接到 CheerioPi（頁面 → `⋯` → Connections → 搜尋 CheerioPi → 加入）。

### Phase 2：呈現 + 問下一步

#### Step 3：摘要呈現

讀取完內容後，向使用者報告：

```
📄 <頁面標題>

<2-3 句摘要>

📋 內容結構：
- 章節 1：...
- 章節 2：...
- 引用的 URL：（如有）

---

你想要：
A) 就好，我了解了（結束）
B) 寫進 raw → 進 wiki
C) 從這裡繼續研究（抓引用 URL、搜尋更多資料）
```

### Phase 3a：只是看看（結束）

如果使用者選 A：
- 回答他們可能有的問題
- 不建立任何檔案
- 流程結束

### Phase 3b：寫進 Raw → Wiki

如果使用者選 B，執行 Step 4-5：

#### Step 4：建立 Raw 檔案

在 `raw/web/` 建立來源檔案：

**檔名格式：** `raw/web/<YYYY-MM-DD>-<slug>.md`

**Slug 規則：**
- 從頁面標題產生（小寫、空格→hyphen、移除非 ASCII）
- 長度限制 50 字元
- 加上日期前綴避免衝突

**Frontmatter 格式：**
```yaml
---
title: "<Notion 頁面標題>"
source: "<Notion URL>"
source_type: notion
source_id: "<page-id>"
author:
created: <YYYY-MM-DD>
fetched_at: <YYYY-MM-DD>
description: "<頁面第一段或摘要，限 200 字元>"
tags:
  - "notion"
  - "clippings"
published:
immutable: true
---
```

**正文：**
直接放入從 MCP 取得的 markdown 內容。

#### Step 5：同步本地 Manifest + 提示

1. **同步 manifest**（詳見 `knowledge-garden` skill §Manifest 自動同步）：
   - 在「最近更新紀錄」表格新增一行：`| <YYYY-MM-DD> | 從 Notion 抓取並建立 raw | <頁面標題> |`
   - 更新 frontmatter `updated` 為今天日期
2. 告訴使用者：
```
✅ 已建立 raw 來源：raw/web/<filename>.md
📌 下一步：用 wiki-knowledge skill 進行 wiki ingest
   說「存進大腦」或「ingest <檔名>」即可
```

### Phase 3c：Deep Research

如果使用者選 C，執行 Step 6-8：

#### Step 6：分析頁面中的引用

從 Notion 頁面內容中提取：
- 所有 URL/連結
- 提到的工具、專案、人物
- 需要驗證的 claim

#### Step 7：抓取引用內容

對每個重要的 URL：
```
web_fetch({ url: "<url>" })  // 本地 Ollama web fetch
// 或
web_search({ query: "<關鍵字>" })  // 本地 Ollama web search
```

#### Step 8：整合 + 決定下一步

將原始 Notion 內容 + 研究結果整合後，問使用者：

```
🔬 研究整合完成

<綜合摘要>

---

你想要：
A) 寫進 raw → 進 wiki（包含研究結果）
B) 就好，我了解了（結束）
C) 繼續研究（更多 URL / 搜尋）
```

若選 A → 執行 Step 4-5（但 raw 檔案會包含研究整合後的內容）

## 範例互動

### 範例 1：只是看看
```
使用者：花園裡那篇 Plannotator 要深入研究

→ 讀 manifest → 找到 Page ID
→ MCP 抓取頁面 markdown
→ 呈現摘要 + 問下一步
→ 使用者：就好，我了解了
→ 流程結束，不建立檔案
```

### 範例 2：直接寫 raw
```
使用者：花園裡那篇 NPM Publishing 要整理進 wiki

→ 讀 manifest → 找到 Page ID
→ MCP 抓取頁面 markdown
→ 呈現摘要 + 問下一步
→ 使用者：B，寫進 raw
→ 建立 raw/web/2026-08-05-npm-publishing-workflow.md
→ 提示 wiki-knowledge ingest
```

### 範例 3：Deep Research
```
使用者：花園裡那篇 meta-harness 要深入研究

→ 讀 manifest → 找到 Omnigent 頁面
→ MCP 抓取頁面 markdown
→ 呈現摘要（裡面提到幾個 URL 和論文）
→ 使用者：C，繼續研究
→ 抓取引用的 3 個 URL
→ 搜尋相關論文
→ 整合所有內容
→ 問：要寫進 raw 嗎？
→ 使用者：好
→ 建立包含研究結果的 raw 檔案
→ 提示 wiki-knowledge ingest
```

## 錯誤處理

| 錯誤 | 原因 | 解決方式 |
|------|------|---------|
| 404 `object_not_found` | 頁面未共享給 CheerioPi | 請人類在 Notion 中連接 CheerioPi |
| MCP 連線失敗 | notionApi 伺服器未啟動 | 執行 `mcp({ connect: "notionApi" })` |
| 找不到種子 | manifest 中無匹配記錄 | 列出所有種子讓使用者選擇，或要求提供 URL |
| web_fetch 失敗 | 目標網站封鎖或不存在 | 記錄失敗，繼續處理其他 URL |

## 規範引用

- 知識庫規範：`C:/Cheerio/Obsidian/AGENTS.md`
- Frontmatter：§4.2（必填 title, type, created, updated, sources, tags）
- 花園 manifest：`wiki/entities/knowledge-garden.md`
- 後續流程：`wiki-knowledge` skill（wiki ingest）

## 相關 Skills

- `wiki-ingest` — 後續的 wiki ingest 流程
- `knowledge-garden` — 花園維護（wiki → Notion 方向）
- `knowledge-garden-trigger` — 觸發偵測與回流
- `notion-cli` — Notion CLI 命令參考
