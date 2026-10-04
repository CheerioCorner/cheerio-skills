---
name: cheerio-roadmap
description: 用「駕駛艙」HTML Artifact 呈現目前工作狀態——決策台／看板／支線圖／細節四層。當使用者問「工作有什麼」「現在進度」「目前的任務有哪些」「今天做什麼」「有什麼要我決定的」，或任何 agent 更新了 work/current.md 之後，都要重繪並更新這份駕駛艙。當使用者提到「駕駛艙」「看板」「路線圖」「Roadmap」「Cheerio 路線圖」時也直接使用。
---

# Cheerio 駕駛艙

> 唯一的工作狀態**視覺化**入口。資料唯一來源是 `Obsidian/work/current.md`；
> 本 skill 只負責把它畫成駕駛艙並更新同一個 Artifact 連結，不建立另一套狀態。

> **2026-09-19：地鐵路線圖已退休。** 原本的地鐵圖是拓撲圖，強項是「路線怎麼走」，
> 不是「今天動哪一張」——站點不能消失，所以完成越多、今天那一站被稀釋越小；
> 狀態只靠填色深淺編碼，40 個站上分不出來。舊的 HTML 留在
> `Obsidian/work/roadmap/cheerio-roadmap.html` 存檔，**不再重繪**。
> skill 名稱維持 `cheerio-roadmap` 不改，避免打斷跨機器安裝指令與既有引用。

## 四層結構

```
L0 決策台   只有人類能拍板、五分鐘講得完的事      ← 先看
L1 看板     決策完之後，今天動哪一張
L2 支線圖   每條線各自的形狀（3–6 條）
L3 抽屜     單項細節                              ← 任何一層點下去都通到這裡
```

**關聯靠 L3。** 決策卡、看板卡片、支線圖底下的 chip，點任何一個都開同一個抽屜；
抽屜裡「它擋住誰／誰擋住它」是可點的，點了直接換成那一項；底下一顆按鈕會關掉抽屜
並捲到它所屬的支線。這是這個設計的重點——**不要做成三張各自為政的圖**。

## 什麼時候要重繪

1. 使用者問工作進度／現況／目前任務／今天做什麼／有什麼要決定的（任何形式）
2. 任何 agent 更新 `work/current.md`（新增／完成／改優先序／改狀態）之後，主動重繪一次
3. 使用者明確提到「駕駛艙」「看板」「路線圖」

## 前提

- **Artifact 工具**：目前只有 Claude Code 有。Pi／Gemini(agy)／Codex／Copilot 遇到上述觸發時，
  只能從 `state.json` 讀 `artifact_url` 把連結貼給 Cheer（連結是帳號層級頁面，任何裝置登入都看得到），
  **不要自己另外產生 HTML 或用別的方式「畫」**——會產出一堆格式不一致的檔案。
- **diagram-design plugin**：`claude plugin install diagram-design@diagram-design`
  （marketplace 先 `claude plugin marketplace add cathrynlavery/diagram-design`）。
  L1 看板與 L2 支線圖的版位、配色、複雜度預算全部照它的規格，不要自己發明。
  reference 在 `~/.claude/plugins/cache/diagram-design/diagram-design/<版本>/skills/diagram-design/`。

## 重繪流程

1. 讀 `Obsidian/work/current.md` 目前狀態
2. 讀 `state.json` 拿 `artifact_url`（用來更新同一個連結，不是建新的）
3. 讀**上次真實輸出** `Obsidian/work/roadmap/cheerio-cockpit.html`——這是最貼近當下的結構範本。
   第一次不存在時才退回讀這份 skill 的 `references/template.html`（通用範本，假資料）
4. **只編輯 HTML 裡的 `DATA` 物件**（見下節），不要手寫 SVG 座標
5. L2 支線圖只有在**支線結構真的變了**才重畫（新增／移除一條線、某條線的形狀改變）。
   單純的項目狀態變動不用動圖，改 `DATA` 就好
6. 用 Artifact 工具發布，**務必帶 `url` 參數＝`state.json` 的 `artifact_url`**
7. 發布成功後把完整 HTML 寫回 `Obsidian/work/roadmap/cheerio-cockpit.html`（覆蓋）。
   **不要寫回 `references/template.html`**——那份要進共用 repo，不能帶真實資料

