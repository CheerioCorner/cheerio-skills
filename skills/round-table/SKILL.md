---
name: round-table
description: 多 AI 圓桌會議。Pi 主持，派出 subagent（使用者指定模型）+ Gemini + Copilot 共同討論。觸發詞：「圓桌會議」、「round table」、「多方討論」、「一起討論」。
---

# Round Table — 多 AI 圓桌會議

Pi 擔任主持人（不參與討論），派出 subagent 作為參與者，搭配 Gemini 和 Copilot 進行序列討論。使用者可指定 subagent 的數量和模型。

## 架構

```
Pi (主持人 — 不坐在桌上)
  │
  ├──派出 subagent A ─── model: 使用者指定
  ├──派出 subagent B ─── model: 使用者指定（可選）
  │
  ┌─────────────────────────────────────────────┐
  │  Sub A  │  Sub B  │  Gemini  │  Copilot    │
  └─────────────────────────────────────────────┘
         每輪由 Pi 決定誰先說
         Round 1 → Round 2 → ... → Round N
         Pi 摺疊 → 會議紀要
```

## 使用方式

### 自然語言觸發
- 「圓桌會議：XXX」
- 「讓 AI 們一起討論 XXX」
- 「round table: XXX」
- 「多方討論 XXX」

### 參數格式（在 prompt 中指定）

```
圓桌會議：{topic}

subagents:
  - model: anthropic/claude-sonnet-4
  - model: gemini-3.1-pro-high    # 可選

context: {檔案路徑}               # 可選
maxRounds: 3                      # 可選，預設 3
```

## 完整流程

### Phase 0: 準備

1. **解析參數** — 從使用者 prompt 中提取 topic、subagents、context、maxRounds
2. **建立 run 目錄** — `.pi/round-table/<YYYYMMDD-HHmmss>/`
3. **讀取 context** — 如果有 context 檔案路徑，讀取內容
4. **產出議題書** — Pi 自己寫一份 topic brief，存到 `topic-brief.md`
5. **記錄參與者** — 存 `participants.yaml`（列出所有參與者名稱、模型、類型）

### Phase 1: 派出 Subagents

對每個 subagent 設定，用 `runs.run()` 派出：

```javascript
// 範例：派出一個用 claude-sonnet-4 的 subagent
await runs.run('player-A', {
  agent: 'worker',
  model: 'anthropic/claude-sonnet-4',
  task: `你是圓桌會議的參與者「Player A」。

## 議題
${topicBrief}

## 你的角色
你是一位獨立的思考者。請從你自己的角度分析這個議題。
發表你的觀點時，要完整展開論述，不要只說「同意」或「反對」。`
})
```

**重要：** Subagents 是持久的——它們被派出後會記住上下文，可以在多輪中持續參與。
每輪開始前，用 `runs.run()` 的 `resume` 功能把新 prompt 傳給已存在的 subagent。

### Phase 2: 討論（序列輪轉）

每輪的流程：

#### Step 1: Pi 決定本輪順序

Pi 分析前一輪的發言（第一輪則沒有），決定本輪誰先說。

**排序依據：**
1. 平衡發言次數（誰最少說話誰先）
2. 回應缺口（誰的觀點還沒被回應）
3. 辯證張力（誰的立場跟前一位最不同）
4. 新觀點催化（如果都在重複，換很少說話的先）

#### Step 2: 依序呼叫每位參與者

對順序中的每個參與者，依類型呼叫：

**Subagent 參與者：**
```javascript
const result = await runs.run('player-A', {
  resume: 'run-id-of-player-A',  // 繼續之前的 subagent
  task: `圓桌會議 Round ${n}。

目前討論紀錄：
${allPreviousStatements}

請發表你的觀點。回應前面所有人的發言。`
})
// 讀取 result.output 存到 round-N-player-a.md
```

**Gemini 參與者：**
```bash
# 寫 prompt 到臨時檔案（避免 shell 轉義問題）
echo "${prompt}" > .pi/round-table/${id}/round-${n}-gemini-prompt.txt

# 執行 agy
agy -p "$(cat .pi/round-table/${id}/round-${n}-gemini-prompt.txt)" \
  --output-format stream-json \
  > .pi/round-table/${id}/round-${n}-gemini.log 2>&1

# 讀取結果（從 log 中提取回應）
```

**Copilot 參與者：**
```bash
# 寫 prompt 到臨時檔案
echo "${prompt}" > .pi/round-table/${id}/round-${n}-copilot-prompt.txt

# 執行 gh copilot
gh copilot -p "$(cat .pi/round-table/${id}/round-${n}-copilot-prompt.txt)" \
  --allow-tool 'shell(echo)' \
  > .pi/round-table/${id}/round-${n}-copilot.log 2>&1

# 讀取結果
```

#### Step 3: 存檔

