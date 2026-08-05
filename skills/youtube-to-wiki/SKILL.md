---
name: youtube-to-wiki
description: "從 YouTube 影片建立 wiki 頁面。抓字幕 → 建 source note → 建 entity/concept pages → 更新 index + log。使用時機：使用者提到「YouTube ingest」、「抓字幕」、「YouTube → wiki」或提供 YouTube 連結要求處理時。"
argument-hint: <YouTube URL or video ID>
---

# YouTube to Wiki

將 YouTube 影片 ingest 進 Obsidian 知識庫。

## 前置條件

- `pytubefix` 和 `youtube_transcript_api` 已安裝（`pip install pytubefix youtube-transcript-api`）
- `openai-whisper` 已安裝（`pip install openai-whisper`，用於無字幕影片的語音轉文字）
- 知識庫位於 `C:/Cheerio/Obsidian/`

## 前置檢查

每次執行前，確認依賴是否可用：

```bash
python -c "import youtube_transcript_api; print('✅ youtube_transcript_api')"
python -c "import whisper; print('✅ whisper')"  # 可選，無字幕時才需要
```

若缺少 whisper 且遇到無字幕影片，提醒使用者安裝或跳過。

## 流程

### Step 1：抓字幕

#### 1a. 嘗試用 `youtube_transcript_api` 抓字幕

```python
from youtube_transcript_api import YouTubeTranscriptApi

video_id = "<VIDEO_ID>"
api = YouTubeTranscriptApi()

# 嘗試抓取可用字幕列表
try:
    transcript_list = api.list(video_id)
except:
    transcript_list = None

# 語言 fallback 邏輯：
# 1. 優先抓手動字幕（zh-Hant > zh-Hans > zh > en）
# 2. 若無手動字幕，嘗試 auto-generated 字幕（same language priority）
# 3. 若完全無字幕，進入 Step 1b（Whisper）

languages = ["zh-Hant", "zh-Hans", "zh", "en"]
transcript = None
used_auto = False

# 先嘗試手動字幕
for lang in languages:
    try:
        transcript = api.fetch(video_id, languages=[lang])
        break
    except:
        continue

# 若無手動字幕，嘗試 auto-generated
if transcript is None:
    for lang in languages:
        try:
            transcript = api.fetch(video_id, languages=[lang], preserve_formatting=True)
            used_auto = True
            break
        except:
            continue

if transcript:
    segments = transcript.to_raw_data()
    # 記錄使用的字幕語言與是否為自動生成
    metadata = {
        "language": transcript.language,
        "is_auto_generated": used_auto or getattr(transcript, 'is_generated', False),
        "source": "youtube_transcript_api"
    }
else:
    # 無字幕，進入 Whisper 流程
    segments = None
```

#### 1b. 無字幕 → Whisper 語音轉文字

若 Step 1a 完全無可用字幕，用本地 Whisper 轉錄：

```python
import whisper
import subprocess
import os

video_id = "<VIDEO_ID>"
slug = "<SLUG>"

# 1. 用 pytubefix 下載音檔
from pytubefix import YouTube

yt = YouTube(f"https://www.youtube.com/watch?v={video_id}")
audio_stream = yt.streams.filter(only_audio=True).first()
audio_path = f"raw/youtube/{slug}_audio.mp3"
audio_stream.download(output_path="raw/youtube/", filename=f"{slug}_audio.mp3")

# 2. 用 whisper 轉錄（自動偵測語言）
model = whisper.load_model("base")  # 可選 tiny/base/small/medium/large
result = model.transcribe(audio_path, language=None)  # language=None 自動偵測

# 3. 轉成 segments 格式
segments = []
for seg in result["segments"]:
    segments.append({
        "start": seg["start"],
        "duration": seg["end"] - seg["start"],
        "text": seg["text"].strip()
    })

metadata = {
    "language": result.get("language", "unknown"),
    "is_auto_generated": True,
    "source": "whisper",
    "whisper_model": "base"
}

# 4. 清理音檔（可選，節省空間）
# os.remove(audio_path)
```

#### 1c. 分段策略：語句邊界分析

原始 segments 通常太細碎（每 2-5 秒一段），需要合併成有意義的段落：

```python
import re

def merge_segments(segments, max_gap=2.0, sentence_end=True):
    """
    合併 segments 成段落。
    
    規則：
    1. 若相鄰 segment 間隔 < max_gap 秒，且前段不以句號/問號/驚嘆號結尾 → 合併
    2. 若前段以句號等結尾 → 開始新段落
    3. 合併後的段落長度上限約 500 字（可調整）
    """
    if not segments:
        return []
    
    sentence_endings = re.compile(r'[。！？.!?]$')
    merged = []
    current_text = ""
    current_start = segments[0]["start"]
    current_duration = 0
    
    for i, seg in enumerate(segments):
        text = seg["text"].strip()
        if not text:
            continue
        
        # 判斷是否需要切分
        should_split = False
        if current_text:
            # 檢查時間間隔
            prev_end = current_start + current_duration
            gap = seg["start"] - prev_end
            
            if sentence_end and sentence_endings.search(current_text):
                should_split = True
            elif gap > max_gap:
                should_split = True
            elif len(current_text) > 500:
                should_split = True
        
        if should_split and current_text:
            merged.append({
                "start": current_start,
                "duration": current_duration,
                "text": current_text.strip()
            })
            current_text = text
            current_start = seg["start"]
            current_duration = seg["duration"]
        else:
            if current_text:
                current_text += " " + text
            else:
                current_text = text
            current_duration = (seg["start"] + seg["duration"]) - current_start
    
    # 加入最後一段
    if current_text:
        merged.append({
            "start": current_start,
            "duration": current_duration,
            "text": current_text.strip()
        })
    
    return merged

# 使用
merged_segments = merge_segments(segments)
```

