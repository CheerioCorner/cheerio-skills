---
name: wiki-ingest-youtube
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

#### 1d. 時間戳格式統一化

**在輸出 raw transcript 之前，必須先將所有時間戳統一轉換為 `[MM:SS]` 格式。**

不同來源的時間戳格式不一：
- `youtube_transcript_api`：segments 的 `start` 是浮點秒數（例如 `125.3`）
- Whisper：同樣是浮點秒數
- 某些字幕檔可能是 `[HH:MM:SS]` 或 `[MM:SS.mmm]`

**轉換規則：**
- 所有格式一律轉為 `[MM:SS]`（無小時、無毫秒、無浮點）
- 浮點秒數換算必須使用公式，**禁止手動估算**：
  ```python
  def seconds_to_mmss(total_seconds: float) -> str:
      """將浮點秒數轉為 [MM:SS] 格式。使用 floor 確保精確，不手動估算。"""
      minutes = int(total_seconds // 60)
      seconds = int(total_seconds % 60)
      return f"[{minutes:02d}:{seconds:02d}]"
  ```
- `[HH:MM:SS]` 若小時為 00，截斷為 `[MM:SS]`；若小時非 00，保留 `[HH:MM:SS]`（罕見，通常 > 1hr 的影片）
- **為什麼禁止手動估算**：手動估算（例如「大約 2 分 5 秒」→ 寫成 `[02:05]`）在事後回溯時無法精確定位，失去溯源意義。公式計算即使浮點有微小誤差，最多差 1 秒，仍在可接受範圍。

#### 1e. 輸出 raw transcript

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
timestamp_format: "[MM:SS]"
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
- frontmatter 新增 `timestamp_format: "[MM:SS]` 標記，方便下游 skill 偵測格式

### Step 2 起：交給 wiki-ingest 處理

字幕/逐字稿 → raw 的轉換到此結束。**不要在這裡重複實作 ingest 邏輯**——查詢既有知識、雙模型交叉驗證（Pi 主持、Claude+Gemini 提案、分歧才 Round 2 / Copilot 仲裁）、建立或更新 wiki 頁面（source note 記得帶 `provenance_raw` 指向剛存的 raw transcript）、Topic 導航更新、重建 `wiki/index.md`、寫 `wiki/log.md`、git commit + push，全部呼叫 `wiki-ingest` skill 處理（見 AGENTS.md §3.1）。

兩份實作分開維護一定會漂移——這個 skill 原本就是因為沒同步而卡在舊的「人類確認」邏輯，才被抓出來修。

### 陳述級溯源規則（source note 生成時）

YouTube raw transcript 帶有結構化定位資訊（`[MM:SS]` 時間戳），根據 AGENTS.md §4.3，wiki source note 正文**必須**做陳述級溯源。這不是可選的——在 wiki-ingest 產出 source note 時就必須完成，不能留到事後補。

#### 什麼需要標時間戳

**事實性陳述必須 inline 標註時間戳：**
- 數字與量化資料（「影片有 261 個 segments」→ 標 raw 中出現該數字的位置）
- 日期與時間（「發布於 2026 年」→ 標時間戳）
- 人名與組織名（首次出現時標註）
- 直接引用（逐字引用講者的話 → 標精確時間戳）
- 因果結論（「A 導致 B」→ 標講者做出此結論的時間戳）
- 技術斷言（「X 的延遲是 5ms」→ 標時間戳）

**不需要標時間戳的：**
- 過場句（「以下是重點摘要」）
- 章節標題
- 純粹的格式性文字

#### 逐字引用 vs 跨段落歸納

| 類型 | 定義 | 時間戳標法 | 範例 |
|------|------|-----------|------|
| **逐字引用** | 精確引用講者原話，不改動或極少改動 | 標 **精確** `[MM:SS]` | 「chunking 把 tree flatten 掉」`[01:29]` |
| **跨段落歸納陳述** | 綜合多個段落的內容，找不到單一精確時間點 | 標 **最主要來源段落** 的時間戳，前綴 `≈` | ≈`[02:00]` Chunkless RAG 的核心思路 |

**⚠️ 跨段落歸納的關鍵原則：**
- 標最主要來源段落的時間戳，**不要為了湊精確而亂標**
- 如果歸納跨越超過 3 個連續段落，標第一個段落的時間戳即可
- 如果歸納完全無法定位到任何單一段落，標該章節第一段的時間戳
- **嚴禁**：把時間戳標在與陳述無關的位置（為了看起來有溯源而隨便標）

#### 為什麼要在 ingest 當下做

- **事後補做成本極高**：YouTube source note 已有 13 頁需要回溯補做（2026-08-18），每頁耗時 15-30 分鐘
- **當下有原文在手**：生成 source note 時 raw transcript 就在 prompt 裡，順手標比事後回來找容易 10 倍
- **避免 citation laundering**：歸納（有損壓縮）與溯源（無損映射）在同一次生成中完成，比事後分開做更不容易產生假精確引用

## 規範引用

- 完整規範：`C:/Cheerio/Obsidian/AGENTS.md`
- Frontmatter：§4.2（必填 title, type, created, updated, sources, tags）
- 陳述級溯源：§4.3（YouTube raw 有 `[MM:SS]` 時間戳 → source note 正文必須 inline 標註）
- 交叉引用：§4.4（一律 `[[wikilink]]`，vault-root 完整路徑）
- Topics：§4.3（`wiki/topics/` 只更新導航，不建內容 stub）
- Index：§5.1（按 taxonomy 分區，每頁一行）
- Log：§5.2（`## [YYYY-MM-DD] ingest | <標題>` 格式）

## 範例

### 範例 A：有字幕的影片（API fallback + 分段合併）

處理 Tau 影片的完整流程（步驟 1 是本 skill 的工作，步驟 2 起是 `wiki-ingest` 接手）：
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
