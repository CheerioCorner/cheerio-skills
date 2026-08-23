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

1. **先問研究主題**：問清楚 `query`（研究主題本身）與核心範圍，不要一開始就問其他面向。
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
2. Job ID 格式固定 `rc-YYYYMMDD-NNN`（同一天遞增序號，例如當天第一個是 `rc-20260823-001`）。
3. 建立 `<RESEARCH_JOBS_DIR>/<job-id>/spec.json`：

```json
{
  "job_id": "rc-20260823-001",
  "query": "行為驅動開發之語意基石：Gherkin 語法結構研究",
  "profile": "work",
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

4. 告訴使用者這個 job ID，並說明可以交給 `deep-research-execute` 開始跑。

## 規則

- 不寫死任何本機路徑；job 狀態一律透過 `RESEARCH_JOBS_DIR` 定位。
- 提問語氣自然、像 pair programming 在對話，不要一次轟炸六大類問題。
- 本 skill 不執行研究、不呼叫 nlm CLI——那是 `deep-research-execute` 的責任。
