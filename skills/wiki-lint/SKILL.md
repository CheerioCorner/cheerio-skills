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

### 1. 掃描 `wiki/` 找問題

- **矛盾內容** — 頁面間互相矛盾
- **過時主張** — 被新資料推翻卻沒標記
- **孤立頁面** — 沒有 inbound 連結
- **缺漏概念** — 出現多次但沒有自己頁面的概念
- **交叉引用缺漏** — 應該連結但沒連結的頁面
- **Frontmatter 格式不一致** — 缺少必填欄位、格式錯誤
- **Source note provenance 缺漏** — `wiki/sources/` 下的頁面應有 `provenance`
- **Topic page 遺漏** — entity/concept/source 的 `topics: [...]` 都應在對應 `wiki/topics/*.md` 列出
- **Canvas 遺漏** — `wiki/visualizations/*.canvas` 都應在 `visualizations/README.md` 註冊

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
- 孤立頁面：N
- 缺 frontmatter：N
- 缺 provenance：N
```

---

## 相關 Skills

- `wiki-ingest` — 吸收新資料進 wiki
- `wiki-query` — 查詢 wiki 內容
- `knowledge-garden` — 維護 Notion 知識花園
