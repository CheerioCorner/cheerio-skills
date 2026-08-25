---
name: deep-research-execute
description: 執行已完成規劃的 NotebookLM/Gemini Notebook 深度研究任務。當使用者說「執行研究」「開始跑研究」「匯入研究來源」「開始搜尋研究」「執行 deep research」時觸發，負責健檢/自主升級 nlm CLI、跑研究並自動匯入、讓 Gemini Notebook 自己做品質過濾與補研究、分類重新命名來源、逐題查詢並產出最終報告。
---

# Deep Research Execute

深度研究流程的**執行段**：讀 `deep-research-intake` 產出的 `spec.json`，跑健檢 → 最終確認 → 研究（自動匯入）→ 品質過濾 → recheck 補研究 → 蒸餾必要性 → 重新命名 → 逐題查詢 → 產出報告 → 交棒 ingest。全程用檔案（不是資料庫）保存進度，中斷後可從 checkpoint 接續。

判斷品質、判斷資訊是否足夠、判斷分類命名，這些都交給 Gemini Notebook 自己讀來源內容判斷（透過 `nlm query notebook`），不是本地關鍵字比對——腳本只負責把問題問清楚、把回應解析成結構化資料、把 nlm CLI 指令下對，不負責替 Gemini 做判斷。

## 何時改用其他 skill

- 還沒有 `spec.json`（不知道要研究什麼、範圍多大）→ 先用 `deep-research-intake` 收斂需求

## 執行腳本

- `check_provider.js` — nlm CLI 健檢（版本、認證、可用 profile、notebook 數量）
- `run_research.js` — 啟動研究並用 `--wait-and-import` 讓 nlm 自己等到完成、自動匯入來源，成功後 checkpoint 進到 `sources_ready`
- `quality_filter.js` — 查詢 notebook 讓 Gemini 揪出廣告/宣傳、膚淺心得文、過期資訊等應移除的來源並實際刪除，產出 `quality-filter-report.json`
- `recheck_sources.js` — 查詢 notebook 讓 Gemini 判斷剩下的來源是否足以回答原始主題；不夠就對同一個 notebook 補跑一次範圍更窄的研究，最多 3 輪
- `distill_sources.js` — 查詢 notebook 讓 Gemini 揪出對 `query`／`sub_questions` 沒有實質貢獻的來源（離題，而非單純內容重疊——多筆獨立來源佐證同一件事不算浪費）；若提議移除的比例超過 30%，不會自動刪除，會寫 `distill-report.json` 並停下來等人類看過後用 `--apply` 重跑才執行
- `rename_sources.js` — 查詢 notebook 讓 Gemini 對每個來源分類並建議新標題，逐筆執行 `nlm source rename`
- `query_answers.js` — 逐一查詢 `spec.json` 裡的 `sub_questions`（沒有就用 `query` 本身），取得答案；`nlm query notebook` 不會可靠回傳逐句引用對應，因此額外快照當下完整（已重新命名的）來源清單存成 `sources-final.json`，報告裡以「參考來源清單」附錄呈現，不是逐句加註
- `generate_report.js` — 把上述所有階段的結果組成人類可讀的 `research-report.md`

八支都是純 JavaScript，跑法一律：`node "<本 skill 資料夾>\scripts\<script>.js" <job-id>`。共用邏輯（定位 nlm、讀 job、解析 Gemini 回應的 JSON）在 `scripts/lib/nlm_common.js`。

## 流程（必經十一步，不得省略）

1. **確認環境變數**：`RESEARCH_JOBS_DIR` 沒設定就先請使用者設好，不要猜路徑。
2. **健檢**：跑 `check_provider.js`。`cli_version_ok` 是 `false` 就依 `references/nlm-upgrade-guide.md` 自己升級並驗證，不要等使用者手動處理——只有升級本身卡住（例如檔案被占用的 WinError）才需要請人類協助。`authenticated` 是 `false` 才需要請使用者 `nlm login`。
3. **讀規格**：讀 `<RESEARCH_JOBS_DIR>/<job-id>/spec.json`。
4. **最終確認**：把 `query`、`depth`、預估耗時（`fast`≈30秒、`deep`≈5分鐘）、`max_sources`、`profile` 整理成人類看得懂的摘要，問：
   > ✏️ 即將開始深度研究：**{query}**（{depth} 模式，profile: {profile}）。確認開始嗎？（Y/N）

   **N** 就中止，不呼叫任何 nlm 指令、不建立 notebook。這一步每次執行都要問，包括續跑中斷的 job，不是只在第一次問。
