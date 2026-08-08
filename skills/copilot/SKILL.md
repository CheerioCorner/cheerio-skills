---
name: copilot
description: 呼叫 GitHub Copilot CLI 執行任務。Pi 負責啟動、等待結果、讀取 log。當使用者提到「問 Copilot」、「用 Copilot」、「copilot」或 slash command `/copilot` 時使用。
---

# Copilot Agent

Pi 可以透過 GitHub Copilot CLI（`gh copilot`）呼叫 Copilot 模型執行任務。Copilot CLI 跑在背景，Pi 在結束後讀取 output 拿結果。

## 架構

```
Pi (orchestrator)
    │
    ├── 建立 run 目錄
    │       │
    │       ▼
    │   gh copilot -p "task" --allow-tool 'shell(...)' > log
    │       │
    │       ▼
    │   執行中...
    │
    └── 執行結束後，讀取 .pi/copilot-runs/<id>/output.log
```

## 使用方式

### 自然語言觸發
- 「問 Copilot X」
- 「用 Copilot 跑 X」
- 「讓 Copilot 做 X」

### Slash command
```
/copilot 你的 prompt
```

## 流程

1. **產生 run ID** — 每次執行有唯一 ID，格式：`YYYYMMDD-HHmmss`
2. **建立 run 目錄** — `.pi/copilot-runs/<id>/`
3. **啟動 gh copilot** — 在背景執行 `gh copilot -p "prompt" --allow-tool 'shell(echo)' > .pi/copilot-runs/<id>/output.log 2>&1`
4. **等待完成** — Pi 等待 copilot CLI 結束
5. **讀取結果** — Pi 讀取 output.log 並回傳結果給使用者
6. **更新歷史** — 追加到 `.pi/copilot-runs/history.md`

## 呼叫範例

```bash
# 啟動 copilot（背景執行）
gh copilot -p "你的 prompt" --allow-tool 'shell(echo)' > .pi/copilot-runs/20260810-143022/output.log 2>&1

# 讀取結果
cat .pi/copilot-runs/20260810-143022/output.log
```

## 參數說明

- `-p "prompt"` — 非互動模式的 prompt
- `--allow-tool 'shell(echo)'` — 允許 Copilot 使用 echo 工具（安全限制）
- `--allow-tool 'shell(git)'` — 允許使用 git 工具
- `--allow-tool 'shell(find)'` — 允許使用 find 工具

## 注意事項

- 需要先透過 `gh auth login` 完成 GitHub 認證
- 需要 GitHub Copilot 訂閱（Individual / Business / Enterprise）
- AI Credits 會被消耗（每次執行約 0.15-1.05 credits）
- token 使用量會在 output 中顯示
- 安裝：`gh extension install github/gh-copilot`（如果未安裝）