## 資料驅動：只改 DATA，不要手寫三份

頁面底部有一個 `DATA` 物件，`asOf` / `branches` / `decisions` / `board` / `items` 五個欄位。
下面的渲染層從同一份資料算出導覽列、決策台、看板 SVG、抽屜內容——**四處都是算出來的**，
不要手動改 SVG markup，也不要另外維護一份卡片 HTML。渲染層（`renderBoard` 等）除非要改
視覺風格，否則完全不用動。

L2 的六張支線圖是例外：每張型別不同、幾何各自手繪，寫在 HTML 的 `<section>` 裡。

## L0 決策台：怎麼從 current.md 撈

**這是整個設計最有價值的一層，也最容易做錯。** 決策不是工作——
「安裝 OCR」是工作，「OCR 評估到底做過沒」是決策。把兩者混在同一欄，就會變回
「看起來很像進度、實際看不出要做什麼」。

怎麼撈：

```bash
grep -nE "待 Cheer|供確認|尚未明確|待確認|由 Cheer 主導|狀態不明|建議跳過|決策點" \
  Obsidian/work/current.md | grep -vE "已拍板|已確認"
```

再加上這幾類（grep 撈不到，要自己判斷）：

- **卡很久沒動，而原因不是外部依賴**的項目——卡在「沒人拍板的假設」就是決策
- **已經跨過原訂階段但項目還掛著**的——例如早就在日常使用卻還標「評估中」，要決定結不結案
- **資料一致性問題**——重複 ID、壞掉的 wikilink、對不起來的相依。這類沒有 work item 可點，
  用 `warn:true` 標起來

每張卡三件事：`title` 用問句或決定點、`now` 寫現況（事實，不要形容詞）、
`unlock` 寫**拍板之後什麼會動**。

> **`unlock` 寫的是事實，不是優先序建議。** Cheer 明確說過「不一定是你安排的，我會想看它的
> detail」——決策台要平鋪讓他自己挑，不要幫他排第一第二。每張只告訴他「動這個會解鎖什麼」。

建議 4–9 張。超過表示混進了執行任務，回頭重篩。

## L1 看板：硬預算

照 `references/type-kanban.md`：

| 限制 | 值 |
|---|---|
| 欄數 | ≤ 5 |
| 每欄卡片 | ≤ 4 |
| 全圖卡片 | ≤ 12 |
| 全圖橘色元素 | ≤ 2 |

超出的欄位**聚合成一張 `state:"agg"` 計數卡**（`+N more`），不要讓欄位長出畫布。
`count` 是該欄真實項目數（可以大於卡片數），`limit` 只給「流程中」的欄位——
queue 與終端欄位不設 limit。`count > limit` 時 WIP chip 自動轉橘，那是兩個橘色之一；
另一個是唯一那張 `blocked` 卡。**沒有箭頭**——看板是狀態普查，不是流程圖。

## L2 支線圖：型別怎麼挑

**不要六張都畫成同一種進度條。** 挑最貼合那條線真實形狀的型別：

| 那條線長什麼樣 | 型別 |
|---|---|
| 建置／相依順序，有扇入（多個東西依賴同一個） | dependency graph |
| 同上但每個節點只有一個上游、沒有循環 | tree（`type-dependency.md` 明講這時不要用 graph） |
| 多個負責人／多個外部系統的流程 | process |
| 一層要等下一層完成的先修堆疊 | layer stack |
| 回到起點、中心累積狀態的迴圈 | loop |
| 元件與連線、想指出單一必經點 | architecture |
| **四個節點排一條直線** | **不要畫圖，用表格** |

最後一列是認真的。diagram-design 的第一條規則是「刪掉」——一個三欄表格講得一樣清楚就用表格。
硬畫一張四方框連一條線的圖，正是 Cheer 當初嫌棄地鐵圖的那種裝飾。

畫之前**先讀 `references/type-<型別>.md`**，每種型別的版位與預算都不同，而且是硬的
（一張圖 ≤9 節點、≤12 箭頭、≤2 橘色；loop 5–8 站；layer stack 4–6 層…）。
六條連接線規則（圓角直角肘、標籤離線 6–10px、不重疊、共用邊要分開接點、
不穿過非端點的框、標籤遮罩不被後畫的節點蓋掉）沒有例外。

