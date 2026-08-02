---
name: youtube-to-wiki
description: "從 YouTube 影片建立 wiki 頁面。抓字幕 → 建 source note → 建 entity/concept pages → 更新 index + log。使用時機：使用者提到「YouTube ingest」、「抓字幕」、「YouTube → wiki」或提供 YouTube 連結要求處理時。"
argument-hint: <YouTube URL or video ID>
---

# YouTube to Wiki

將 YouTube 影片 ingest 進 Obsidian 知識庫。

## 前置條件

- `pytubefix` 和 `youtube_transcript_api` 已安裝（`pip install pytubefix youtube-transcript-api`）
- 知識庫位於 `C:/Cheerio/Obsidian/`

## 流程

### Step 1：抓字幕

用 `youtube_transcript_api` 抓取影片字幕，寫入 `raw/youtube/`：

```python
from youtube_transcript_api import YouTubeTranscriptApi

video_id = "<VIDEO_ID>"
api = YouTubeTranscriptApi()
transcript = api.fetch(video_id, languages=["zh-Hant", "zh-Hans", "zh", "en"])
segments = transcript.to_raw_data()
```

輸出：`raw/youtube/<slug>.md`（OKF raw-transcript frontmatter + 時間戳逐字稿）
更新：`raw/youtube/manifest.json`

**注意：** 字幕語言優先順序 `zh-Hant > zh-Hans > zh > en`，依可用性 fallback。

### Step 2：讀字幕，確認重點

1. 讀完 raw transcript
2. 與人類討論要提取什麼知識點（或 agent 自行判斷）
3. 決定要建立哪些頁面：
   - Source note（必建）
   - Entity pages（工具、人、組織）
   - Concept pages（抽象知識、模式）
   - 是否更新既有頁面

### Step 3：Canonical 確認（建頁前必做）

在建立任何新 entity / concept page 之前：

1. 讀 `wiki/index.md`，搜尋是否有已存在且覆蓋相同主題的頁面
2. 若有 → **不建新頁**，而是在既有頁面上加入新來源的內容（更新 frontmatter `sources: N`、新增章節或引用）
3. 若無 → 確認新頁的 `canonical` path 不會與現有頁衝突
4. 檢查 `wiki/topics.md` 的 taxonomy，確認新頁應歸入哪個 topic（可能多個）
5. **多 topic 判斷**：一個頁面可以同時屬於多個 topic（例如 Skill + AI Agent）。判斷依據：
   - 頁面內容是否跨領域？（如 mattpocock-skills 既是 Skill 生態系，也是 AI Agent 方法論）
   - 若是 → `topics` frontmatter 設為陣列，如 `topics: [skill, ai-agent]`
   - 在所有相關 topic 的導航頁都列出該頁面

### Step 4：建立 wiki 頁面

依 AGENTS.md §4 規範建立：

#### Source note（`wiki/sources/YYYY-MM-DD-title.md`）

```yaml
---
title: "影片標題"
type: source
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: 1
tags: [tag1, tag2]
collection: sources
topics: [topic1]
canonical: sources/YYYY-MM-DD-title
---

> 來源：[YouTube — 影片標題](URL)
> 原始字幕：[[raw/youtube/slug|raw transcript]]

## 一句話
一句話摘要。

## 重點摘要
結構化整理影片內容。

## 來源
- [[raw/youtube/slug|Raw transcript — YouTube video_id]]

## 相關頁面
- [[wiki/entities/xxx|xxx]]
```

#### Entity page（`wiki/entities/<name>.md`）

```yaml
---
title: name — 一句話描述
type: entity
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: N
tags: [tag1]
collection: entities
topics: [topic1]
canonical: entities/name
---

> 一句話定義。

## 基本資訊
表格。

## 核心內容
整理後的知識。

## 來源
- [[wiki/sources/YYYY-MM-DD-title|source note]]

## 相關頁面
- [[wiki/entities/xxx|xxx]]
```

### Step 5：Topic 導航更新（建頁後必做）

1. 檢查新頁面的 `topics` frontmatter（可能有多個）
2. 對每個相關 topic → 更新對應 `wiki/topics/<topic>.md` 的導航列表
3. **跨 topic 標記**：若頁面屬於多個 topic，在導航列表中加 🛠️ 標記
4. 若不屬於任何 topic → 考慮是否需要建立新 topic 或暫放「Other」
5. **不要**在 `wiki/topics/` 建立內容頁或 compatibility stub

### Step 6：更新索引與日誌

1. **`wiki/index.md`**：加入新頁面到所有相關 topic 區塊，更新計數
2. **`wiki/log.md`**：在最上方 append ingest 紀錄
3. **`work/history/YYYY-MM.md`**：如需追溯，append 事件

### Step 7：Git 同步

```bash
cd C:/Cheerio/Obsidian
git add wiki/ raw/youtube/
git commit -m "ingest: <影片標題> — YouTube → wiki"
git push
```

## 範例

處理 Tau 影片的完整流程：
1. `raw/youtube/tau-python-port-of-pi.md` — 25:03 / 261 segments
2. Canonical 確認：tau 無既有頁 → 建新 entity
3. `wiki/sources/2026-08-03-tau-python-port-of-pi.md` — source note
4. `wiki/entities/tau.md` — entity page
5. 更新 `wiki/entities/pi-mono.md` — 加入 Tau 連結（既有頁補充）
6. 更新 `wiki/topics/ai-agent.md` — tau 加入導航
7. 更新 `wiki/index.md` + `wiki/log.md`
8. git commit + push
