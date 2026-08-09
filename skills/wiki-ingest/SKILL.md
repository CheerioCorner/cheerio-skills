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
- **PDF 檔案**：使用 `wiki-pdf` skill（`markitdown` 轉 Markdown + `pymupdf` 提取圖片）

### 2. 與人類確認重點

討論要提取什麼知識點、有沒有特殊要求。

### 3. 建立/更新 wiki 頁面

一個來源可能動到多頁：

- 建立**來源筆記**（`wiki/sources/YYYY-MM-DD-title.md`）— 1 頁彙整該資料重點
  - **⚠️ 必須在 frontmatter 加入 `provenance` 指向 raw 檔案**
- 更新相關 canonical collection pages（`wiki/concepts/`、`wiki/entities/`、`wiki/sources/`）
  - 加入 `[[wikilink]]` 雙向連結
- 尚未定案的內容放 `wiki/discussions/`；已確認的全域選擇放 `wiki/decisions/`
- **⚠️ Topic pages 必須同步更新**：每當新增或更新 entity/concept/source 頁面，必須同時更新對應的 `wiki/topics/*.md` 導航頁
- 標記新資料是否推翻／補充既有結論
- **Canvas 建立時**：存入 `wiki/visualizations/`，在 `visualizations/README.md` 註冊

### 4. 更新索引

修改 `wiki/index.md`（加入新頁或更新摘要），確保 Topics 區塊也反映 topic pages 的變更。

### 5. 寫日誌

在 `wiki/log.md` 最上方 append 一筆 ingest 紀錄。

### 6. 推送回 GitHub

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

---

## 相關 Skills

- `wiki-query` — 查詢 wiki 內容
- `wiki-lint` — 健康檢查
- `knowledge-garden` — 維護 Notion 知識花園
- `wiki-pdf` — PDF 處理流程
- `wiki-youtube` — YouTube 字幕處理流程
