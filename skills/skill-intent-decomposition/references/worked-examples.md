# 實際拆過的案例

## 案例 1：Azure DevOps Board（13 支 skill）

**地基（12 條 Human 意圖，節錄）**：調整 Time Tracker 的 Role、把 Process 複製到 Collection、複製某 Project 的 Settings、自動建立年度/區間的 Iterations、上傳手冊到 Wiki、建立/調整某 Team 如何使用 Board、取得某 Team 的 Board WIT 設計/Policy、取得 WIT/Extension 的 DATA、目前手上有哪些工作/工時查詢、新增/更新工作/指派他人/移 Sprint、分析案子/分析同仁的工作狀況、設計分析的 Rule 與呈現方式。

**決策樹第一刀：跟哪個層級/類別有關？**

| 層級 | 意圖數 | 最終 skill |
|---|---|---|
| Collection 集合 | 2 | `devops-collection-time-tracker-roles`、`devops-collection-process-migration` |
| Project 專案 | 2 | `devops-project-settings-migration`、`devops-project-wiki-query`/`-maintainer` |
| Team 團隊 | 1 | `devops-team-iterations-planner` |
| Board / WIT / 工作與工時 | 5 | `devops-board-wit-design`、`-design-reader`、`devops-board-work-query`、`-status`、`-maintainer` |
| 分析 | 2 | `devops-project-work-analytics`、`devops-project-analytics-design` |
| 跨枝共用 | 1 | `devops-connection-auth`（認證，被其他 12 支共用） |

**第二刀（在 Board/WIT 這一大枝裡，意圖夠多，繼續照動詞切）**：
- `-design` vs `-design-reader` → 寫 schema/policy vs 只讀 schema/policy
- `-work-query`（唯讀撈原始資料）vs `-work-status`（呈現彙整）vs `-work-maintainer`（唯一負責寫入）

**組合技範例**：「這張 User Story 一直被退，幫我查清楚問題出在哪，然後更新它」→ `work-query`（撈現況與退件紀錄）→ `wiki`（讀驗收準則）→ `analytics`（比對相似案子找常見原因）→ `work-maintainer`（過安全門後回寫）。四支各自獨立，串起來才能處理複雜情境。

---

## 案例 2：Cheerio 旅遊地圖（5 支 skill）

**地基**：使用者想要一套跟「知識花園」邏輯一致、但用在旅行規劃的 Notion 系統，資料庫定案為地方誌（洲/國家/城市，固定四層）、見聞錄（餐廳/景點/住宿/店家/主題筆記，掛在地方誌底下）、旅程（一趟旅行的容器）、行程項目（旅程頁面內嵌的操作層，不是獨立支柱）。

**決策樹第一刀：知識層 vs 操作層（Bounded Context）**

「地方誌＋見聞錄」是持續累積、很少覆寫的知識資產；「旅程＋行程項目」是有明確生命週期、會被頻繁修改的操作資料——同一個「新增一筆記錄」的動作，在這兩層的風險與頻率完全不同，值得分開。

**第二刀：查詢永遠獨立（讀寫分家），特殊時機獨立成一支**

| 葉節點 | 對應意圖 | 唯一負責 |
|---|---|---|
| `travel-map-query` | 「這裡有什麼推薦」「之前去過哪裡」 | 唯讀，橫跨全部 4 個資料庫 |
| `travel-map-knowledge-capture` | 「把這個地方存進去」「這間店加進見聞錄」 | 地方誌／見聞錄的屬性與關聯寫入 |
| `travel-map-trip-planner` | 「我要排一趟去 XX 的行程」「幫這趟加個景點」 | 旅程／行程項目的寫入 |
| `travel-map-trip-feedback` | 「這趟旅程回來了，幫我整理心得」 | 觸發時機獨立（旅程完成後）、橫跨三個資料庫分流寫回 |
| `travel-map-page-content` | 「幫這間店寫內容」「查一下簽證怎麼辦」 | 頁面正文的查證與撰寫，被前三支共同呼叫 |

**為什麼「內容生成」獨立一支**：這不是照資源或動詞切的，是照「風險類型」切的——查證錯誤（地址、簽證規定）跟屬性寫錯的後果完全不同，值得用獨立的 Mode 切換（Quick Draft / Enriched）跟品質關卡處理，不該跟「建立記錄」這個機械動作綁在一起。

**沒有做的事**：沒有幫「地方誌」「見聞錄」「旅程」「行程項目」四個資料庫各切一支 skill。因為「旅程完成回饋」這種高頻動作會一次 touch 到三個資料庫，照資料庫拆只會讓同一件事要載入好幾支 skill 才能做完，違反組合技的初衷（切細是為了組得起來，不是切碎）。