#### 1d. 輸出 raw transcript

輸出：`raw/youtube/<slug>.md`（OKF raw-transcript frontmatter + 時間戳逐字稿）
更新：`raw/youtube/manifest.json`

**格式：**

```
---
title: "<影片標題>"
type: raw-transcript
created: YYYY-MM-DD
video_id: <VIDEO_ID>
url: https://www.youtube.com/watch?v=<VIDEO_ID>
duration: <HH:MM:SS>
language: <detected_language>
auto_generated: <true/false>
source_api: <youtube_transcript_api|whisper>
segments: <count>
---

# <影片標題>

> Duration: HH:MM:SS | Segments: N | Language: XX | Source: API/Whisper

## Transcript

[00:00] First segment text...
[00:05] Second segment text...
...
```

**注意事項：**
- auto-generated 字幕品質通常較低，raw transcript 中應記錄 `auto_generated: true`
- Whisper 轉錄結果也標記 `auto_generated: true`，並記錄使用哪個模型
- 分段後的 segment 數量應寫入 frontmatter

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
3. **跨 topic 標記**：若頁面屬於多個 topic，在導航列表中加 🛠️ 標記，例如：
   ```
   - [[wiki/entities/mattpocock-skills|mattpocock-skills]] — AI Coding Agent Skills 集合 🛠️
   ```
4. 若不屬於任何 topic → 考慮是否需要建立新 topic 或暫放「Other」
5. **不要**在 `wiki/topics/` 建立內容頁或 compatibility stub

### Step 6：更新索引與日誌

1. **`wiki/index.md`**：加入新頁面到所有相關 topic 區塊，更新計數（sources / entities / concepts）
2. **`wiki/log.md`**：在最上方 append ingest 紀錄
3. **`work/history/YYYY-MM.md`**：如需追溯，append 事件
4. **多 topic 頁面**：在 index 中，跨 topic 頁面用 🛠️ 標記，並在 Skill topic 區塊底部加說明：`> 🛠️ = 同時屬於多個 topic（見各頁 frontmatter topics）`

### Step 7：Git 同步

```bash
cd C:/Cheerio/Obsidian
git add wiki/ raw/youtube/
git commit -m "ingest: <影片標題> — YouTube → wiki"
git push
```

## 規範引用

- 完整規範：`C:/Cheerio/Obsidian/AGENTS.md`
- Frontmatter：§4.2（必填 title, type, created, updated, sources, tags）
- 交叉引用：§4.4（一律 `[[wikilink]]`，vault-root 完整路徑）
- Topics：§4.3（`wiki/topics/` 只更新導航，不建內容 stub）
- Index：§5.1（按 taxonomy 分區，每頁一行）
- Log：§5.2（`## [YYYY-MM-DD] ingest | <標題>` 格式）

## 範例

### 範例 A：有字幕的影片（API fallback + 分段合併）

處理 Tau 影片的完整流程：
1. `raw/youtube/tau-python-port-of-pi.md` — 25:03 / 261 segments → 合併後約 85 paragraphs
2. Canonical 確認：tau 無既有頁 → 建新 entity
3. `wiki/sources/2026-08-03-tau-python-port-of-pi.md` — source note
4. `wiki/entities/tau.md` — entity page
5. 更新 `wiki/entities/pi-mono.md` — 加入 Tau 連結（既有頁補充）
6. 更新 `wiki/topics/ai-agent.md` — tau 加入導航
7. 更新 `wiki/index.md` + `wiki/log.md`
8. git commit + push

### 範例 B：無字幕影片（Whisper 轉錄）

假設某影片無任何字幕：
1. Step 1a：嘗試 API → 手動字幕無、auto-generated 也無
2. Step 1b：pytubefix 下載音檔 → whisper base 模型轉錄 → 自動偵測語言為 `en`
3. `raw/youtube/<slug>.md` — frontmatter 標記 `source_api: whisper, auto_generated: true`
4. 後續流程同範例 A

### 範例 C：auto-generated 字幕

假設某影片只有 auto-generated 字幕：
1. Step 1a：手動字幕無 → auto-generated zh-Hant 可用
2. `raw/youtube/<slug>.md` — frontmatter 標記 `auto_generated: true`
3. 後續流程同範例 A，但 note 中應註明字幕品質可能較低
