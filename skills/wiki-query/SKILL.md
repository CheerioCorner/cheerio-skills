---
name: wiki-query
description: >-
  查詢本機 Obsidian 知識庫的內容。當使用者對 wiki 提出問題時使用。
  當使用者提到「查 wiki」、「wiki 裡有什麼」、「找一下 wiki」時使用。
---

# Wiki Query

查詢本機 Obsidian 知識庫的內容。

## 前置動作

```bash
cd C:/Cheerio/Obsidian/
git pull           # 確保拿到最新版
```

---

## 流程

### 1. 查索引

讀 `wiki/index.md` 找出相關頁面。

### 2. 讀取頁面

讀那些頁面，必要時追溯其 `[[wikilink]]`。

### 3. 掃描關聯想法

若查詢涉及 `wiki/sources/` 的來源筆記，掃描對應 raw 是否有想法檔：

```bash
# 從 source note 的 provenance_raw 取得 raw 路徑，再搜尋引用它的想法檔
grep -rl "related_raw:.*<RAW_SLUG>" raw/conversations/*.md 2>/dev/null
# PowerShell 替代：
# Get-ChildItem raw/conversations/*.md | Select-String -Pattern "related_raw:.*<RAW_SLUG>" -List | Select-Object -ExpandProperty Path
```

若找到，讀取想法檔內容，準備在回答中呈現。若未找到，正常回答，不加「Cheer 的想法」區塊。

### 4. 給出有引用的回答

標明來源頁面。若有关聯想法，在回答末尾加：

```

---

💡 **Cheer 當時的想法：**

> <想法原始內容，保留原貌不整理>
>
> — 來源：[[raw/conversations/thought-slug|想法檔]]
```

### 5. 不確定時要說

如果對回答沒把握，明確告訴人類「我對這個回答不確定」並說明原因。這只是溝通訊號，不影響是否回填。

### 6. 自動回填（不需要人類說「存到 wiki」）

有新意的洞察一律走 `wiki-ingest` skill 的 Backfill 流程（查重 → 雙模型共識判斷 → 寫入 Staging → 全自動處理），不需要人類確認。人類仍可隨時主動說「存到 wiki」立即觸發，但不是必要條件。

---

## 回答格式

```
📖 回答：<問題>

<回答內容，標明引用來源>

---

**來源：**
- [[wiki/entities/xxx|頁面名稱]] — 摘要
- [[wiki/concepts/xxx|概念名稱]] — 摘要
```

---

## 相關 Skills

- `wiki-ingest` — 吸收新資料進 wiki
- `wiki-lint` — 健康檢查
- `knowledge-garden` — 維護 Notion 知識花園
