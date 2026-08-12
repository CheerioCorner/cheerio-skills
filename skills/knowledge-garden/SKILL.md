---
name: knowledge-garden
description: >-
  維護 Notion 知識花園。當使用者提到「種一棵樹」、「更新花園」、「知識花園」、
  「種子」、「灌溉」、「養分」、「整理到花園」、「美化」時使用此 skill。
  也可用於查詢花園現狀。Note: CLI 操作參考 `notion-cli` skill。
---

# 🌱 知識花園維運 Skill

## ⚠️ 前置條件

- Notion 頁面必須已共享給 **CheerioPi** integration
- 如果遇到 404 錯誤，表示頁面尚未共享，請人類在 Notion 中將頁面連接到 CheerioPi
- 讀取使用 MCP `notionApi`，寫入使用 `ntn` CLI
- **CLI 命令語法**：參考 `notion-cli` skill（`~/.agents/skills/notion-cli/SKILL.md`）

## 花園位置

- **Notion 主頁：** https://app.notion.com/p/3ac5979e-3a8c-81d2-b96f-f6c7bdd8fd33
- **Page ID：** `3ac5979e-3a8c-81d2-b96f-f6c7bdd8fd33`
- **類型：** Workspace 頂層頁面（跟「任何當下」、「儀表板」同級）
- **本地 Manifest：** `wiki/entities/knowledge-garden.md`（花園 index/快取）

## 花園結構

```
🌳 知識花園
├── 📊 知識花園 Database（inline，嵌在 callout 裡）
├── ### 種植守則（heading）
│   1. 交叉授粉
│   2. 定期修剪
│   3. 允許變形
│   4. 不急於收割
├── ## 研究專題
│   └── 🔬 Meta-Harness
└── 研究專題（子頁面）
```

### Database 欄位（10 Properties）

| 欄位 | 類型 | 說明 |
|------|------|------|
| 種子 | Title | 種子名稱 |
| 成長狀態 | Select | 🌱 種子期 / 🌿 成長期 / 🌳 成熟期 |
| Tags | Multi-select | 🔬 研究 / 🛠️ 實作 / 📝 筆記 / 💡 靈感 / 📚 學習 / 🎯 研究專題（動態調整） |
| 來源 URL | URL | 原始來源 |
| 視覺地圖頁面 | URL | 該種子的視覺地圖連結 |
| 給我的啟發？ | Rich text | 心得、靈感 |
| 研究專題 | Relation | 所屬研究專題（多對多雙向關聯） |
| Wiki Path | URL | 對應的 wiki 頁面連結 |
| 種下日期 | Date | 首次建立時間 |
| 最後更新 | Date | 最近更新時間 |
| Sync Status | Select | ✅ 已同步 / ⏳ 待同步 / ⚠️ 衝突 |

## Notion 頁面建立規則

### ⚠️ 圖示規則（重要）

**圖示（icon）和標題（title）必須分開：**
- ✅ 正確：icon 設 `🌱`，title 寫 `mattpocock/skills — 第一棵樹苗`
- ❌ 錯誤：title 寫 `🌱 mattpocock/skills — 第一棵樹苗`

建立頁面後，用 API 設定 icon：
```bash
ntn api v1/pages/<page-id> -X PATCH -d '{"icon": {"type": "emoji", "emoji": "🌱"}}'
```

常用圖示：
- 🌱 種子期 | 🌿 成長期 | 🌳 成熟期
- 🗺️ 視覺地圖/總覽 | 📋 清單/附錄 | 🔗 連結

## 操作流程

### 0. 查詢花園現態（manifest check）

**任何操作前**，先讀本地 manifest 快速了解花園現狀：

1. 讀取 `wiki/entities/knowledge-garden.md`
2. 確認：有哪些種子、各是什么 stage、最近更新紀錄
3. 如需詳細內容，再去 Notion 讀取

### 1. 種一顆新種子（新增 seedling）

**觸發條件：** 使用者說「種一棵樹」、「把這個放進花園」、「這可以當種子」、「整理到花園」、「美化」等。

**流程：**

