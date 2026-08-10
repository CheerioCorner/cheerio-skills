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
  - 標記矛盾，不自動修復，等待人類確認
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
- **逾時草稿** — `wiki/staging/` 中超過 21 天 TTL 的草稿
- **重複草稿** — 相似 query 產生的重複回填
- **孤立草稿** — 長期未被確認的草稿

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
3. 依內容分類，產出建議清單
4. 人類確認後，執行 `mv` 到 `raw/.trash/` 或觸發 ingest

### 2. 提出清單

「該修什麼、該查什麼、該補什麼資料」

### 3. 人類確認後修改

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

## 🔴 必須修復
- [ ] [問題 1] — [說明]
- [ ] [問題 2] — [說明]

## 🟡 建議修復
- [ ] [問題 3] — [說明]

## 🟢 可選改善
- [ ] [問題 4] — [說明]

## 📊 統計
- 總頁面數：N
- 孤立頁面（無 inbound links）：N
- 缺 frontmatter：N
- 缺 provenance：N
- 矛盾內容：N
- 過時主張：N
- 缺漏概念：N
- 交叉引用缺漏：N
- 資料缺口：N
- 半衰期過期：N
- Source Fidelity 違規：N
- Staging Buffer 逾時：N
- Raw 冗餘：N
- Raw 未消化：N
```

---

## 相關 Skills

- `wiki-ingest` — 吸收新資料進 wiki
- `wiki-query` — 查詢 wiki 內容
- `knowledge-garden` — 維護 Notion 知識花園
