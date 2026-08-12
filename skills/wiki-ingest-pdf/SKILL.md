---
name: wiki-ingest-pdf
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

**備註：** PyMuPDF 是 wiki-ingest-pdf 的永久依賴，保留安裝。

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

### Step 3 起：交給 wiki-ingest 處理

PDF → raw 的轉換到此結束。**不要在這裡重複實作 ingest 邏輯**——查詢既有知識、雙模型交叉驗證（Pi 主持、Claude+Gemini 提案、分歧才 Round 2 / Copilot 仲裁）、建立或更新 wiki 頁面（source note 記得帶 `provenance_raw` 指向剛存的 raw 檔案）、重建 `wiki/index.md`、寫 `wiki/log.md`、git commit + push，全部呼叫 `wiki-ingest` skill 處理（見 AGENTS.md §3.1）。

兩份實作分開維護一定會漂移——上一輪知識系統改版時，這個 skill 就是因為沒同步而卡在舊的「人類確認」邏輯，才被抓出來修。

## 工具比較

| 工具 | 輸出 | 中文 | 結構 | 圖片 |
|------|------|------|------|------|
| `pdftotext` | 純文字 | ❌ 亂碼 | ❌ 扁平 | ❌ |
| `markitdown` | Markdown | ✅ 完整 | ✅ 保留 | ⚠️ 需 pymupdf |
| `pymupdf` | 圖片 | N/A | N/A | ✅ 專長 |

**結論：** markitdown 取代 pdftotext 作為主要文字提取工具。

## 範例

### 範例 A：安裝手冊 PDF（步驟 1-3 是本 skill 的工作，步驟 4 起是 `wiki-ingest` 接手）

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
