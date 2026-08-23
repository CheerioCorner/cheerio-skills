---
name: deep-research-execute
description: 執行已完成規劃的 NotebookLM/Gemini Notebook 深度研究任務。當使用者說「執行研究」「開始跑研究」「匯入研究來源」「開始搜尋研究」「執行 deep research」時觸發，負責健檢 nlm CLI、執行分段輪詢研究、篩選候選來源，並引導人類確認後，安全且 idempotent 地匯入來源至 NotebookLM。
---

# Deep Research Execute

深度研究流程的**執行段**：讀 `deep-research-intake` 產出的 `spec.json`，跑健檢 → 研究 → 篩選 → 人類確認 → 匯入，全程用檔案（不是資料庫）保存進度，中斷後可從 checkpoint 接續。

## 何時改用其他 skill

- 還沒有 `spec.json`（不知道要研究什麼、範圍多大）→ 先用 `deep-research-intake` 收斂需求

## 執行腳本

- `check_provider.js` — nlm CLI 健檢（版本、認證、可用 profile、notebook 數量）
- `run_research.js` — 啟動並分段輪詢研究任務（110s 首輪、5 分鐘間隔、900s 上限，累計耗時含所有 CLI 呼叫），完成後寫出 `source-candidates.json`
- `filter_sources.js` — 對候選來源正規化 URL、去重、評分（must_include/should_include/reference/excluded），依 `budget.max_sources` 做數量控管，產出預設的 `source-decisions.json`
- `generate_report.js` — 把候選來源／匯入結果整理成人類看得懂的 `sources-report.md`，篩選後與匯入後都要重跑一次
- `import_sources.js` — 依人類核准的清單，idempotent 逐筆匯入到 notebook，單筆失敗不影響其他筆，checkpoint 只在真正成功時推進

四支都是純 JavaScript，跑法一律：`node "<本 skill 資料夾>\scripts\<script>.js" <job-id>`。

## 流程（必經七步，不得省略）

1. **確認環境變數**：`RESEARCH_JOBS_DIR` 沒設定就先請使用者設好，不要猜路徑。
2. **健檢**：跑 `check_provider.js`。`ready` 不是 `true`（版本不合、未認證）就先請使用者 `nlm login`，不要往下跑。
3. **讀規格**：讀 `<RESEARCH_JOBS_DIR>/<job-id>/spec.json`。
4. **研究與輪詢**：跑 `run_research.js <job-id>`。過程中把目前累計等待時間回報給使用者；逾時或重試耗盡會直接以非零碼結束，如實轉告使用者。
5. **篩選並產出報告**：跑 `filter_sources.js <job-id>`，接著跑 `generate_report.js <job-id>` 產出 `sources-report.md`——**這是給人類看的固定資產，篩選完一定要重新產生一次**，不要自己在對話裡手打候選清單。
6. **人類確認關卡**：把 `sources-report.md` 的內容（或其連結）呈現給使用者，問：
   > ✏️ 已篩選出候選來源，預設將匯入 `must_include`／`should_include` 的來源。
   > - 輸入 **Y**：同意，匯入預設名單
   > - 輸入 **指定序號**（如 `1, 3, 5`）：只匯入這些
   > - 輸入 **N**：取消本次匯入

   若使用者指定序號，先更新 `source-decisions.json` 再往下一步。**停在這裡等回覆，不要自己代為決定。**
7. **匯入並更新報告**：跑 `import_sources.js <job-id>`，跑完再跑一次 `generate_report.js <job-id>`——這次會把實際匯入結果（成功/重複跳過/失敗）併進 `sources-report.md`，成為這個 job 最終的、人類可以直接打開看的紀錄。有失敗項目時如實告知使用者「下次執行 `import_sources.js` 會自動重試」，不要自己反覆重跑。

## 規則

- **不寫死任何本機路徑**；job 狀態一律用 `RESEARCH_JOBS_DIR` 定位。
- **不加鎖**：v3 架構已拍板單一使用者本機執行，`import_sources.js` 不需要、也不應該實作 SQLite 或檔案鎖。
- **單筆匯入失敗不中斷整體**：`import_sources.js` 遇到單一來源匯入失敗要記錄錯誤繼續下一筆，嚴禁整個程序崩潰退出。
- **`sources-report.md` 是唯一的人類可讀資產**：不要另外發明別的報告格式或在對話裡重新排版一次候選清單，一律靠 `generate_report.js` 產生、靠使用者直接開檔案看。
