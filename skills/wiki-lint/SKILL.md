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
- **Source Fidelity** — 核對 wiki 綜述是否能在原始資料中找到對應出處
  - 使用 NLI 三態判斷：Entailment（忠實）/ Contradiction（矛盾）/ Neutral（外推）
  - 標記 `FIDELITY_VIOLATION` 或 `UNGROUNDED_CLAIM`

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
