---
name: gemini-notion-workflow
description: >-
  讓 Gemini 透過 agy 完整存取 Notion API、執行 ntn CLI、git 操作。
  規範 Gemini 如何使用 call_mcp_tool、run_command 等工具與 Notion 和 Git 互動。
  當需要讓 Gemini 執行 Notion 操作或 Git 同步時使用。
---

# Gemini Notion Workflow

讓 Gemini 透過 agy 完整存取 Notion API、執行 ntn CLI、git 操作。

## 前置條件

- agy 已安裝（`C:\Users\User\AppData\Local\agy\bin\agy.exe`）
- 呼叫方式一律透過 `chat-with-gemini` skill 執行，不要自己另開一套 `agy` 呼叫邏輯——本文件只負責提供「Gemini 在 Notion/Git 場景下該用哪些工具」的知識，實際啟動、等待、讀 log 全部是 `chat-with-gemini` 的職責（獨立 pane、run ID、`.pi/gemini-runs/<id>/output.log`）

## Gemini 可用的工具

### 1. 查詢 Notion API（call_mcp_tool）

```javascript
// Gemini 可以透過 agy 的 call_mcp_tool 工具呼叫 notionApi MCP
call_mcp_tool({
  name: "notionApi_API-query-data-source",
  arguments: {
    data_source_id: "0785b58a-9976-4163-85be-6854410b6563",
    page_size: 10
  }
})
```

**常用 MCP 工具：**
| 工具 | 用途 |
|------|------|
| `notionApi_API-retrieve-a-page` | 讀取頁面 Properties |
| `notionApi_API-retrieve-page-markdown` | 讀取頁面 Markdown 內容 |
| `notionApi_API-query-data-source` | 查詢 Database |
| `notionApi_API-post-search` | 搜尋 Notion |

### 2. 執行 ntn CLI（run_command）

```bash
# 讀取頁面
ntn pages get <page-id>

# 更新頁面內容
ntn pages update <page-id> --content '<markdown>'

# 更新 Properties
ntn api v1/pages/<page-id> -X PATCH -d '{"properties":{...}}'

# 查詢 Data Source
ntn api v1/data_sources/<id>/query -d '{}'

# 上傳檔案
ntn files create < image.png
```

### 3. Git 操作（run_command）

```bash
# 查看狀態
git status

# 新增並提交
git add -A && git commit -m "message"

# 推送
git push

# 拉取
git pull
```

### 4. 檔案操作

| 工具 | 用途 |
|------|------|
| `view_file` | 讀取檔案內容 |
| `write_to_file` | 寫入檔案 |
| `replace_file_content` | 替換檔案內容（精確區段） |
| `grep_search` | 搜尋檔案內容 |
| `list_dir` | 列出目錄 |
| `run_command` | 執行 shell 命令 |

## 執行方式

透過 `chat-with-gemini` 的標準流程呼叫（產生 run ID → 開 pane → 執行 → 讀 log → 寫 history），把下面的任務描述當 prompt 傳給它。**不要加 `--dangerously-skip-permissions`**——除非單一任務有明確、非做不可的理由需要跳過權限檢查（例如任務本身就要求無人值守跑一長串 Notion 寫入），且那是每次任務單獨評估的例外，不是預設行為。

## 工作流程範例

以下是傳給 `chat-with-gemini` 的 prompt 範例，不是 shell 指令：

### 範例 1：Gemini 查詢 Notion 並更新 wiki

```
請執行以下步驟：
1. 使用 call_mcp_tool 查詢 Notion Data Source 0785b58a-9976-4163-85be-6854410b6563 的所有種子
2. 讀取 C:/Cheerio/Obsidian/wiki/entities/knowledge-garden.md
3. 比對 Notion 實際狀態與 wiki 快取
4. 如果有差異，更新 wiki 快取
5. 使用 git commit + push 同步
```

### 範例 2：Gemini 執行 Notion Relation 修復

```
請修復 Notion 種子的 Relation：
- Omnigent (3b35979e-3a8c-8199-90ed-cf332d1fc175) 關聯到 Meta-Harness + AI Agent
- 使用 run_command 執行 ntn api v1/pages/... -X PATCH
```

### 範例 3：Gemini 產生 Lint 修復報告

```
請掃描 C:/Cheerio/Obsidian/wiki/ 目錄：
1. 找出所有 broken links
2. 找出 frontmatter 格式問題
3. 找出 source note 缺少 provenance 的頁面
4. 對可以直接修復的問題，執行修復
```

結果會依 `chat-with-gemini` 的慣例寫在 `.pi/gemini-runs/<id>/output.log`，不需要在 prompt 裡另外指定輸出路徑。

## 注意事項

- **權限**：預設不跳過權限檢查；只有單一任務有明確理由時才個別加 `--dangerously-skip-permissions`，且要能說出為什麼這次是安全的
- **Token 消耗**：Gemini 的 Context Window 很大，但長任務仍會消耗大量 token
- **錯誤處理**：如果 MCP 連線失敗，Gemini 應該回報錯誤而不是靜默失敗
- **Git 衝突**：多人同時操作時可能產生衝突，需要人工處理

## Pi vs Gemini 分工

這裡談的是「這個 Notion/Git 任務適合誰動手」的產能分工，不是知識品質判斷——知識庫寫入的品質把關一律走 `wiki-ingest`/`wiki-lint` 的雙模型共識機制（Pi 主持不投票，Claude+Gemini 各自提案），不是下面這種「誰主責」的單邊授權。

| 任務 | Pi | Gemini |
|------|-----|--------|
| 日常 Notion 操作 | ✅ 主要 | 可備援 |
| 大量資料掃描 | 可 | ✅ 主要（大 Context） |
| Notion 操作/Lint 掃描時提供第二意見 | 主持 | 透過 `wiki-lint`/`knowledge-garden` 的共識機制參與，不獨立下最終判斷 |
| Git push | ✅ 主要 | 可 |
| 複雜 Mermaid 圖 | ✅ | ✅ 更複雜的圖 |
| Notion API 查詢 | ✅ | ✅（透過 MCP） |
| ntn CLI 寫入 | ✅ | ✅（透過 run_command） |

## 相關 Skills

- `chat-with-gemini` — 實際呼叫 Gemini 的標準流程（run ID、pane、log）
- `notion-cli` — Notion CLI 命令參考
- `knowledge-garden` — 花園維護
- `knowledge-garden-trigger` — 研究觸發
- `wiki-ingest` / `wiki-lint` — wiki 操作