## 繁體中文排版（diagram-design 的硬規則）

Geist 與 Instrument Serif 都沒有漢字，所以：

- **字體疊加，不要換皮**：`'Geist','Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif`；
  標題用 `'Instrument Serif','Noto Serif','Noto Serif TC',serif`
- **12px 下限**：中文名稱不得小於 12px。放不下就**砍字，不要縮字級**
- **mono 只放拉丁**：port、指令、URL、work item ID 留在 Geist Mono。
  9px mono 塞中文既沒有字面可 fallback 也讀不了
- **圖例／eyebrow／箭頭標籤要換檔**：這些槽位原本是 7–8px mono 大寫加字距，
  中文進去要變成 **12px sans weight 500、不大寫、不加字距**，遮罩高度跟著長到 16px。
  同一張圖裡的拉丁標籤維持 mono 待遇

所以看板上會看到圖例的中文比節點副標大——那是規格刻意的，不是排版失誤。

## self_check 會 FAIL，這是預期的

`python <diagram-design>/scripts/self_check.py cheerio-cockpit.html` 會報兩個錯：
script 不是正規的動畫控制器、找不到 `data-motion-root`。

原因是 diagram-design 規定「靜態優先，JS 只能用於動畫控制」，而駕駛艙的 JS 是**導覽與抽屜**。
那條規則是為「單張圖的交付檔」設計的，這頁是儀表板，drill-down 靜態 HTML 做不到。
**這是刻意的偏離，不要為了讓 checker 過而拿掉抽屜。** 六張圖各自拆出來檢查仍然應該是 OK 的。

## 檔案

| 檔案 | 是什麼 |
|---|---|
| `state.json`（skill 內） | `{ "artifact_url": "..." }`，唯一要跨 session 記住的東西 |
| `references/template.html`（skill 內） | **通用範本**，只有設計系統＋示範假資料＋一個示範支線 section。會同步進共用 repo |
| `Obsidian/work/roadmap/cheerio-cockpit.html`（vault 內） | **上次真實輸出**，含真實 work item。重繪時優先讀這份；發布後覆蓋這份 |
| `Obsidian/work/roadmap/cheerio-roadmap.html`（vault 內） | 已退休的地鐵圖，存檔不刪、不再重繪 |

> **⚠️ 兩份 HTML 絕對不要搞混。** 2026-08-22 曾經誤把真實工作資料寫進
> `references/template.html` 並同步進共用 GitHub repo。那份 repo 是給其他機器拉取的，
> 放真實資料等於把私人工作內容外流。改完範本後先 grep 一次：
> `grep -nE "W-2026|真實 ID|公司名" references/template.html` 應該只命中警告註解本身。

## 跨機器同步

本機是 source of truth。改了 `SKILL.md` 或 `references/template.html` 之後，手動同步進
`C:/Cheerio/CheerioCorner/cheerio-skills/skills/cheerio-roadmap/` 並 commit + push，
其他機器才能用 `npx skills add CheerioCorner/cheerio-skills@cheerio-roadmap -g -a pi` 拉到最新版。
**push 前跟 Cheer 確認一次，並親自核對內容沒有真實私人資料。**

`state.json` 的 `artifact_url` 不需要同步——它是帳號層級頁面，任何裝置登入都看得到。
但「重繪」這個動作仍然只能在有 vault + Artifact 工具的機器上做。

`Obsidian/work/roadmap/*.html` 一律不同步，它們在 vault 裡，本來就不會被這個流程碰到。

## 公司端另開一支

公司的工作追蹤／工時統分是 Azure DevOps，是另一套資料源，**不要跟 vault 資料混在同一個 Artifact**。
那邊要另建 skill（暫定 `devops-analysis-report`）。但這套設計系統（CSS token、渲染層、
四層結構）是資料源無關的，可以直接搬過去重用，只要換掉 `DATA` 的產生邏輯。見 `W-075`。

## 回饋機制

Artifact 原生支援留言。Cheer 在頁面上進入留言模式、選取某張卡留言並 @claude 啟用該串，
Claude 就看得到。當下 session 若訂閱連線中會直接被通知；換了新 session，需要 Cheer 主動提
「去看駕駛艙留言」，Claude 才會用 ArtifactComments 工具去讀。未啟用的留言看不到也不會被通知，
這是刻意設計。
