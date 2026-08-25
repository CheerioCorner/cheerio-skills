---
name: deep-research-intake
description: 引導使用者釐清與收斂研究意圖與範圍。當使用者說「開始研究」「準備做研究」「設定研究規格」「研究調查」「我要研究」，或任何需要釐清研究意圖、時間範圍、深度、語言、來源偏好的對話時，觸發本能力，最終產生 spec.json 研究規格檔案。
---

# Deep Research Intake

深度研究流程的**前段對話**：用多輪提問把使用者的研究意圖收斂成一份結構化的 `spec.json`，交給 `deep-research-execute` 執行。本 skill 只負責提問與收斂，不呼叫任何研究/篩選/匯入腳本。

## 何時改用其他 skill

- Job 已經有 `spec.json`，要開始跑研究/篩選/匯入 → `deep-research-execute`
- 使用者直接丟一個 job ID 要你繼續前一個研究任務 → 直接用 `deep-research-execute`，不用重新跑一次 intake

## 提問流程（必經步驟，不得省略）

1. **先問研究主題**：問清楚 `query`（研究主題本身）與核心範圍，不要一開始就問其他面向。若使用者的提問天然拆得出幾個具體子問題（例如「A 是什麼、跟 B 的差異、對 C 場景有什麼影響」），順手記下來準備放進 `sub_questions`；拆不出來就留空，不用硬湊。
2. **漸進式提問，每輪 1–2 題**：依序問完以下六個面向，**嚴禁一次列出六大類問題逼問使用者**：
   - 研究深度：`quick`（快速調查）／`standard`（標準研究）／`deep`（深度研究，預設）
   - 時間範圍：近期／過去 1 年／過去 3 年／不限（any）
   - 偏好語言：`zh-TW`（預設）／`en`／`any`
   - 是否要求引用來源：布林值，預設 `true`
   - 來源立場偏好：`academic`／`industry`／`mixed`（預設）
   - 輸出格式期待：`summary`／`structured`／`full`（預設）
3. **規格預覽**：收斂完成後，把整理好的 JSON 結構秀給使用者看一次，不要直接寫檔。
4. **確認後才寫檔**。

## 產出 Job 資料夾與 spec.json

1. 讀 `process.env.RESEARCH_JOBS_DIR`；沒設定就請使用者先設好，不要猜路徑或寫死本機路徑。
2. **檢查是否已有相近主題的 job**：列出 `<RESEARCH_JOBS_DIR>/rc-*/spec.json`，讀每一個的 `query`（不用寫腳本，直接用 Glob/Read 掃過去即可），憑語意判斷有沒有跟這次主題明顯相近的既有 job。
   - 沒有相近的 → 跳到步驟 3，照常開新 job。
   - 有相近的 → 讀該 job 的 `checkpoint.json`（沒有就代表連 `run_research.js` 都還沒跑）。判斷是否已跑完：`checkpoint.stage` 是 `answered` 且 `research-report.md` 已存在，才算完成；其他情況一律視為進行中。
     - **進行中**：告訴使用者「看起來已經有進行中的同主題研究 `<job-id>`（目前狀態：`<stage>`），因為 `deep-research-execute` 不支援對同一個 notebook 同時跑兩個 `research start`，建議等它跑完再繼續」。除非使用者明確說「不管、開新的」，否則不要建立新 job；也不要自己去啟動或續跑那個既有 job（那是 `deep-research-execute` 的責任）。
     - **已完成**：問使用者是要「沿用它的 notebook 補充研究」（沿用時，直接把新 job 的 `spec.json.notebook_id` 設成該 job 的 `checkpoint.json.notebook_id`，並在對話中明確告知 `deep-research-execute`：這個 notebook 已存在，之後所有 `research start` 只能用 `-n`，絕對不能再用 `--title`）還是「開一個全新的、獨立的 notebook」。兩種都合法，問清楚就好。
3. Job ID 格式固定 `rc-YYYYMMDD-NNN`（同一天遞增序號，例如當天第一個是 `rc-20260823-001`）。
4. **`profile` 欄位不要猜、不要沿用範本值**：跑一次 `node <deep-research-execute 路徑>/scripts/check_provider.js`，用回傳的 `profiles_available` 決定要填什麼；只有一個可用 profile 就直接用它，有多個就問使用者要用哪個。曾經因為範本值寫死 `"work"`，但實際環境只有 `personal` profile 而卡住。
5. 建立 `<RESEARCH_JOBS_DIR>/<job-id>/spec.json`：

```json
{
  "job_id": "rc-20260823-001",
  "query": "行為驅動開發之語意基石：Gherkin 語法結構研究",
  "sub_questions": [],
  "profile": "personal",
  "notebook_id": null,
  "budget": {
    "max_sources": 50,
    "max_duration_seconds": 900,
    "max_retries": 3
  },
  "research_profile": {
    "depth": "deep",
    "timeframe": "any",
    "preferred_language": "zh-TW",
    "citation_required": true,
    "source_bias": "mixed",
    "output_format": "full"
  }
}
```

`sub_questions`（可選，預設空陣列）：`deep-research-execute` 的最後查詢階段會逐一問這裡列的問題；留空時只會問 `query` 本身這一題。`profile` 只是範例值，實際要填第 4 步驗證過的結果。`notebook_id` 預設 `null`；只有在步驟 2 判斷要沿用既有 job 的 notebook 時才填入該 notebook 的 id，其餘情況一律留 `null` 讓 `run_research.js` 自己建立新 notebook。

6. 告訴使用者這個 job ID，並說明可以交給 `deep-research-execute` 開始跑。

## 規則

- 不寫死任何本機路徑；job 狀態一律透過 `RESEARCH_JOBS_DIR` 定位。
- 提問語氣自然、像 pair programming 在對話，不要一次轟炸六大類問題。
- 本 skill 不執行研究、不呼叫 nlm CLI——那是 `deep-research-execute` 的責任。
