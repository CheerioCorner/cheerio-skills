---
name: work-tracker
description: 管理 Obsidian 的可追溯工作狀態。當使用者提到工作、任務、待辦、進度、完成紀錄、下一步或追溯時使用。
---

# Work Tracker Skill

管理 `C:/Cheerio/Obsidian/work/`。由 agent 依照本 skill 直接維護 Markdown。

## 啟動檢查

每次 Pi 啟動時：

1. 讀取 `work/current.md`。
2. 整理 In progress、Backlog、Blocked 與下一步。
3. 告訴人類目前有哪些工作。
4. 詢問：「今天要從哪個開始？」

啟動時不主動讀取 `work/history/`。只有人類詢問過去做過什麼、上次進度、既有決策或需要追溯時，才讀取相關月份的 history。

## Work item 格式

```markdown
## In progress

- [ ] W-YYYY-MM-NNN 工作名稱
  - next: 下一步
  - refs: [[project-or-wiki-or-raw-link|Reference]]
```

每個 item 必須有：

- 穩定 ID：`W-YYYY-MM-NNN`
- 工作名稱
- `next:`
- `refs:`，至少一個 vault-root wikilink

狀態由 `In progress`、`Backlog`、`Blocked` section 表示，不另加 `status` 欄位。

## 何時新增工作

只有在下列情況自動新增：

- 人類明確說「之後要做」「記下來」「加入待辦」「下一步」
- 已確認的 follow-up 不會在本 session 完成
- 工作中發現獨立、可執行且需要未來追蹤的工作

不要為純問題、普通討論、已完成的子步驟或 agent 自己猜測的未來可能性新增工作。

新增前先查找是否已有相同或相近 item；已有則更新 `next:` / `refs:`，不要重複建立。

## 何時更新 work

- 新增工作：加入 `work/current.md`
- 工作進展：更新 `next:` 或補充 `refs:`
- 工作阻塞：移到 `Blocked`，更新 `next:`；必要時追加 history note
- 工作完成：從 `current.md` 移除，追加 history completion event
- 重大決策：追加 history event，並連到相關 raw / project / wiki

只有工作形成實際進展、決策或完成結果時，才寫 history。

## History event 格式

追加到 `work/history/YYYY-MM.md`：

```markdown
## YYYY-MM-DD — W-YYYY-MM-NNN

- event: 發生什麼事
- result: 產生什麼結果
- refs: [[raw-or-project-or-wiki-link|Reference]]
- status: completed | decision-recorded | blocked | note
```

History 按月分片。

## 追溯規則

當人類問「以前做過什麼」「上次做到哪裡」「是否討論過」時：

1. 先讀 `work/current.md`。
2. 再依日期或 work ID 讀相關 `work/history/YYYY-MM.md`。
3. 需要時追溯 event 裡的 raw、project、wiki refs。
4. 回答時清楚區分目前狀態、歷史事件與 canonical knowledge。

## 邊界

- `work/`：工作狀態、完成事件、決策與可追溯處理結果
- `raw/`：不可變原始輸入
- `wiki/`：整理後的 canonical knowledge
- `projects/`：專案 bundle
