# Round Table Skill

多 AI 圓桌會議 skill。Pi 主持，subagent（使用者指定模型）+ Gemini + Copilot 共同討論。

## 功能

- Pi 擔任主持人（不參與討論）
- 使用者可指定 0-N 個 subagent 參與者，每個可指定 model
- Gemini 和 Copilot 始終參與
- 發言順序由 Pi 每輪動態決定
- 最多 N 輪後 Pi 摺疊出會議紀要

## 使用方式

```
圓桌會議：我們該用 MongoDB 還是 PostgreSQL？

subagents:
  - model: anthropic/claude-sonnet-4

maxRounds: 3
```

## 安裝

將 `SKILL.md` 放到 `~/.agents/skills/round-table/` 目錄下。

## 依賴

- `chat-with-gemini` skill（Gemini CLI）
- `chat-with-copilot` skill（GitHub Copilot CLI）
- Pi subagents（runs.run）
