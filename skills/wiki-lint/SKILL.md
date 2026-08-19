---
name: wiki-lint
description: >-
  對本機 Obsidian 知識庫執行健康檢查。當使用者提到「lint wiki」、「整理 wiki」、「檢查 wiki」時使用。
---

# Wiki Lint

對本機 Obsidian 知識庫執行健康檢查。

## 前置動作

```bash
cd C:/Cheerio/Obsidian/
git pull           # 確保拿到最新版
```

---

## 流程

#### 結構完整性（自動化檢查）
- **Frontmatter 格式不一致** — 缺少必填欄位（type, title, created）、格式錯誤
- **Source note provenance 缺漏** — `wiki/sources/` 下的頁面應有 `provenance` 或 `provenance_raw`/`provenance_url`
- **孤立頁面** — 沒有 inbound `[[wikilink]]` 的頁面
- **Topic page 遺漏** — entity/concept/source 的 `topics: [...]` 都應在對應 `wiki/topics/*.md` 列出
- **Canvas 遺漏** — `wiki/visualizations/*.canvas` 都應在 `visualizations/README.md` 註冊

#### 知識品質（LLM 判斷）
- **矛盾偵測** — 掃描相同概念頁面中互相牴觸的述句（例如 A 說 X 是 Y，B 說 X 是 Z）
  - 掃描 `decisions/` 是否有相互抵觸的決策
  - 先呼叫 `chat-with-gemini` 覆核，嘗試共識收斂；不一致再用 `chat-with-copilot` 仲裁
  - 仍無法收斂 → 歸入 `wiki/discussions/`，明標兩種觀點並存，記錄於報告供人類選讀（不阻塞、不等人類確認）
- **遺漏稽核** — 掃描 `raw/` 底下每個檔案是否有 wiki 頁面在 provenance 中引用；未被引用者自動觸發 Ingest，或標記排除原因
- **Topic 過大** — 某 topic 下頁面數超過門檻時，用 `round-table` skill（claude + gemini + copilot）討論並自動執行分裂方案
- **過時主張** — 被較新來源推翻卻沒標記為過時的內容
- **缺漏概念** — 多個頁面反覆提到某個概念/工具/人，但沒有獨立頁面
- **交叉引用缺漏** — 兩個頁面高度相關卻沒有 `[[wikilink]]` 連結
- **孤立頁面掃描** — 找出無出站/入站雙向連結的無效節點
  - 檢查每個頁面是否有至少 1 個 inbound link
  - 檢查每個頁面是否有至少 1 個 outbound link
- **資料缺口** — 可以用 web search 補充的空白或待驗證主張
- **半衰期衰減** — 頁面是否超過 `stale_after`，計算衰減分數
  - 快訊類：7 天
  - 技術文件：180 天
  - 歷史常識：3650 天
  - 公式：`Score = BaseScore × e^(-λt) + Reinforcement`
- **Source Fidelity** — 核對 wiki 綜述是否能在原始資料中找到對應出處（所有 source note 都適用，不分 raw 類型）
  - **執行步驟**（每次 lint 至少抽樣 3 篇 source note）：
    1. 選取 source note：優先選最近 ingest 的、或來源 raw 篇幅較長的
    2. 讀取該 source note 正文，抽出 5-8 條事實性陳述（數字、因果結論、技術斷言、直接引用）
    3. 讀取對應的 raw 檔案（從 `provenance_raw` 或 `provenance_url` 取得路徑）
    4. 逐條比對：在 raw 中搜尋支持證據，判斷 NLI 三態：
       - **Entailment（忠實）**：raw 中有明確支持，或可合理推導 → 通過
       - **Contradiction（矛盾）**：raw 中有明確反證 → 標記 `FIDELITY_VIOLATION`
       - **Neutral（外推）**：raw 中找不到任何相關內容，是 AI 自行推斷 → 標記 `UNGROUNDED_CLAIM`
    5. 記錄結果於 lint 報告
  - **YouTube/PDF source note**：可同時利用結構化定位資訊（`[MM:SS]`、`[p.X]`）輔助驗證——在 raw 中搜尋該時間戳/頁碼附近的內容，比對是否與陳述一致
  - **網頁 source note**：直接在 raw 全文搜尋關鍵字比對（逐句可回查，見 `wiki-ingest` §陳述級溯源）
  - **抽樣策略**：不需全量掃描。每次 lint 抽 3 篇，輪流覆蓋不同來源類型（YouTube / PDF / Web），數輪後自然全覆蓋
  - **此檢查由 LLM 直接執行**（讀文比對），不需要外部 NLI 模型 API
- **陳述級溯源缺漏** — 掃描所有 `provenance_raw` 指向有結構化定位資訊的 raw 類型的 source note，檢查正文是否已 inline 標註
  - **掃描範圍**：`wiki/sources/` 中 frontmatter 的 `provenance_raw` 匹配以下模式：
    - `raw/youtube/*.md` → 應有 `[MM:SS]` 時間戳標註
    - `raw/web/*.md` 且 frontmatter 含 `source_type: pdf` → 應有 `[p.X]` 頁碼標註
    - 其他帶有結構化定位資訊的 raw 類型（未來擴充）
  - **判斷依據**：正文中事實性陳述（數字、日期、人名、因果結論、直接引用）是否至少有 50% 帶有對應格式的 inline 標註
  - **低於 50%** → 標記為 `CLAIM_PROVENANCE_GAP`，建議補做
  - **高於 50% 但有遺漏** → 記錄於報告，不強制要求補做
  - **全無標註** → 標記為 `CLAIM_PROVENANCE_MISSING`，優先建議補做
  - 此檢查不自動執行補做（成本高，需人類決定），只標記並報告

