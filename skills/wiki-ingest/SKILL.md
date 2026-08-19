---
name: wiki-ingest
description: >-
  從 raw/ 資料建立或更新 wiki 頁面。實作 ingest 流程：讀 raw → 建/更新 wiki 頁面 → 更新 index/log。
  當使用者提到「存到 wiki」、「ingest」、「處理這個」、「存進大腦」時使用。
---

# Wiki Ingest

從 `raw/` 資料建立或更新 wiki 頁面。

## 前置動作

```bash
cd C:/Cheerio/Obsidian/
git pull           # 確保拿到最新版
```

然後讀取 `AGENTS.md` 確認最新的工作規範。

---

## 流程

### 1. 讀取來源

從 `raw/` 讀取新檔案：
- **文字檔案**：一次讀完
- **圖片**：分批讀取
- **PDF 檔案**：使用 `wiki-ingest-pdf` skill（`markitdown` 轉 Markdown + `pymupdf` 提取圖片）

**掃描關聯想法：** 讀完來源後，搜尋 `raw/conversations/` 中引用本來源的想法檔：

```bash
# Windows (Git Bash / PowerShell with grep)
grep -rl "related_raw:.*<RAW_SLUG>" raw/conversations/*.md 2>/dev/null
# 若 grep 不可用，用 PowerShell:
# Get-ChildItem raw/conversations/*.md | Select-String -Pattern "related_raw:.*<RAW_SLUG>" -List | Select-Object -ExpandProperty Path
```

若找到**一個或多個**想法檔，逐一讀取所有想法檔內容，記錄每筆想法的摘要與 raw 路徑，後續 Step 4 建立 source note 時一併處理（迭代所有關聯想法，聚合列出）。

> `wiki-ingest-youtube` 的 Step 1f 已先行掃描，此處再次確認以確保不遺漏（來源可能在 YouTube ingest 後才被加入想法）。

### 2. 查詢既有知識（避免重複）

在建立新頁面之前，先查詢 wiki 是否已有相關內容：
- 讀 `wiki/index.md` 找相關頁面
- 讀那些頁面，了解現有知識
- 決定是建立新頁面還是更新現有頁面

### 3. 雙模型交叉驗證（取代人類確認，Pi 主持不投票）

- Pi（本 agent）不自己提案，分別呼叫 `chat-with-claude` 與 `chat-with-gemini` skill，讓兩個獨立參與者對同一份 raw 各自產出結構化提案
- **Round 1**：只比對關鍵欄位（目標頁面、type、topics、是否推翻既有結論）；措辭不同不算分歧
- 一致 → 採用，進入步驟 4
- 不一致 → **Round 2**：互相展示對方提案，各自覆核是否修改立場
- Round 2 仍不一致 → 呼叫 `chat-with-copilot` skill 當第三票，多數決；記錄分歧與裁決理由於 `wiki/log.md`
- 三方仍無共識 → 仍然寫入，標記 frontmatter `confidence: draft`（不可因為沒共識就放棄這筆資料）
- 輪數上限：2 輪 + 第三票，避免無止盡討論

### 4. 建立/更新 wiki 頁面

一個來源可能動到多頁：

- 建立**來源筆記**（`wiki/sources/YYYY-MM-DD-title.md`）— 1 頁彙整該資料重點
  - **⚠️ 必須在 frontmatter 加入 `provenance` 指向 raw 檔案**
  - **若 Step 1 找到關聯想法檔（可能有多筆）**：在 source note 新增 `## Cheer 的想法` 小節，**逐筆迭代**所有關聯想法檔，每筆列出：
    - 想法摘要（保留原始措辭，不整理）
    - `[[raw/conversations/thought-slug|想法標題]]` 連結回 raw 想法檔
    - 跨 `[[raw/youtube/source-slug|來源標題]]` 或 `[[raw/web/source-slug|來源標題]]` 雙向連結
  - **若想法夠獨立（新概念／新問題）**：另建 `wiki/concepts/` 或 `wiki/discussions/` 頁面，正文包含 `[[wiki/sources/...]]` 連結回 source note，source note 的「Cheer 的想法」小節也連結到該 wiki 頁面
  - **若無關聯想法**：不新增「Cheer 的想法」小節，source note 結構不受影響
- 更新相關 canonical collection pages（`wiki/concepts/`、`wiki/entities/`、`wiki/sources/`）
  - 加入 `[[wikilink]]` 雙向連結
- 尚未定案的內容放 `wiki/discussions/`；已確認的全域選擇放 `wiki/decisions/`
- **⚠️ Topic pages 必須同步更新**：每當新增或更新 entity/concept/source 頁面，必須同時更新對應的 `wiki/topics/*.md` 導航頁
- 標記新資料是否推翻／補充既有結論
- **Canvas 建立時**：存入 `wiki/visualizations/`，在 `visualizations/README.md` 註冊