1. **理解來源** — 問清楚或已知：這是什麼？從哪裡來的？為什麼值得種下？
2. **建立 Database 記錄** — 直接在 Database 建立一筆紀錄（這是唯一的頁面）：
   ```bash
   ntn api v1/pages -d '{
     "parent": {"database_id": "f3aa419a-348b-4c66-a8a1-31b67780ebf3"},
     "icon": {"type": "emoji", "emoji": "🌱"},
     "properties": {
       "種子": {"title": [{"type": "text", "text": {"content": "種子名稱"}}]},
       "成長狀態": {"select": {"name": "🌱 種子期"}},
       "給我的啟發？": {"rich_text": [{"type": "text", "text": {"content": "心得"}}]},
       "來源 URL": {"url": "https://..."},
       "Tags": {"multi_select": [{"name": "🔬 研究"}]},
       "種下日期": {"date": {"start": "YYYY-MM-DD"}}
     }
   }'
   ```
3. **補上頁面內容** — 用 `ntn pages update` 加入 markdown 內容：
   ```bash
   ntn pages update <page-id> --content '<markdown>'
   ```
   ⚠️ **不要用 `ntn pages create`！** 那會建立獨立頁面，導致 Database 裡的記錄是空白的。

4. **頁面內容必須包含：**
   - **種子故事** — 這是什麼、為什麼種下
   - **比對分析** — 跟我現有的做法有何異同（表格格式）
   - **成長計畫** — checklist，列出觀察/驗證項目
   - **連結** — 指向原始來源、Obsidian Wiki（如有）
5. **同步本地 manifest**（詳見 §Manifest 自動同步）
6. **（可選）同步到 Obsidian** — 如果來源有對應的 wiki 頁面，確保連結正確

### 2. 灌溉一棵植物（更新 seedling）

**觸發條件：** 使用者說「更新花園」、「這個有新進展」、「灌溉一下」等。

**流程：**

1. **找到對應頁面** — 根據使用者描述定位 Notion 子頁
2. **讀取現有內容** — `ntn pages get <page-id>`
3. **讀取 wiki 頁面** — 如果有對應的 wiki 頁面，讀取最新內容
4. **檢查 GitHub 更新** — 如果有來源 URL，檢查上游最新資訊
5. **更新成長階段** — 根據進展調整：
   - 🌱 種子期 — 剛開始觀察
   - 🌿 成長期 — 有實際使用經驗
   - 🌳 成熟期 — 已內化為自己的方法
6. **更新內容** — 呼叫 `knowledge-garden-page-content` skill 的 Phase 3（整合重寫，不是累加；被推翻的舊內容要標記取代，重大改寫需要發布前確認，見該 skill 說明）
7. **更新成長計畫** — 把已完成的項目打勾，加入新項目
8. **同步本地 manifest**（詳見 §Manifest 自動同步）

### 2.1 批量更新（Batch Update）

**觸發條件：** 使用者說「更新所有種子」、「sync all seeds」、「批量更新」等。

**流程：**

1. **查詢所有種子** — 取得 Database 中所有種子列表
2. **依序處理每個種子：**
   - 讀取 Notion 頁面
   - 讀取 wiki 頁面（如有）
   - 檢查 GitHub 更新（如有來源 URL）
   - 評估成長狀態
   - 執行更新（如需要）
3. **產生摘要報告** — 列出所有變更

**批量更新指令範例：**
```bash
# 查詢所有種子
ntn api v1/data_sources/0785b58a-9976-4163-85be-6854410b6563/query -d '{}'

# 依序更新每個種子
for seed_id in <seed_ids>; do
  ntn pages get $seed_id
  # 讀取 wiki、檢查 GitHub、評估狀態、執行更新
done
```

### 2.2 狀態評估（Growth Evaluation）

**觸發條件：** 使用者說「評估狀態」、「check growth」、「要不要升級」等。

**評估標準：**

| 面向 | 🌱 種子期 | 🌿 成長期 | 🌳 成熟期 |
|------|----------|----------|----------|
| Wiki 頁面 | ≤1 個 | 2-3 個 | ≥4 個 |
| 實際使用 | 無 | 有經驗 | 持續使用 |
| 視覺地圖 | 無 | 有 | 有且更新 |
| 視覺地圖 | 無 | 有 | 有且更新 |
| 文件完整度 | 基礎 | 完整 | 完整 + 範例 |

**評估流程：**

1. 讀取種子頁面
2. 搜尋相關 wiki 頁面數量
3. 檢查是否有視覺地圖
4. 檢查成長計畫完成度
5. 根據標準判斷狀態
6. 建議升級/維持/降級

