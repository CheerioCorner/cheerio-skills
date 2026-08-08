---
name: todos
description: 管理 Obsidian 知識庫的任務系統。當使用者提到「todo」、「todos」、「任務」、「待辦」、「 backlog」、「排程」或類似情境時使用。
---

# Todos Skill

管理 `C:/Cheerio/Obsidian/todos/` 任務系統。

## 架構

```
todos/
├── README.md           ← 格式規範
├── current.md          ← 目前進行中（1-3 個任務）
├── backlog.md          ← 待辦清單（按優先級排列）
└── done/               ← 已完成的機器可讀紀錄（按日期）
    └── YYYY-MM-DD.md
```

## 格式規範

### 任務格式
```markdown
- [ ] 任務名稱 ⏫|🔼|🔽| #tag 📅 YYYY-MM-DD
```

**優先級：**
- `⏫` — 高（本週內完成）
- `🔼` — 中（本月內完成）
- `🔽` — 低（有空再做）
- 無標記 — 一般

**標籤：**
- `#meta` — 系統維護
- `#wiki` — 知識庫
- `#notion` — Notion 整合
- `#skills` — Skill 開發
- `#pi-web` — Pi Web/Desktop 專案
- `#extension` — Extension 開發
- `#knowledge` — 知識管理
- `#exploration` — 探索研究

---

## 操作流程

### 1. 查看目前任務

讀取 `todos/current.md`，告訴人類目前進行中的任務。

### 2. 新增任務

1. 確認任務名稱、優先級、標籤
2. 在 `backlog.md` 對應優先級區塊新增
3. 如果是本週要做的，同時放到 `current.md`

### 3. 完成任務

1. 從 `current.md` 或 `backlog.md` 移除
2. 在 `done/YYYY-MM-DD.md` 新增一條紀錄
3. 在 `journal/daily/YYYY-MM-DD.md` 記錄活動與背景；不建立或搬移 `archive/`

### 4. 重新排列優先級

1. 讀取 `backlog.md`
2. 根據人類指示調整優先級標記
3. 更新檔案

### 5. 每日檢查

1. 讀 `current.md` 確認今天要做什麼
2. 完成後更新狀態
3. 在 `journal/daily/YYYY-MM-DD.md` 記錄活動；日記不取代未完成任務清單

---

## 與其他系統的整合

- **Pi Agent 啟動** — 讀取 `C:/Cheerio/Obsidian/todos/current.md`
- **日記** — 在 `journal/daily/YYYY-MM-DD.md` 中引用今日任務
- **Wiki lint** — 檢查是否有遺忘的任務
- **AGENTS.md** — 在啟動檢查中加入 todos 讀取

---

## 注意事項

- `current.md` 每次只專注 1-3 個任務，不要塞太多
- `backlog.md` 可以有很多任務，但要按優先級排列
- `done/` 檔案按日期命名，方便追溯
- 不設 `archive/`：Git history 與 daily journal 已提供歷史追蹤；`done/` 僅保留精確 task completion event
