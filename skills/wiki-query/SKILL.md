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

### 3. 給出有引用的回答

標明來源頁面。

### 4. 可回填為新頁面

如果回答質量高，人類說「存到 wiki」就建新頁 + 更新 index + 寫 log。

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
