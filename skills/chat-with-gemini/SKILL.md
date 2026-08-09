---
name: chat-with-gemini
description: 呼叫 Antigravity CLI（agy）執行 Gemini 任務。Pi 負責啟動、等待結果、讀取 log。當使用者提到「用 Gemini」、「問 Gemini」、「chat-with-gemini」、「agy」、「gy」或 slash command `/gy` 時使用。
---

# Gy Agent

Pi 可以透過 Antigravity CLI（`agy`）呼叫 Gemini 模型執行任務。agy 跑在獨立 terminal pane 中，使用者可以即時看到執行過程，Pi 在結束後讀取 log 拿結果。

## 架構

```
Pi (orchestrator)
    │
    ├── 開啟新 pane (tmux/Windows Terminal)
    │       │
    │       ▼
    │   agy -p "task" --output-format stream-json > log
    │       │
    │       ▼
    │   執行中... (使用者可即時看到)
    │
    └── 執行結束後，讀取 .pi/gemini-runs/<id>/output.log
```

## 使用方式

### 自然語言觸發
- 「用 Gemini 跑 X」
- 「問一下 Gemini X」
- 「讓 Gemini 做 X」

### Slash command
```
/gy 你的 prompt
```

## 流程

1. **產生 run ID** — 每次執行有唯一 ID，格式：`YYYYMMDD-HHmmss`
2. **建立 run 目錄** — `.pi/gemini-runs/<id>/`
3. **啟動 agy** — 在新 pane 中執行 `agy -p "prompt" --output-format stream-json > .pi/gemini-runs/<id>/output.log`
4. **等待完成** — Pi 等待 Antigravity CLI 結束
5. **讀取結果** — Pi 讀取 output.log 並回傳結果給使用者
6. **更新歷史** — 追加到 `.pi/gemini-runs/history.md`

## 呼叫範例

```bash
# 啟動 agy（在新 pane）
# Windows Terminal / tmux 分頁
agy -p "你的 prompt" --output-format stream-json > .pi/gemini-runs/20260810-143022/output.log 2>&1

# 讀取結果
cat .pi/gemini-runs/20260810-143022/output.log
```

## 注意事項

- Antigravity CLI 需要先完成 Google OAuth 認證（首次執行 `agy` 時會自動引導）
- 免費額度：週制配額（具體限制未公開，community 報告約 2000 行程式碼後會被限制）
- log 自動包含時間戳和完整輸出
- 安裝路徑：`C:\Users\User\AppData\Local\agy\bin\agy.exe`
