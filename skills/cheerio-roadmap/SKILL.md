---
name: cheerio-roadmap
description: 用地鐵路線圖風格的 HTML Artifact 呈現目前工作進度。當使用者問「工作有什麼」「現在進度」「目前的任務有哪些」，或任何 agent 更新了 work/current.md 之後，都要重繪並更新這份路線圖。當使用者提到「路線圖」「Roadmap」「Cheerio 路線圖」時也直接使用。
---

# Cheerio 路線圖

> 唯一的工作狀態**視覺化**入口。資料唯一來源是 `Obsidian/work/current.md`；本 skill 只負責把它畫成地鐵路線圖並更新同一個 Artifact 連結，不建立另一套狀態。

> **⚠️ 兩份 HTML，用途完全不同，不要搞混：**
> - `references/template.html`（這個 skill 資料夾裡面）＝**通用結構範本**，只示範設計系統與全部站點狀態的假資料，**絕對不放 Cheer 真實的工作項目內容**。這份會被同步進共用的 `CheerioCorner/cheerio-skills` GitHub repo 給其他機器拉取，放真實資料等於把私人工作內容外流到共用 repo。
> - `Obsidian/work/roadmap/cheerio-roadmap.html`＝**上一次實際重繪的完整輸出**（含真實 work item），存在 vault 裡，不隨 skill 同步流程移動。**這才是「上次產出當範本抄」時真正要讀的檔案**——如果不存在（例如全新 vault 第一次跑），才退回讀 `references/template.html` 抄設計系統結構。
> - 2026-08-22 曾經誤把真實工作資料寫進 `references/template.html`，已經同步進了共用 repo（之後會清掉重推）。這個備註是為了避免重犯。

> **這個 skill 只管 Cheerio 個人知識系統的工作（`Obsidian/work/current.md`）。** 公司端的工作追蹤／工時統分是另一個系統（Azure DevOps），不要把兩邊資料混在同一個 Artifact 裡，也不要把這個 skill 直接套用到公司資料上——那邊要另開一個 skill（暫定 `devops-analysis-report`），資料源改讀 Azure DevOps work item/工時，但 **CSS/JS 這套「地鐵路線圖」設計系統（`references/template.html` 裡 `<style>` 與 `<script>` 區塊）本身是資料源無關的，可以直接搬過去重用**，只需要換掉 SVG 站點資料的產生邏輯與 `DETAILS`/卡片的欄位對應。2026-08-22 Cheer 已確認這個重用方向，屆時另建 skill 時參照本檔案的「設計系統」章節。

## 什麼時候要重繪

1. 使用者問工作進度/現況/目前任務（任何形式：「我們工作有什麼」「現在做到哪」「今天可以做什麼」）
2. 任何 agent 更新 `work/current.md`（新增/完成/改優先序/改狀態）之後，主動重繪一次，不用等 Cheer 問
3. 使用者明確提到「路線圖」「Roadmap」

## 前提：只有具備 Artifact／可發布網頁能力的 harness 才能重繪

目前只有 Claude Code 有 Artifact 工具。Pi／Gemini(agy)／Codex／Copilot 沒有這個能力，遇到上述觸發時只能：
- 從 `state.json` 讀出 `artifact_url`，把連結貼給 Cheer（連結本身是 claude.ai 帳號層級的頁面，任何裝置登入帳號都看得到，不需要在那個 harness 上重繪）
- 不要嘗試自己產生 HTML 檔案或用其他方式「畫」路線圖——沒有 Artifact 工具就不做這件事，避免產出一堆各自為政、格式不一致的檔案

## 重繪流程（Claude Code）

1. 讀 `Obsidian/work/current.md` 目前狀態（In progress / Blocked / Backlog）
2. 讀 `state.json` 拿到 `artifact_url`（已存在的 Artifact 連結，用來更新而不是重新建立）
3. 讀**結構範本**：優先讀 `Obsidian/work/roadmap/cheerio-roadmap.html`（上次真實輸出，最貼近當下格式）；這個檔案第一次不存在時才退回讀這份 skill 的 `references/template.html`（通用結構範本）
4. 把工作項目分組成「軌道」（tracks）——沒有固定分法，每次依當下工作的自然分群判斷，經驗法則：
   - 同一個 work item 文字裡標記「同組任務」「blockedBy」「依序推進」的，同一軌道
   - 明顯不同領域（例如「知識花園」vs「基礎設施」vs 某個大型 feature）分開軌道
   - 一個 session 通常抓 3–6 條軌道，太多條會擠爆圖，超過的用「背景/待裁切」的次要列處理
