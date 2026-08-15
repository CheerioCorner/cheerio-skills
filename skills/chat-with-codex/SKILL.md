---
name: chat-with-codex
description: 呼叫 OpenAI Codex CLI 執行任務。Pi 負責啟動、等待結果、讀取 log。當使用者提到「問 Codex」、「用 Codex」、「chat-with-codex」、「codex」或 slash command `/codex` 時使用。
---

# Codex Agent

Pi 可以透過 Codex CLI（`codex`）呼叫 OpenAI Codex 模型執行任務。Codex CLI 跑在背景，Pi 在結束後讀取 output 拿結果。

## 架構

```
Pi (orchestrator)
    │
    ├── 建立 run 目錄
    │       │
    │       ▼
    │   codex exec "task" > log
    │       │
    │       ▼
    │   執行中...
    │
    └── 執行結束後，讀取 .pi/codex-runs/<id>/output.log
```

## 使用方式

### 自然語言觸發
- 「問 Codex X」
- 「用 Codex 跑 X」
- 「讓 Codex 做 X」

### Slash command
```
/codex 你的 prompt
```

## 流程

1. **產生 run ID** — 每次執行有唯一 ID，格式：`YYYYMMDD-HHmmss`
2. **建立 run 目錄** — `.pi/codex-runs/<id>/`
3. **啟動 codex** — 在背景執行 `codex exec "prompt" > .pi/codex-runs/<id>/output.log 2>&1`
4. **等待完成** — Pi 等待 Codex CLI 結束
5. **讀取結果** — Pi 讀取 output.log 並回傳結果給使用者
6. **更新歷史** — 追加到 `.pi/codex-runs/history.md`

## 呼叫範例

```bash
# 啟動 codex（背景執行）
codex exec "你的 prompt" > .pi/codex-runs/20260815-103000/output.log 2>&1

# 讀取結果
cat .pi/codex-runs/20260815-103000/output.log
```

## 參數說明

### `codex exec` — 非互動模式（主要使用）
- `codex exec "prompt"` — 執行任務後退出（預設 read-only sandbox）
- `codex exec --json "prompt"` — JSON Lines 輸出，方便解析
- `codex exec -o file.json "prompt"` — 最終訊息寫入檔案
- `codex exec --ephemeral "prompt"` — 不持久化 session rollout
- `codex exec --sandbox workspace-write "prompt"` — 允許檔案寫入
- `codex exec --sandbox danger-full-access "prompt"` — 完全存取（僅限安全環境）
- `codex exec --output-schema schema.json "prompt"` — 結構化 JSON 輸出

### `codex exec resume` — 繼續非互動 session
- `codex exec resume --last "prompt"` — 繼續最近的 session
- `codex exec resume <session-id> "prompt"` — 繼續指定 session

### `codex review` — 程式碼審查
- `codex review --uncommitted` — 審查未提交的變更
- `codex review --base main` — 審查相對於 main 分支的變更
- `codex review --commit abc123` — 審查特定 commit

### 認證方式
- **ChatGPT 帳號**：`codex login`（OAuth 流程）
- **API Key**：設定環境變數 `CODEX_API_KEY`（僅 `codex exec` 支援）
- 已儲存的認證會自動複用

### 權限控制
- `--sandbox workspace-write` — 預設，允許工作區寫入
- `--sandbox danger-full-access` — 完全存取（CI/CD 專用）
- `--ignore-user-config` — 不載入 config.toml
- `--ignore-rules` — 跳過 execpolicy rules

### 其他有用的 flag
- `--search` — 啟用即時網路搜尋（預設 cached）
- `--image path` — 附帶圖片
- `--add-dir path` — 授予額外目錄寫入權限
- `--max-turns n` — 最大回合數

## 圓桌會議整合

Codex 也作為圓桌會議的預設參與者之一（Claude + Gemini + Copilot + Codex）。
在圓桌會議中，Codex 的呼叫方式：

```bash
# 寫 prompt 到臨時檔案（避免 shell 轉義問題）
echo "${prompt}" > .pi/round-table/${id}/round-${n}-codex-prompt.txt

# 執行 codex
codex exec "$(cat .pi/round-table/${id}/round-${n}-codex-prompt.txt)" \
  > .pi/round-table/${id}/round-${n}-codex.log 2>&1

# 讀取結果
cat .pi/round-table/${id}/round-${n}-codex.log
```

## 注意事項

- 需要先安裝 Codex CLI：`curl -fsSL https://chatgpt.com/codex/install.sh | sh`
- 需要完成 OpenAI 帳號認證（`codex login`）或設定 `CODEX_API_KEY`
- `codex exec` 預設在 read-only sandbox 中執行
- 如果要讓 Codex 操作檔案系統，需加上 `--sandbox workspace-write` 或 `--sandbox danger-full-access`
- `codex exec` 需要在 Git repo 中執行（`--skip-git-repo-check` 可跳過）
- Codex CLI 預設使用 `gpt-5.6-sol` 模型，可透過 `config.toml` 或 `--model` 變更

## 與 Claude CLI 的比較

| 特性 | Claude CLI (`claude`) | Codex CLI (`codex`) |
|------|----------------------|---------------------|
| 非互動模式 | `claude -p "prompt"` | `codex exec "prompt"` |
| JSON 輸出 | `--output-format json` | `--json` |
| 模型指定 | `--model <model>` | `--model <model>`（config.toml） |
| 工具權限 | `--allowedTools` | `--sandbox` / `--add-dir` |
| 認證 | Anthropic 帳號 | ChatGPT 帳號或 API Key |
| Session 續傳 | 無原生支援 | `codex exec resume --last` |
| 程式碼審查 | 需自建 | `codex review` 內建 |
| 結構化輸出 | 需自行處理 | `--output-schema` 原生支援 |