每位參與者的發言存到：
- `round-N-player-a.md`（subagent）
- `round-N-gemini.md`（Gemini）
- `round-N-copilot.md`（Copilot）

#### Step 4: 檢查結束條件

| 條件 | 判定 |
|------|------|
| `currentRound >= maxRounds` | 強制結束 |
| Pi 判斷無新論點 | 共識結束 |
| 人類說「停」 | 介入結束 |

如果沒結束，回到 Step 1。

### Phase 3: 摺疊（Synthesis）

所有輪次結束後，Pi 產出會議紀要 `synthesis.md`：

```markdown
# 圓桌會議紀要：{topic}
> 日期 | 參與者（含模型）| 輪數

## 共識
1. ...

## 分歧
1. **[議題]**
   - [參與者 A]：...
   - [參與者 B]：...
   - 評估：...

## 未解問題
1. ...

## 建議下一步
1. ...

## 完整討論紀錄
- Round 1: [Player A](round-1-player-a.md) → [Gemini](round-1-gemini.md) → [Copilot](round-1-copilot.md)
- ...
```

### Phase 4: 同步到 work/history

將會議紀要的摘要寫入 `work/history/YYYY-MM.md`：

```markdown
### YYYY-MM-DD 圓桌會議：{topic}
- 參與者：Player A (claude-sonnet-4)、Gemini、Copilot
- 輪數：3
- 共識：...
- 分歧：...
- refs: [[.pi/round-table/{id}/synthesis|會議紀要]]
```

## 輸出路徑

```
.pi/round-table/
└── 20260809-143000/
    ├── topic-brief.md              # 議題書
    ├── participants.yaml           # 參與者清單
    ├── round-1-player-a.md         # Round 1 Subagent
    ├── round-1-gemini.md           # Round 1 Gemini
    ├── round-1-copilot.md          # Round 1 Copilot
    ├── round-2-*.md                # Round 2 ...
    ├── synthesis.md                # 會議紀要
    └── meta.yaml                   # 中繼資料
```

## Prompt 模板

### 議題書（Pi → 自己）

```
你是一個圓桌會議主持人。請針對以下議題，產出一份議題書。

議題：{topic}
背景：{context（如有）}

議題書格式：
1. 議題定義（一句話）
2. 背景脈絡（3-5 句）
3. 討論目標（要回答什麼？要決定什麼？）
4. 期望產出（討論結束後要拿到什麼？）
```

### Subagent 開場 prompt

```
你是圓桌會議的參與者「{name}」。

## 議題
{topic_brief}

## 你的角色
你是一位獨立的思考者。請從你自己的角度分析這個議題。
發表你的觀點時，要完整展開論述，不要只說「同意」或「反對」。
可以從以下角度切入（但不局限於此）：
- 技術可行性
- 風險與成本
- 長期影響
- 替代方案
- 實作細節
```

### Subagent 後續輪 prompt

```
圓桌會議 Round {n}。

## 目前討論紀錄
{all_previous_statements}

請發表你的觀點。回應前面所有人的發言，可以同意、反駁、補充或提出新觀點。
```

### Gemini prompt

```
你正在參加一場圓桌會議。

## 議題
{topic_brief}

## 目前討論紀錄
{all_previous_statements}

請發表你的觀點。回應前面所有人的發言，可以同意、反駁、補充或提出新觀點。
請完整展開你的論述。
```

### Copilot prompt

```
你正在參加一場圓桌會議。

## 議題
{topic_brief}

## 目前討論紀錄
{all_previous_statements}

請發表你的觀點。從實作面和工程角度切入，回應前面所有人的發言。
可以同意、反駁、補充或提出新觀點。請完整展開你的論述。
```

### Pi 排序 prompt（Pi → 自己）

```
你是圓桌會議主持人。根據上一輪所有人的發言，決定下一輪的發言順序。

上一輪發言：
{round_statements}

參與者名單：{participant_names}

排序依據：
1. 平衡發言次數（誰最少說話誰先）
2. 回應缺口（誰的觀點還沒被回應）
3. 辯證張力（誰的立場跟前一位最不同）
4. 新觀點催化（如果都在重複，換很少說話的先）

請產出下一輪的參與者順序列表（JSON 陣列）。
```

## 注意事項

- **Prompt 長度**：每輪 prompt 會越來越長（包含所有歷史發言）。注意 token 限制。
- **CLI timeout**：agy 預設 5 分鐘 timeout。如果討論很長，可能需要 `--print-timeout`。
- **失敗處理**：如果某個參與者失敗（timeout、API error），跳過該參與者繼續下一位。
- **Subagent 生命週期**：subagent 在整場會議中保持存活，每輪用 resume 傳入新 prompt。
- **Gemini 模型**：agy 可以用 `--model` 指定模型（如 `gemini-3.6-flash-high`）。預設用 agy 預設。
- **Copilot 模型**：gh copilot 目前不支援 `--model` 參數。