5. 每個站點的狀態四選一，並用同一套圖例（不要新發明符號）：
   - `st-ready`（實心、accent-today 外框）＝ 今天可直接動手
   - `st-wait`（空心）＝ 進行中，卡在等外部或等 Cheer
   - `st-dim`（半透明空心）＝ 排後面／有空再做
   - `st-done`（半透明實心）＝ 已完成
   - 獨立的 30 秒小決策用旋轉 45° 的菱形（`.decision`），不算進任何軌道
6. 「今天」虛線要標實際日期（用執行環境當下的系統日期，不要用固定字串）
7. **資料驅動架構（2026-08-22 起），不要手寫三份重複資料**：範本裡有一個 `ROADMAP` JS 物件（tracks → stations，每個站點同時帶 SVG 版位資料與 popover 內容），`renderSVG`/`buildDetails`/`renderCards` 三個函式從同一份資料算出 SVG、彈出卡片內容、下方卡片區——**只需要編輯 `ROADMAP` 這個資料物件本身**（新增/刪除/修改站點、track、connectors），不要手動改 SVG markup 或另外維護 DETAILS/卡片 HTML。CSS 設計系統（顏色、字體、zoom 工具列、可拖移浮動 popover、Read more 導頁+邊框與背景雙重閃爍高亮）完全不用動，除非 Cheer 明確要求改視覺風格。座標（x/y）仍是明確指定，不做智慧自動排版，新增站點時比照鄰近站點的座標間距手動給值即可
8. 用 Artifact 工具發布，**務必帶 `url` 參數＝`state.json` 裡的 `artifact_url`**，這樣是更新同一個連結而不是產生新的 Artifact
9. **發布成功後，把這次完整的 HTML 內容寫回 `Obsidian/work/roadmap/cheerio-roadmap.html`（覆蓋），不要寫回這個 skill 資料夾裡的 `references/template.html`**——後者是要進共用 repo 的通用範本，不能帶真實工作資料
10. 發布後如果 `artifact_url` 有變（理論上不會，因為都是同一個 url 更新），要回寫 `state.json`

## 設計系統（不要重新發明，照 references/template.html 抄）

- 字型：Noto Sans TC（標題/內文，含中文）＋ IBM Plex Mono（ID／日期／數字，等寬對齊）
- 配色 token：`--line-*` 系列給軌道上色，`--accent-today` 專門標記「今天」與「決策點」，深淺主題都要定義（見 template 的 `:root` / `prefers-color-scheme` / `[data-theme]` 三層）
- 站點一律可點擊，點下去彈出可拖移、指向該站點的浮動卡片（`position:fixed`，不會被頁面捲動吃掉）
- 浮動卡片有「Read more →」導到下方對應的完整任務卡片並閃爍高亮
- 圖表原生寬度固定（目前 1360px），外層用捲動而非壓縮字體；另外提供 ＋/－/重置縮放工具列
- 箭頭 marker 用 `markerUnits="userSpaceOnUse"` 固定小尺寸，每條軌道各自一份顏色對應的 marker，不要共用單一黑色/currentColor marker（曾經因為跟著 stroke-width 縮放而爆大）
- 頁面右下角固定一顆「⬆ 回到路線圖」按鈕（`.back-to-top`），任何捲動位置都常駐，點擊平滑捲回 `.map-card`（SVG 診斷圖本身，不是頁面最頂端）。手機寬度（≤640px）縮成純圖示。2026-08-23 Cheer 要求新增，往後重繪不用重新設計，照 template 抄
- 標題下方有一組「🗺️ 路線圖／📋 Task Dashboard」切換分頁（`.view-tabs`），詳見下一節，往後重繪不用重新設計，照 template 抄

## 兩種檢視：路線圖 vs Task Dashboard（2026-08-25 新增）

