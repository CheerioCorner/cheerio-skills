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
3. **更新成長階段** — 根據進展調整：
   - 🌱 種子期 — 剛開始觀察
   - 🌿 成長期 — 有實際使用經驗
   - 🌳 成熟期 — 已內化為自己的方法
4. **更新內容** — 加入新的觀察、比較結果、或已改編的方法
5. **更新成長計畫** — 把已完成的項目打勾，加入新項目
6. **同步本地 manifest**（詳見 §Manifest 自動同步）

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

**觸發條件：** 使用者說「巡檢花園」、「整理一下花園」等。

**流程：**

1. 列出所有子頁
2. 檢查：
   - 有沒有停滯太久的種子（成長計畫無進展）
   - 有沒有可以合併的相似種子
   - 有沒有過時的內容需要更新
3. 提出建議清單
4. 使用者確認後執行

## 頁面模板

新增 seedling 時使用以下模板結構：

```markdown
# [名稱] — [一句話描述]

> **來源：** [URL 或出處]
> **種下日期：** YYYY-MM-DD
> **成長階段：** 🌱 種子期 | 🌿 成長期 | 🌳 成熟期
> **Icon：** 🌱（用 API 設定，不要放在標題裡）

---

## 種子故事

[為什麼種下這顆種子？它跟什麼有關？]

---

## 這棵樹苗帶給我什麼

### 🔑 我認同的（已內化的部分）

| 概念 | 來源的說法 | 我的做法 |
|------|-----------|---------|
| ... | ... | ... |

### 🌿 需要比較的（差異探索）

| 概念 | 來源的做法 | 我的做法 | 觀察 |
|------|-----------|---------|------|
| ... | ... | ... | ... |

### 🌳 未來可能長成的（待發展）

1. ...
2. ...

---

## 成長計畫

- [ ] 項目 1
- [ ] 項目 2

---

## 連結

- 🔗 [原始來源](url)
- 📖 [Obsidian Wiki 頁面](link)（如有）
```

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
