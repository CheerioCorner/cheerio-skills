---
name: notion-to-raw
description: >-
  從 Notion 花園抓取頁面內容，進行研究或建立 raw 來源。
  當使用者提到「花園裡那篇 X 要深入研究」、「從 Notion 研究」、
  「Notion ingest」、提供 Notion URL 要求處理時使用此 skill。
argument-hint: <Notion page URL 或花園種子名稱>
---

# Notion to Raw

從 Notion 知識花園抓取頁面內容，根據需求進行閱讀、研究、或建立 raw 來源。

## 前置條件

- MCP `notionApi` 伺服器可用
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

**情況 B：提供種子名稱**
1. 讀取本地花園 manifest（如 `wiki/entities/knowledge-garden.md`）
2. 在表格中搜尋匹配的種子名稱
3. 取得對應的 Notion Link → 提取 Page ID

**情況 C：不確定是哪一篇**
1. 讀取花園 manifest
2. 列出所有種子，讓使用者選擇

#### Step 2：抓取 Notion 頁面內容

使用 MCP `notionApi` 抓取頁面 markdown：

```
mcp({ tool: "notionApi_API-retrieve-page-markdown", args: { page_id: "<page-id>" } })
```

**注意：** 如果遇到 404，表示頁面尚未共享給 CheerioPi。

### Phase 2：呈現 + 問下一步

#### Step 3：摘要呈現

讀取完內容後，向使用者報告摘要，並問下一步：

```
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

如果使用者選 B：

#### Step 4：建立 Raw 檔案

在 `raw/web/` 建立來源檔案：

**檔名格式：** `raw/web/<YYYY-MM-DD>-<slug>.md`

**Frontmatter 格式：**
```yaml
---
title: "<Notion 頁面標題>"
source: "<Notion URL>"
source_type: notion
source_id: "<page-id>"
created: <YYYY-MM-DD>
fetched_at: <YYYY-MM-DD>
description: "<頁面摘要>"
tags:
  - "notion"
  - "clippings"
immutable: true
---
```

#### Step 5：提示後續

告訴使用者：
```
✅ 已建立 raw 來源：raw/web/<filename>.md
📌 下一步：用 wiki-knowledge skill 進行 wiki ingest
```

### Phase 3c：Deep Research

如果使用者選 C：

1. 分析頁面中的引用 URL
2. 抓取引用內容（web_fetch / web_search）
3. 整合後問使用者是否要寫進 raw

## 錯誤處理

| 錯誤 | 原因 | 解決方式 |
|------|------|---------|
| 404 | 頁面未共享給 CheerioPi | 請人類在 Notion 中連接 CheerioPi |
| MCP 連線失敗 | notionApi 伺服器未啟動 | 連接 MCP 伺服器 |

## 相關 Skills

- `wiki-knowledge` — 後續的 wiki ingest 流程
- `knowledge-garden` — 花園維護（wiki → Notion 方向）
- `notion-cli` — Notion CLI 命令參考
