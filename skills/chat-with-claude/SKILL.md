---
name: chat-with-claude
description: 呼叫 Claude Code CLI 執行任務。Pi 負責啟動、等待結果、讀取 log。當使用者提到「問 Claude」、「用 Claude」、「chat-with-claude」、「claude」或 slash command `/claude` 時使用。
---

# Claude Agent

Pi 可以透過 Claude Code CLI（`claude`）呼叫 Claude 模型執行任務。Claude CLI 跑在背景，Pi 在結束後讀取 output 拿結果。

## 架構

```
Pi (orchestrator)
    │
    ├── 建立 run 目錄
    │       │
    │       ▼
    │   claude -p "task" --output-format json > log
    │       │
    │       ▼
    │   執行中...
    │
    └── 執行結束後，讀取 .pi/claude-runs/<id>/output.log
```

## 使用方式

### 自然語言觸發
- 「問 Claude X」
- 「用 Claude 跑 X」
- 「讓 Claude 做 X」

### Slash command
```
/claude 你的 prompt
```

## 流程

1. **產生 run ID** — 每次執行有唯一 ID，格式：`YYYYMMDD-HHmmss`
2. **建立 run 目錄** — `.pi/claude-runs/<id>/`
3. **啟動 claude** — 在背景執行 `claude -p "prompt" --output-format json > .pi/claude-runs/<id>/output.log 2>&1`
4. **等待完成** — Pi 等待 Claude CLI 結束
5. **讀取結果** — Pi 讀取 output.log 並回傳結果給使用者
6. **更新歷史** — 追加到 `.pi/claude-runs/history.md`

## 呼叫範例

```bash
# 啟動 claude（背景執行）
claude -p "你的 prompt" --output-format json > .pi/claude-runs/20260810-143022/output.log 2>&1

# 讀取結果
cat .pi/claude-runs/20260810-143022/output.log
```

## 參數說明

- `-p, --print` — 非互動模式，印出回應後退出
- `--output-format json` — 以 JSON 格式輸出，方便解析
- `--output-format stream-json` — 即時串流輸出
- `--model <model>` — 指定模型（如 `claude-sonnet-4-20250514`）
- `--system-prompt <prompt>` — 自訂系統提示
- `--append-system-prompt <prompt>` — 附加到預設系統提示
- `--allowedTools <tools...>` — 允許使用的工具（如 `Bash(git *)`、`Edit`）
- `--disallowedTools <tools...>` — 禁止使用的工具
- `--max-turns <n>` — 最大回合數
- `--verbose` — 顯示完整輸出

## 圓桌會議整合

Claude 也作為圓桌會議的預設參與者之一（Claude + Gemini + Copilot）。
在圓桌會議中，Claude 的呼叫方式：

```bash
# 寫 prompt 到臨時檔案（避免 shell 轉義問題）
echo "${prompt}" > .pi/round-table/${id}/round-${n}-claude-prompt.txt

# 執行 claude
claude -p "$(cat .pi/round-table/${id}/round-${n}-claude-prompt.txt)" \
  --output-format json \
  > .pi/round-table/${id}/round-${n}-claude.log 2>&1

# 讀取結果
```

## 注意事項

- 需要先安裝 Claude Code CLI：`npm install -g @anthropic-ai/claude-code`
- 需要完成 Anthropic 帳號認證（首次執行 `claude` 時會自動引導）
- 需要有效的 Claude 訂閱（Pro / Max / Team / Enterprise）
- `--output-format json` 會在最後輸出結構化 JSON，方便 Pi 解析
- Claude CLI 預設有權限檢查，非互動模式下會跳過 workspace trust dialog
- 如果要讓 Claude 操作檔案系統，需加上 `--allowedTools` 參數
