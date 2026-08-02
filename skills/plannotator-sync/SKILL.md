---
name: plannotator-sync
description: 把 Plannotator 存到 Obsidian 的檔案同步到 raw/conversations/，準備 ingest 進 wiki。當使用者說「sync」時觸發。
---

# Plannotator → Raw Sync

把 Plannotator 存到 `plannotator/` 資料夾的檔案，搬到 `raw/conversations/` 並修正 frontmatter 格式。

## 觸發關鍵字

- 「sync」

## 流程

### 1. 掃描來源資料夾

```bash
ls C:/Cheerio/Obsidian/plannotator/*.md
```

如果資料夾不存在或沒有 .md 檔案，回報「沒有新檔案」。

### 2. 逐檔處理

對每個 .md 檔案：

1. **讀取內容**
2. **修正 frontmatter**：
   - 加上 `type: raw-conversation`
   - 加上 `source_kind: plannotator`
   - 加上 `status: captured`
   - 加上 `immutable: true`
   - 保留原有的 `title`、`description`、`tags`
   - 加上 `synced_from: plannotator/` 標記來源
3. **寫入目標路徑**：`C:/Cheerio/Obsidian/raw/conversations/YYYY-MM-DD-<slug>.md`
   - 日期用今天
   - slug 從 title 派生（英文小寫、空格改連字號、移除特殊字元）
   - 如果同名檔案已存在，加序號（-2, -3...）
4. **刪除來源檔案**（搬到 raw 後移除）

### 3. 回報結果

處理完畢後回報：
- 處理了幾個檔案
- 每個檔案的目標路徑
- 提醒使用者可以說「ingest」進行 wiki ingest

## Frontmatter 範例

**搬運後的格式：**
```yaml
---
title: "Save Plannotator Plans to Obsidian or Bear"
description: "Configure Plannotator to save plans..."
type: raw-conversation
source_kind: plannotator
status: captured
immutable: true
synced_from: plannotator/
created: 2026-08-02
tags: [plannotator, obsidian]
---
```

## 注意事項

- `raw/conversations/` 是唯讀区域，搬到這裡後就不會再被修改
- 搬運後的檔案等待使用者說「ingest」才會被處理進 wiki
- 如果 Plannotator 存的不是 .md 檔案，跳過並報告
