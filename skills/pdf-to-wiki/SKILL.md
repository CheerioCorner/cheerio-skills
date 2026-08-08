---
name: pdf-to-wiki
description: "從 PDF 檔案建立 wiki 頁面。markitdown 轉 Markdown → 提取圖片 → 建 source note → 建 entity/concept pages → 更新 index + log。使用時機：使用者提到「PDF ingest」、「處理 PDF」、「PDF → wiki」或提供 PDF 檔案路徑要求處理時。"
argument-hint: <PDF 檔案路徑>
---

# PDF to Wiki

將 PDF 檔案 ingest 進 Obsidian 知識庫。

## 前置條件

- `markitdown` 已安裝（`pip install 'markitdown[all]'`）
- `pymupdf` 已安裝（`pip install pymupdf`）— 用於提取 PDF 中的圖片
- 知識庫位於 `C:/Cheerio/Obsidian/`

## 前置檢查

每次執行前，確認依賴是否可用：

```bash
markitdown --version
python -c "import fitz; print('✅ pymupdf')"
```

若未安裝：
```bash
pip install 'markitdown[all]' pymupdf
```

## 流程

### Step 1：轉換 PDF → Markdown

#### 1a. 用 markitdown 提取文字（保留結構）

```bash
markitdown "<PDF路徑>" -o "<輸出目錄>/filename.md"
```

**優勢：** 比 `pdftotext` 好很多：
- ✅ 完整保留中文（pdftotext 在 Windows 上中文亂碼）
- ✅ 保留 Markdown 結構（標題、列表、表格）
- ✅ 跨格式支援（PDF / Word / Excel / PPT / HTML / 圖片 / 音訊）

#### 1b. 提取圖片

PDF 中的截圖用 PyMuPDF 提取：

```python
import fitz  # PyMuPDF
import os

pdf_path = "<PDF路徑>"
output_dir = "<輸出目錄>/images"
os.makedirs(output_dir, exist_ok=True)

doc = fitz.open(pdf_path)

for page_num in range(len(doc)):
    page = doc[page_num]
    images = page.get_images(full=True)
    
    for img_idx, img in enumerate(images):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        
        image_filename = f"page{page_num+1}_img{img_idx+1}.{image_ext}"
        image_path = os.path.join(output_dir, image_filename)
        
        with open(image_path, "wb") as f:
            f.write(image_bytes)

doc.close()
```

**備註：** PyMuPDF 是 pdf-to-wiki 的永久依賴，保留安裝。

#### 1c. 整合文字 + 圖片

在 Markdown 中加入圖片引用（使用相對路徑）：

```markdown
![步驟說明](../assets/<slug>/page3_img1.png)
```

### Step 2：存入 raw/

#### 2a. 建立 raw 檔案

將 markitdown 輸出存入 `raw/web/`（或 `raw/conversations/`），加上 frontmatter：

```markdown
---
title: <PDF 標題>
source_type: pdf
source_file: "<原始 PDF 路徑>"
original_date: <PDF 內的日期>
extracted_date: <今天的日期>
extraction_method: markitdown (Microsoft)
---

# <PDF 標題>

> 來源：PDF 檔案 `<檔名>.pdf`
> 提取工具：markitdown (Microsoft)

---

<markitdown 輸出內容>
```

#### 2b. 圖片存入 assets/

提取的圖片存入 `raw/assets/<slug>/`（slug 格式：`YYYY-MM-DD-簡短標題`）

### Step 3：讀內容，確認重點

1. 讀完 raw 檔案（markitdown 輸出的 Markdown）
2. 與人類討論要提取什麼知識點（或 agent 自行判斷）
3. 決定要建立哪些頁面：
   - Source note（必建）
   - Entity pages（工具、人、組織）
   - Concept pages（抽象知識、模式）
   - 是否更新既有頁面

### Step 4：Canonical 確認（建頁前必做）

1. 讀 `wiki/index.md`，搜尋是否有已存在且覆蓋相同主題的頁面
2. 若有 → **不建新頁**，而是在既有頁面上加入新來源的內容
3. 若無 → 確認新頁的 `canonical` path 不會與現有頁衝突
4. 檢查 `wiki/topics.md` 的 taxonomy，確認新頁應歸入哪個 topic

### Step 5：建立 wiki 頁面

依 AGENTS.md §4 規範建立：

#### Source note（`wiki/sources/YYYY-MM-DD-title.md`）

```yaml
---
title: "PDF 標題"
type: source
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: 1
tags: [tag1, tag2]
topics: [topic1]
canonical: sources/YYYY-MM-DD-title
provenance_raw: "raw/web/YYYY-MM-DD-filename.md"
---

> 來源：PDF 檔案 `filename.pdf`
> 提取工具：markitdown (Microsoft)

## 一句話
一句話摘要。

## 重點摘要
結構化整理 PDF 內容。

## 來源
- [[raw/web/YYYY-MM-DD-filename|原始 PDF 文字提取]]

## 相關頁面
- [[wiki/entities/xxx|xxx]]
```

#### Entity page（`wiki/entities/<name>.md`）

建立方式同 youtube-to-wiki skill。

### Step 6：Topic 導航更新

同 youtube-to-wiki skill Step 5。

### Step 7：更新索引與日誌

同 youtube-to-wiki skill Step 6。

### Step 8：Git 同步

```bash
cd C:/Cheerio/Obsidian
git add -A
git commit -m "ingest: <PDF 標題> — PDF → wiki"
git push
```

## 工具比較

| 工具 | 輸出 | 中文 | 結構 | 圖片 |
|------|------|------|------|------|
| `pdftotext` | 純文字 | ❌ 亂碼 | ❌ 扁平 | ❌ |
| `markitdown` | Markdown | ✅ 完整 | ✅ 保留 | ⚠️ 需 pymupdf |
| `pymupdf` | 圖片 | N/A | N/A | ✅ 專長 |

**結論：** markitdown 取代 pdftotext 作為主要文字提取工具。

## 範例

### 範例 A：安裝手冊 PDF

1. `markitdown 安裝手冊.pdf` → 完整中文 Markdown
2. `pymupdf` 提取 9 張截圖 → `raw/assets/2026-07-23-plannotator-copilot-setup/`
3. 整合 → `raw/web/2026-07-23-plannotator-copilot-setup-manual.md`
4. 建 source note → `wiki/sources/2026-07-23-plannotator-copilot-setup.md`
5. 更新 entity → `wiki/entities/plannotator.md`（+Copilot CLI 整合段落）
6. 新增 entity → `wiki/entities/markitdown.md`（工具本身）
7. 更新 topics + index + log
8. git push

## 注意事項

- `raw/` 永遠只讀不寫
- markitdown 輸出可能有頁碼標記（如 `1 / 8`），整理時可保留或移除
- 圖片引用使用相對路徑 `../assets/<slug>/`
- 規範引用：`C:/Cheerio/Obsidian/AGENTS.md`
