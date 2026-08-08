---
name: wiki-knowledge
description: 維護本機 Obsidian 知識庫。實作 ingest（吸收新資料）、query（查詢）、lint（健康檢查）三個標準流程。使用時機：使用者提到「更新知識庫」、「存到 wiki」、「ingest」、「查 wiki」、「lint wiki」或類似情境。
---

# Wiki Knowledge

本機知識庫位於 `C:/Cheerio/Obsidian/`。

## 架構

```
Obsidian/
├── raw/              # 原始資料（只讀，圖片由 Obsidian 內建處理）
│   ├── web/          # Web Clipper 剪藏
│   ├── youtube/      # YouTube 字幕/逐字稿
│   └── conversations/# 原始對話
├── projects/         # Project OKF Bundles（跨 session、跨環境）
├── wiki/             # Shared cross-project knowledge graph
│   ├── concepts/     # 可跨專案重用的抽象知識
│   ├── entities/     # 人、工具、package、服務與具體實作
│   ├── sources/      # 整理後的外部資料
│   ├── decisions/    # 全域／跨專案已確認決策
│   ├── discussions/  # 尚未定案的討論
│   ├── topics/       # 導航／taxonomy 層，只放 topic 導航頁
│   ├── visualizations/ # Canvas 視覺化投影
│   ├── audits/       # audit 報告
│   ├── index.md      # 內容索引（導航樞紐）
│   └── log.md        # 時間日誌（append-only）
├── work/             # 工作狀態與可追溯歷史
│   ├── current.md    # 目前工作
│   └── history/      # 月分片歷史事件
└── AGENTS.md         # 工作規範（完整規範在此）
```

**各資料夾用途：**
- `raw/` = 原始資料與對話。永遠只讀。
- `projects/<project-id>/` = Project OKF Bundle；不取代 package repository、原始碼或 package `docs/`。
- `wiki/concepts/` = 可跨專案重用的抽象知識。
- `wiki/entities/` = 人、工具、package、服務與具體實作。
- `wiki/sources/` = 整理後的外部資料；raw 永遠只讀。
- `wiki/decisions/` = 全域／跨專案已確認決策。
- `wiki/discussions/` = 尚未定案的方案與研究問題。
- `wiki/topics/` = 導航與 taxonomy，只放 topic 導航頁；不得建立 canonical content 副本或 compatibility stub。
- `wiki/visualizations/` = Canvas 視覺化投影；Canvas 不取代 canonical page。每張 Canvas 必須在 `visualizations/README.md` 註冊並標示所屬 topics，對應 topic page 的 `## Visualizations` 區塊須列出。
- `work/` = 工作狀態與可追溯歷史。

**Graph View 設定：**
- 排除：`work/`、`wiki/log.md`、`README.md`、`raw/`、`wiki/visualizations/`
- 只顯示：entities、concepts、sources、topics、decisions、discussions

## Git 同步（跨機器協作）

知識庫託管在 GitHub：`https://github.com/CheerioCorner/cheerio-wiki`

### 操作前（pull 最新版）

```bash
cd C:/Cheerio/Obsidian/
git pull
```

### 操作後（commit + push 回 GitHub）

```bash
git add -A
git commit -m "update: <簡短說明>"
git push
```

> **注意：** 如果 `git push` 要求登入，表示需要先設定 GitHub token 或 credential helper。Windows 可使用 Git Credential Manager。

---

## 前置動作

每次操作前，先 cd 到知識庫目錄：

```bash
cd C:/Cheerio/Obsidian/
git pull           # 確保拿到最新版
```

然後讀取 `AGENTS.md` 確認最新的工作規範。

---

## 1. Ingest（吸收新資料）

**觸發條件：** 人類在 `raw/` 放入新檔案，表示「處理這個」。

### 步驟

1. **讀取來源** — 從 `raw/` 讀取新檔案。文字一次讀完，圖片另外分批讀。
   - **PDF 檔案**：使用 `pdf-to-wiki` skill（`markitdown` 轉 Markdown + `pymupdf` 提取圖片）