**背景**：軌道（track）是依「領域/依賴關係」分組，同一軌道裡混著 ready/wait/dim/done 各種狀態，跨軌道看的話「今天該先做哪個」不容易一眼判斷。與其把每個 work item 拆成互不相關的孤立節點（會丟失同軌道內的依賴脈絡，且一樣看不出優先序)，改成**同一份資料、兩種檢視角度**：

- **路線圖檢視**（`#view-roadmap`，預設顯示）＝ 現有的地鐵圖 + 下方依 track 分組的卡片區，看的是「這件事跟其他事的關係、脈絡」
- **Task Dashboard 檢視**（`#view-dashboard`）＝ 同樣的卡片，改成依「狀態」分成 4 欄的看板（今天可動手／進行中／排後面／已完成），不分領域，看的是「我現在該做哪個」——最左欄就是答案

兩顆按鈕在頁面上方（`.view-tabs`），點擊切換 `.view` 容器的 `.hidden` class，同時把右下角「回到路線圖」浮動按鈕一起隱藏/顯示（因為它只對路線圖檢視有意義）。

**實作要點，重繪時不用重新設計**：
- Dashboard 卡片**沒有另外寫一份資料**，是從 `ROADMAP.cardSections` 攤平重組來的（`flattenCards`/`renderDashboard`），依 `card.pill`（today/wait/dim/done）分桶，桶內順序＝原本在 `cardSections` 裡被寫入的順序，也就是重繪時你組資料的順序＝隱含的優先序。**不需要額外加 priority 數字欄位**——重繪時把每個 track 裡比較該優先處理的站點排前面寫進 `ROADMAP` 即可，兩種檢視會自動反映同一個順序
- 每張 dashboard 卡片會多顯示一個「track-tag」（小色點 + 軌道名稱），因為離開了 track 分組，需要保留「這件事屬於哪個領域」的上下文
- Dashboard 卡片 id 加了 `-dash` 後綴避免跟路線圖卡片區的原始 id 衝突（同一頁面兩份 DOM 都存在，只是用 `.hidden` 切換顯示）

## 檔案

- `state.json`（skill 資料夾內）— `{ "artifact_url": "..." }`，唯一需要跨 session 記住的東西
- `references/template.html`（skill 資料夾內）— **通用結構範本**，只含設計系統與示範假資料，會同步進共用 repo，**不放真實工作資料**
- `Obsidian/work/roadmap/cheerio-roadmap.html`（vault 內，不在 skill 資料夾）— **上一次實際重繪的完整輸出**，含真實 work item，重繪時優先讀這份當結構範本；發布後覆蓋這份，不覆蓋上面那份

## 跨機器同步

本機（這台）是 source of truth。改了 `SKILL.md` 或 `references/template.html`（通用範本）之後，要手動同步進 `C:/Cheerio/CheerioCorner/cheerio-skills/skills/cheerio-roadmap/` 並 commit + push，才能在公司電腦等其他機器上用 `npx skills add CheerioCorner/cheerio-skills@cheerio-roadmap -g -a pi` 拉到最新版。push 前跟 Cheer 確認一次。**`Obsidian/work/roadmap/cheerio-roadmap.html` 一律不同步**——它在 vault 裡，本來就不會被這個同步流程碰到，這正是把它移出 skill 資料夾的原因。

`state.json` 裡的 `artifact_url` 是 claude.ai 帳號層級的頁面，不需要跨機器同步——任何裝置登入同一個帳號都看得到當時最新的內容，只是「重繪」這個動作本身仍然只能在有 Obsidian vault + Artifact 工具的機器上做（因為要讀 `work/current.md`）。

## 回饋機制（2026-08-23 新增）

Artifact 原生支援留言，不用額外開發：Cheer 在頁面上進入留言模式、選取某個站點/卡片留言講想法，並在留言裡 @claude（或用留言串自己的「啟用 Claude」控制項）啟用該串，Claude 就能看到並回覆。若當下 session 對這個 Artifact 的即時訂閱是連線狀態會直接被通知；換了新 session，Cheer 需要主動提「去看路線圖留言」，Claude 才會用 Artifact 工具的 `action: "comments"` 去讀。未啟用的留言 Claude 看不到也不會被通知，這是刻意設計，避免任意訪客留言打擾。