### 5. 更新索引

修改 `wiki/index.md`（加入新頁或更新摘要），確保 Topics 區塊也反映 topic pages 的變更。

### 6. 寫日誌

在 `wiki/log.md` 最上方 append 一筆 ingest 紀錄。

### 7. 推送回 GitHub

```bash
git add -A
git commit -m "ingest: <簡短說明>"
git push
```

---

## Frontmatter 強制規範

每個 canonical content page**必須**有以下 frontmatter：

```yaml
---
title: 頁面標題
type: entity | concept | source | comparison | synthesis | decision | discussion | audit | project-bundle
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: N
tags: [topic-a, topic-b]
topics: [topic1, topic2]  # 可選，頁面所屬的 topics（可多值）
canonical: entities/name   # 可選，canonical path
provenance:               # source 類型必填；其他類型可選
  - kind: raw | external | project | session
    path: raw/example.md  # kind: raw 時填 raw 相對路徑
    url: https://...      # kind: external/project 時填 URL
---
```

**必填欄位：** title, type, created, updated, sources, tags
**source 類型額外必填：** provenance（至少一筆，指向 raw 檔案或外部來源）

---

## 注意事項

- `raw/` 永遠只讀不寫
- 優先使用 vault-root 完整路徑，例如 `[[wiki/entities/pi-mono|pi-mono]]`
- 新 journal 與正文 link 一律優先使用 canonical vault-root path
- **不篩選**：所有 raw 都會被消化，LLM 不能決定「什麼有價值」
- **零遺漏保證**：每個 raw 檔案都必須產出至少一個 wiki 頁面，或在既有頁面明確記錄「已檢視、併入 XXX，理由：...」；不可以無痕跡跳過
- **先查詢再寫入**：避免重複，自動建立交叉引用
- **陳述級溯源（§4.3）— 網頁來源的實作方式**：YouTube 和 PDF 有 `[MM:SS]` / `[p.X]` 可標，網頁沒有這種結構化定位資訊。但溯源的目的不是「時間戳」本身，是「避免 AI 瞎掰、每個陳述都能回查原文」。因此網頁來源用 **「逐句可回查」** 取代「時間戳可回查」：
  1. **直接引用**：必須是能在 raw 網頁裡逐字搜尋到的原文，用引號標示（例如：`「把文件切成 chunks 的瞬間就丟棄了結構資訊」`）
  2. **歸納性陳述**（數字、因果結論、技術斷言）：措辭要具體到能用關鍵字在 raw 裡比對驗證，不能寫得模糊到查無實據（例如：✅「Chunkless RAG 保留 tree structure，讓 agent 用推理導航」；❌「這種方法比較好」）
  3. **不要求 inline 標記**（因為網頁沒有結構化定位點可標），但每條陳述必須能在 raw 中被搜尋驗證——這是 `wiki-lint` Source Fidelity 檢查的基礎
  4. 若網頁本身帶有段落錨點、章節編號等結構化定位資訊（少見），應在 frontmatter 標記 `source_type`，`wiki-lint` 的陳述級溯源檢查會自動偵測

## 職責劃分

### wiki-ingest 負責
- 讀取 `raw/` 或 `staging/` → 查重 → 合成與寫入主庫
- 處理共識通過或 TTL 到期晉升的回填草稿
- 建立/更新 wiki 頁面

### wiki-query 負責（不在本 skill 範圍）
- 查詢 → 讀取 Index → 合成有引用回答
- 產生 Backfill 暫存檔案至 `staging/`
- 評估洞察品質（信心度）

## 處理 Staging Buffer

當草稿達到 `auto_verified` / `verified_by_arbitration`，或 TTL（21 天）到期時：

1. 讀取 `wiki/staging/` 中的草稿
2. 驗證 metadata 完整性
3. 移入 wiki/ 相應目錄（concepts/entities/sources）；TTL 到期晉升的草稿保留 frontmatter `confidence: draft`
4. 重新產生 index.md，更新 log.md
5. 刪除 Staging 中的草稿（內容已移入正式知識，不會遺失）

---

## 相關 Skills

- `wiki-query` — 查詢 wiki 內容
- `wiki-lint` — 健康檢查
- `knowledge-garden` — 維護 Notion 知識花園
- `wiki-ingest-pdf` — PDF → raw，格式轉換後交給本 skill 處理
- `wiki-ingest-youtube` — YouTube 字幕/逐字稿 → raw，格式轉換後交給本 skill 處理