#### 雙向關聯健檢（raw/conversations ↔ raw/youtube・raw/web）

> **Windows 相容性說明**：以下掃描使用 `grep`（Git Bash / WSL 皆可用）。若在纯 PowerShell 環境執行，改用 `Get-ChildItem | Select-String -Pattern ... -List`。路徑比對前統一用 `/` 分隔符（raw 路徑本身已規範為 `/`）。

- **想法檔正向檢查** — 掃描 `raw/conversations/` 中所有 `source_kind: thought` 的檔案：
  1. 讀取 frontmatter `related_raw:` 欄位
  2. 驗證指向的 source 檔案是否存在（`raw/youtube/`、`raw/web/` 或其他 raw channel）
  3. 驗證正文是否包含 `[[wikilink]]` 指向同一來源
  4. 缺失 → 標記 `THOUGHT_LINK_BROKEN`
- **想法檔 frontmatter 完整性** — 掃描 `raw/conversations/` 中所有 `source_kind: thought` 的檔案：
  1. 若正文包含 `[[raw/...]]` wikilink，但 frontmatter 缺少 `related_raw:` 宣告
  2. → 標記 `THOUGHT_FRONTMATTER_MISSING`
- **來源反向檢查** — 對每個 `raw/youtube/` 和 `raw/web/` 檔案：
  1. `grep -rl "related_raw:.*<FILENAME>" raw/conversations/*.md` 掃描是否有想法檔引用
  2. 若有想法檔引用，檢查對應的 `wiki/sources/` 筆記是否包含「Cheer 的想法」小節
  3. 缺失 → 標記 `THOUGHT_SECTION_MISSING`
- **Wiki 層雙向連結** — 對每個被引用的想法檔：
  1. 檢查是否有對應的 wiki 頁面（`wiki/sources/` 的「Cheer 的想法」小節或獨立 `wiki/concepts/`/`wiki/discussions/` 頁面）
  2. 該 wiki 頁面是否 `[[wikilink]]` 回 raw 想法檔
  3. 缺失 → 標記 `WIKI_THOUGHT_LINK_MISSING`

#### Staging Buffer 健康度
- **逾時草稿** — `wiki/staging/` 中超過 21 天 TTL 的草稿 → 自動晉升為正式知識（`confidence: draft`），不是清除
- **重複草稿** — 相似 query 產生的重複回填 → 合併，累加 `reinforcement` 計數
- **孤立草稿** — 長期未被印證的草稿 → 隨 TTL 規則自動晉升，不需要人類介入

#### Raw 層健康度（整理流程）

**掃描 `raw/web/`，分類每筆檔案：**

| 分類 | 判斷依據 | 處理方式 |
|------|----------|----------|
| 已消化 + 冗餘 | provenance 引用 + 同主題多筆 | 移到 `raw/.trash/` |
| 已消化 + 唯一 | provenance 引用 + 唯一來源 | 保留 |
| 未消化 + 有價值 | 獨立主題、未被其他 source 覆蓋 | 建議 ingest |
| 未消化 + 低價值 | 治理文件、API 範例、重複內容 | 建議 trash |

**執行步驟：**
1. `grep -h "path: raw/web" wiki/sources/*.md` 取得已引用清單
2. 比對 `raw/web/*.md`，找出未引用的檔案
3. 依內容分類，產出清單
4. 已消化+冗餘的檔案自動 `mv` 到 `raw/.trash/`（可逆，git 有歷史紀錄）；未消化+有價值的檔案自動觸發 Ingest；其餘記錄於報告供選讀

### 2. 提出清單

「哪些已經自動處理、哪些需要人類判斷」

### 3. 能自動處理的直接執行（矛盾仲裁、topics 分裂、Staging 晉升、index.md 重建、觸發遺漏 raw 的 Ingest）；🔴 清單留給人類選讀，不阻塞

### 4. 推送回 GitHub

```bash
git add -A
git commit -m "lint: <簡短說明>"
git push
```

---

## 輸出格式

```markdown
# Wiki Lint Report — YYYY-MM-DD

## 🔴 需要人類判斷（極少數，共識仲裁後仍無法收斂）
- [ ] [問題 1] — [說明]

## 🤝 AI 已自動處理（選讀，不需要動作）
- [x] [矛盾仲裁 / topics 分裂 / Staging 晉升 / 遺漏補齊] — [結果與理由]

## 📊 統計
- 總頁面數：N
- 孤立頁面（無 inbound links）：N
- 缺 frontmatter：N
- 缺 provenance：N
- 矛盾內容（已自動仲裁 / 歸入 discussions）：N
- 過時主張：N
- 缺漏概念：N
- 交叉引用缺漏：N
- 資料缺口：N
- 半衰期過期：N
- Source Fidelity 違規：N
- 陳述級溯源缺漏（CLAIM_PROVENANCE_GAP / MISSING）：N
- 雙向關聯（THOUGHT_LINK_BROKEN / THOUGHT_FRONTMATTER_MISSING / THOUGHT_SECTION_MISSING / WIKI_THOUGHT_LINK_MISSING）：N
- Staging Buffer 晉升：N
- 遺漏稽核（raw 未被引用）：N
- Raw 冗餘：N
- Raw 未消化：N
```

---

## 相關 Skills

- `wiki-ingest` — 吸收新資料進 wiki
- `wiki-query` — 查詢 wiki 內容
- `knowledge-garden` — 維護 Notion 知識花園
