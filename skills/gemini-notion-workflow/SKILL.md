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
- `--dangerously-skip-permissions` 參數（允許所有工具）
- `--add-dir C:/Cheerio/Obsidian`（載入 wiki 目錄）

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

### 基本呼叫格式

```bash
agy -p "你的任務描述" \
  --add-dir C:/Cheerio/Obsidian \
  --add-dir C:/Users/User/.agents/skills \
  --dangerously-skip-permissions \
  --output-format stream-json
```

### 帶入上下文的呼叫

```bash
agy -p "請讀取 C:/Cheerio/Obsidian/wiki/entities/knowledge-garden.md，然後執行以下任務：...（任務描述）" \
  --add-dir C:/Cheerio/Obsidian \
  --dangerously-skip-permissions \
  --output-format stream-json
```

## 工作流程範例

### 範例 1：Gemini 查詢 Notion 並更新 wiki

```bash
agy -p "請執行以下步驟：
1. 使用 call_mcp_tool 查詢 Notion Data Source 0785b58a-9976-4163-85be-6854410b6563 的所有種子
2. 讀取 C:/Cheerio/Obsidian/wiki/entities/knowledge-garden.md
3. 比對 Notion 實際狀態與 wiki 快取
4. 如果有差異，更新 wiki 快取
5. 使用 git commit + push 同步" \
  --add-dir C:/Cheerio/Obsidian \
  --dangerously-skip-permissions \
  --output-format stream-json
```

### 範例 2：Gemini 執行 Notion Relation 修復

```bash
agy -p "請修復 Notion 種子的 Relation：
- Omnigent (3b35979e-3a8c-8199-90ed-cf332d1fc175) 關聯到 Meta-Harness + AI Agent
- 使用 run_command 執行 ntn api v1/pages/... -X PATCH" \
  --add-dir C:/Cheerio/Obsidian \
  --dangerously-skip-permissions \
  --output-format stream-json
```

### 範例 3：Gemini 產生病修復報告

```bash
agy -p "請掃描 C:/Cheerio/Obsidian/wiki/ 目錄：
1. 找出所有 broken links
2. 找出 frontmatter 格式問題
3. 找出 source note 缺少 provenance 的頁面
4. 將結果寫到 C:/Cheerio/pi/.pi/gemini-runs/wiki-lint-report.md
5. 對可以直接修復的問題，執行修復" \
  --add-dir C:/Cheerio/Obsidian \
  --dangerously-skip-permissions \
  --output-format stream-json
```

## 注意事項

- **安全**：`--dangerously-skip-permissions` 會跳過所有權限檢查，僅在受控環境使用
- **Token 消耗**：Gemini 的 Context Window 很大，但長任務仍會消耗大量 token
- **错误處理**：如果 MCP 連線失敗，Gemini 應該回報錯誤而不是靜默失敗
- **Git 衝突**：多人同時操作時可能產生衝突，需要人工處理

## Pi vs Gemini 分工

| 任務 | Pi | Gemini |
|------|-----|--------|
| 日常 Notion 操作 | ✅ 主要 | 可備援 |
| 大量資料掃描 | 可 | ✅ 主要（大 Context） |
| 深度 Lint | 可 | ✅ 主要 |
| Git push | ✅ 主要 | 可 |
| 複雜 Mermaid 圖 | ✅ | ✅ 更複雜的圖 |
| Notion API 查詢 | ✅ | ✅（透過 MCP） |
| ntn CLI 寫入 | ✅ | ✅（透過 run_command） |

## 相關 Skills

- `notion-cli` — Notion CLI 命令參考
- `knowledge-garden` — 花園維護
- `knowledge-garden-trigger` — 研究觸發
- `wiki-knowledge` — Wiki 操作