**評估報告範例：**
```
📊 Omnigent 狀態評估

目前狀態：🌱 種子期
建議狀態：🌱 種子期（維持）

評估：
- Wiki 頁面：1 個（omnigent.md）→ ✅ 符合種子期
- 實際使用：無 → ⚠️ 未開始使用
- 視覺地圖：有 → ✅ 已建立
- 文件完整度：基礎 → ⚠️ 可再補充

建議：
- 等實際測試 WSL2 後再考慮升級
```

### 2.3 GitHub 更新檢查（GitHub Update Check）

**觸發條件：** 使用者說「檢查更新」、「check updates」、「有沒有新版本」等。

**流程：**

1. 讀取種子的「來源 URL」屬性
2. 從 URL 提取 GitHub repo 資訊
3. 使用 GitHub API 檢查：
   ```bash
   # 取得 repo 資訊
   curl -sL https://api.github.com/repos/<owner>/<repo>
   
   # 取得最新 release
   curl -sL https://api.github.com/repos/<owner>/<repo>/releases/latest
   
   # 取得最近 commits
   curl -sL https://api.github.com/repos/<owner>/<repo>/commits?per_page=5
   ```
4. 比較與我們 wiki 記錄的差異
5. 報告需要更新的項目

**GitHub 檢查報告範例：**
```
🔍 OpenCodeReview GitHub 更新檢查

Repo: alibaba/open-code-review
Stars: 19,743（我們記錄：19,300）
最近更新：2026-08-08

需要更新：
- ⭐ Stars 增加 443
- 📝 最近 5 個 commits 有新功能

建議：
- 更新 wiki 頁面的 stars 數據
- 檢查是否有新功能需要記錄
```

### 3. 查詢花園（query）

**觸發條件：** 使用者問「花園裡有什麼」、「那個種子後來怎樣了」等。

**流程：**

1. **先讀本地 manifest**：`wiki/entities/knowledge-garden.md`
2. **查詢 Database** — 取得所有種子的結構化資料：
   ```bash
   ntn api v1/data_sources/0785b58a-9976-4163-85be-6854410b6563/query -d '{}'
   ```
3. 如需詳細內容，讀取 Notion 主頁（使用 MCP 或 `ntn` CLI）：
   - **MCP（推薦）：** `notionApi_API-retrieve-page-markdown` with `page_id: 3ac5979e-3a8c-81d2-b96f-f6c7bdd8fd33`
   - **CLI：** `ntn pages get 3ac5979e-3a8c-81d2-b96f-f6c7bdd8fd33`
4. 列出所有子頁（MCP: `notionApi_API-get-block-children`；CLI: `ntn api v1/blocks/<id>/children`）
5. 讀取相關子頁內容
6. 回答問題，標明來源頁面

### 4. 花園巡檢（lint）

**觸發條件：** 使用者說「巡檢花園」、「整理一下花園」，或定期（例如每次批量更新後）自動執行。

**流程：**

1. 列出所有子頁（種子、研究專題、視覺地圖）
2. 檢查：
   - **停滯種子** — 成長計畫長期無進展
   - **可合併種子** — 內容高度重疊的相似種子
   - **過時內容** — 最後更新 > 14 天且來源已有新進展（同 `knowledge-garden-trigger` 判定）
   - **內容空洞** — Sync Status 標記 `📝 待補強`，或頁面只有標題/空白區塊、沒有具體事實或判斷句
   - **累加未整併** — 同一主題在頁面裡被提到多次卻沒有互相參照或取代標記，代表是累加而不是整合寫的（見 `knowledge-garden-page-content` Phase 3）
   - **缺視覺地圖** — 種子已達 🌿 成長期以上，或研究專題有 ≥3 顆種子貢獻，但沒有對應的視覺地圖頁面
   - **研究專題過大** — 種子貢獻矩陣超過 8 顆種子，或內容明顯涵蓋多個不相關子題，建議拆分（見 `knowledge-garden-trigger`）
3. 提出建議清單，區分：
   - 🤖 可自動處理：補視覺地圖、標記待補強、提示停滯種子
   - 👤 需要人類確認：合併種子、拆分研究專題、任何會覆寫大段既有內容的整併
4. 🤖 項目直接執行；👤 項目使用者確認後執行

## 頁面模板

⚠️ **頁面內容由 `knowledge-garden-page-content` skill 專責產生。**

當需要建立或更新頁面內容時：
1. 讀取 Schema：`schemas/seed_schema.yaml`（位於本 Skill 目錄下；完整路徑為 `~/.agents/skills/knowledge-garden/schemas/seed_schema.yaml`）
2. 載入 `knowledge-garden-page-content` skill
3. 根據成長階段選擇對應模板（Quick Draft 或 Enriched）