2. **與人類確認重點** — 討論要提取什麼知識點、有沒有特殊要求。
3. **建立/更新 wiki 頁面**：一個來源可能動到多頁：
   - 建立**來源筆記**（`wiki/sources/YYYY-MM-DD-title.md`）— 1 頁彙整該資料重點，**⚠️ 必須在 frontmatter 加入 `provenance` 指向 raw 檔案**（格式見下方 Frontmatter 規範）
   - 更新相關 canonical collection pages（`wiki/concepts/`、`wiki/entities/`、`wiki/sources/`），加入 `[[wikilink]]` 雙向連結
   - 尚未定案的內容放 `wiki/discussions/`；已確認的全域選擇放 `wiki/decisions/`
   - **⚠️ Topic pages 必須同步更新**：每當新增或更新 entity/concept/source 頁面，必須同時更新對應的 `wiki/topics/*.md` 導航頁：
     - 檢查新頁面 frontmatter 的 `topics: [...]` 欄位
     - 在每個相關 topic 導航頁的 Entities、Concepts 或 Sources 列表中加入新頁面
     - 用 🛠️ 標記跨 topic 頁面
     - **驗證方法**：新增頁面後，逐一讀取每個相關 topic page，確認新頁面已列入
   - 標記新資料是否推翻／補充既有結論
   - **Canvas 建立時**：存入 `wiki/visualizations/`，在 `visualizations/README.md` 註冊並標示所屬 topics，並在對應 topic page 的 `## Visualizations` 區塊列出
4. **更新索引** — 修改 `wiki/index.md`（加入新頁或更新摘要），確保 Topics 區塊也反映 topic pages 的 變更
5. **寫日誌** — 在 `wiki/log.md` 最上方 append 一筆 ingest 紀錄（格式見 AGENTS.md §5.2）
6. **推送回 GitHub** — 執行 git 同步（commit + push）

Project maintenance uses root `projects/<project-id>/` Project OKF Bundles. These bundles use GitHub repository URLs as canonical cross-environment references and do not replace package repositories, source code, or package-local `docs/`. `wiki/projects/` is retired legacy structure and must not receive new content.

### 注意事項

- `raw/` 永遠只讀不寫
- 檔名規範、frontmatter、交叉引用方式見 AGENTS.md §4
- 頁面類型：`entity`、`concept`、`source`、`comparison`、`synthesis`、`decision`、`discussion`、`audit`、`project-bundle`
- 優先使用 vault-root 完整路徑，例如 `[[wiki/entities/pi-mono|pi-mono]]`；basename 只適合唯一 target
- Canvas、歷史 log 與舊 journal 可能造成合法 ambiguity；lint 必須分別報告，不應自動建立 future concept
- 新 journal 與正文 link 一律優先使用 canonical vault-root path，避免 basename ambiguity

### Frontmatter 強制規範

每個 canonical content page**必須**有以下 frontmatter；README、index、log 與 topic navigation pages 是結構性例外：

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
**可選欄位：** topics（多值陣列）、canonical、provenance（非 source 類型）
**格式檢查：** lint 流程會自動檢查格式一致性

---

## 2. Query（查詢）

**觸發條件：** 人類對 wiki 提出問題。

### 步驟

1. **查索引** — 讀 `wiki/index.md` 找出相關頁面
2. **讀取頁面** — 讀那些頁面，必要時追溯其 `[[wikilink]]`
3. **給出有引用的回答** — 標明來源頁面
4. **可回填為新頁面** — 如果回答質量高，人類說「存到 wiki」就建新頁 + 更新 index + 寫 log

---

## 3. Lint（健康檢查）

**觸發條件：** 人類說「lint wiki」。

### 步驟

1. **掃描 `wiki/`** 找：
   - 頁面間互相矛盾
   - 過時主張被新資料推翻卻沒標記
   - 孤立頁面（沒有 inbound 連結）
   - 出現多次但沒有自己頁面的概念
   - 缺漏的交叉引用
   - Frontmatter 格式不一致（缺少必填欄位、格式錯誤）
   - **Source note provenance 缺漏**：`wiki/sources/` 下的頁面應有 `provenance` 指向 raw 檔案或外部 URL；指向不存在檔案的 provenance 須標記
   - **Topic page 遺漏**：每個 entity/concept/source 的 `topics: [...]` 都應在對應 `wiki/topics/*.md` 的 Entities、Concepts 或 Sources 列表中列出；topic page 列出的頁面都應存在且 frontmatter topics 包含該 topic
   - **Canvas 遺漏**：`wiki/visualizations/*.canvas` 都應在 `visualizations/README.md` 註冊並標示 topics；對應 topic page 的 `## Visualizations` 區塊須列出相關 Canvas
2. **提出清單** — 「該修什麼、該查什麼、該補什麼資料」
3. **人類確認後修改**
4. **推送回 GitHub** — 修改完成後執行 git 同步（commit + push）

---

## 參考

- 完整規範：[`C:/Cheerio/Obsidian/AGENTS.md`](file:///C:/Cheerio/Obsidian/AGENTS.md)
- 索引頁：`wiki/index.md`
- 日誌頁：`wiki/log.md`
- 任務系統：`todos/README.md`