5. **研究**：跑 `run_research.js <job-id>`。這一步會阻塞到研究完成並自動匯入來源（`deep` 模式約 5-6 分鐘），過程中如實告知使用者正在等待，不要自己猜測進度。非零碼結束時如實轉告錯誤內容，不要自己重跑。
6. **品質過濾**：跑 `quality_filter.js <job-id>`。若因為 Gemini 回應格式不符而失敗（非零碼），把 `quality-filter-raw.md` 的內容摘要給使用者看，人工判斷要不要手動移除，不要自己瞎猜著重跑或忽略。
7. **Recheck**：跑 `recheck_sources.js <job-id>`。若輸出提示「回到 sources_ready，重跑 quality_filter.js」，就照做（回第 6 步再跑一次第 7 步），最多重複到腳本自己回報已達 3 輪上限或判定足夠為止——不要在 3 輪之外自己再手動加跑。
8. **蒸餾必要性**：跑 `distill_sources.js <job-id>`。若非零碼結束且 `distill-report.json` 的 `status` 是 `held_for_review`，代表 Gemini 提議移除的比例太高，腳本已經停下來沒有實際刪除——把候選清單摘要給使用者看，問要不要照建議跑 `node distill_sources.js <job-id> --apply`，或使用者想手動編輯 `distill-report.json` 的 `candidates` 後再 `--apply`。不要自己判斷該不該刪、也不要跳過這一步直接進第 9 步。
9. **重新命名**：跑 `rename_sources.js <job-id>`。
10. **逐題查詢**：跑 `query_answers.js <job-id>`，接著跑 `generate_report.js <job-id>` 產出 `research-report.md`——**這是給人類看的固定資產**，不要自己在對話裡手打報告內容。
11. **交棒 ingest**：把 `research-report.md` 存進 `raw/deep-research/<job-id>/`（依現有 `raw/deep-research/readme.md` 規範），告知使用者可以呼叫 `wiki-ingest` 整理進 `wiki/`。

## 規則

- **不寫死任何本機路徑**；job 狀態一律用 `RESEARCH_JOBS_DIR` 定位。
- **不加鎖**：v3 架構已拍板單一使用者本機執行，不需要、也不應該實作 SQLite 或檔案鎖。
- **notebook id 一旦解出來就只能用 `-n` 帶入，不能再用 `--title`**：任何重試/補研究路徑都必須重用既有 notebook，`--title` 只在整個 job 第一次呼叫 `research start` 時用一次，之後絕對不再出現，這是為了避免重演「一次中斷跑出好幾個重複 notebook」的 bug。
- **CLI 呼叫成功就不要因為本地解析失敗而重試會建立資源的指令**：exit code 是判斷「這次呼叫要不要重試」的唯一依據，本地 regex/JSON 解析失敗只代表要如實回報、停下來，不代表可以假設「上次沒做」而重跑一次會建立新 notebook 或觸發副作用的指令。
- **刪除來源一定要帶 `--confirm`**：`nlm source delete` 沒帶這個旗標會卡在互動式確認，在腳本裡等於卡死。
- **Gemini 的結構化回應解析失敗時，不要自動代為判斷**：`quality_filter.js`／`recheck_sources.js`／`distill_sources.js`／`rename_sources.js` 任何一個解析失敗都會把原始回應存檔並以非零碼結束，呼叫端要如實轉告使用者，不要自己重新詮釋 Gemini 的自然語言回應去猜測該刪什麼、該不該視為足夠。
- **蒸餾比例過高時，不要代替人類決定要不要刪**：`distill_sources.js` 提議移除超過 30% 的來源時會停在 `held_for_review`，不會執行刪除。這時只能把候選清單轉告使用者、等使用者確認或修改後再跑 `--apply`，不能自己判斷「看起來合理」就代為加上 `--apply`。
- **`research-report.md` 是唯一的人類可讀資產**：一律靠 `generate_report.js` 產生。