本 skill 只負責流程調度（建立記錄、更新狀態、同步 manifest），不負責頁面內容生成。

## 花園階段定義

| 階段 | 圖示 | 定義 | 行動 |
|------|------|------|------|
| 種子期 | 🌱 | 剛開始，正在觀察和吸收 | 比對分析、列出成長計畫 |
| 成長期 | 🌿 | 有實際使用經驗，正在調整 | 記錄觀察、開始改編 |
| 成熟期 | 🌳 | 已內化為自己的方法 | 可以開始教別人、衍生新種子 |

## 資料流說明

```
raw/ ──wiki ingest──► wiki/ ──美化/整理──► Notion 花園
 ▲                     │                      │
 │                     │                      │
 │    ┌────────────────┘                      │
 │    │                                       │
 │    └──── 「這個要深入研究」 ◄───────────────┘
 │          （人類給 URL 或指定頁面）
 │          （AI 去抓內容）
 │
 └─────────────────────────────────────────────┘
```

- **「存進大腦」**：raw → wiki（wiki ingest）
- **「整理到花園」/「美化」**：wiki → Notion（本 skill）
- **「花園裡有什麼」**：查 manifest → 回答
- **「花園裡那篇 [X] 要深入研究」**：Notion → raw → wiki

## Manifest 自動同步

**原則：** 每次 Notion 寫入操作後，必須同步更新本地 manifest。這是確保雙向一致性的關鍵。

### 同步時機

| 操作 | Manifest 動作 |
|------|---------------|
| 新增 seedling | 在「🌱 新種下的種子」表格加一行；在「最近更新紀錄」加一行 |
| 更新 seedling（改 stage） | 在對應表格移動行（🌱→🌿 或 🌿→🌳）；在「最近更新紀錄」加一行 |
| 刪除/歸檔 seedling | 從表格移除該行；在「最近更新紀錄」加一行 |
| 讀取/查詢 | 不需要同步 |

### 同步格式

**新增行格式（seedlings 表格）：**
```markdown
| <名稱> | [連結](<Notion URL>) | <Stage emoji> <Stage 名稱> | [[wiki/<path>|<wiki link>]] |
```

**新增行格式（最近更新紀錄）：**
```markdown
| <YYYY-MM-DD> | <事件描述> | <種子名稱> |
```

**時間戳更新：**
修改 frontmatter 的 `updated` 欄位為當天日期。

### 同步檢查清單

每次操作後，確認：
- [ ] Seedlings 表格與 Notion 實際狀態一致
- [ ] 最近更新紀錄已新增
- [ ] frontmatter `updated` 已更新
- [ ] 如有新種子，確認 Notion Link 正確

---

## 維護原则

1. **交叉授粉** — 不同植物之間的連結，往往是最有價值的
2. **定期修剪** — 有些想法需要斷捨離
3. **允許變形** — 種子長出來可能跟預期不同，那是好事
4. **不急於收割** — 知識需要時間沉澱
5. **記錄變化** — 每次更新都記錄成長軌跡
6. **同步 manifest** — 每次更新花園後，同步更新本地 manifest（自動，詳見 §Manifest 自動同步）

---

## 相關 Skills

- `wiki-ingest` — 吸收新資料進 wiki
- `wiki-query` — 查詢 wiki 內容
- `wiki-lint` — 健康檢查
- `knowledge-garden-page-content` — 頁面內容產生（wiki → Notion 方向）
- `knowledge-garden-to-raw` — Notion → raw 抓取（反向流程）
- `knowledge-garden-trigger` — 觸發偵測與回流
- `knowledge-garden-visualmap` — 視覺地圖
- `notion-cli` — Notion CLI 命令參考

---

## 快速指令參考

| 指令 | 功能 | 範例 |
|------|------|------|
| `更新 <種子名稱>` | 更新單一種子 | `更新 Omnigent` |
| `更新所有種子` | 批量更新 | `sync all seeds` |
| `評估 <種子名稱> 狀態` | 評估成長狀態 | `評估 Omnigent 狀態` |
| `檢查 <種子名稱> 更新` | 檢查 GitHub 更新 | `檢查 OpenCodeReview 更新` |
| `查詢花園` | 列出所有種子 | `花園裡有什麼` |
| `建立視覺地圖 <種子>` | 建立視覺地圖 | `幫 Omnigent 畫地圖` |
