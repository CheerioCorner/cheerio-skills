---
name: to-presentation
description: 製作高品質 HTML slide deck。整合 guizang-ppt-skill 設計系統 + huashu-design 渲染引擎。當使用者提到「做簡報」、「to-presentation」、「做 PPT」、「做 slides」、「做 HTML 簡報」、「presentation」、「slide deck」、「分享會簡報」時使用。
---

# to-presentation Skill

用 AI agent 製作高品質 HTML slide deck 的完整工作流。

## 觸發詞

- 「做簡報」、「to-presentation」、「做 PPT」、「做 slides」
- 「做 HTML 簡報」、「HTML slide deck」
- 「分享會簡報」、「會議簡報」
- 「帮我做一份 XX 的 presentation」
- 「to-presentation」

## 前置條件（每次執行前檢查）

1. **guizang-ppt-skill** 是否已安裝？（`ls ~/.agents/skills/guizang-ppt-skill/`）
   - 未安裝 → `npx skills add https://github.com/op7418/guizang-ppt-skill --skill guizang-ppt-skill`
2. **huashu-design** 是否已安裝？（`ls ~/.agents/skills/huashu-design/`）
   - 未安裝 → `npx skills add alchaincyf/huashu-design`
3. 確認 `deck_stage.js` 和 `deck_index.html` 存在於 huashu-design 的 `assets/` 目錄

## 工作流程

### Phase 1：內容企劃

1. 讀取原始資料（如有 raw/ 來源）
2. 規劃 slide 結構（建議 12-15 頁）
3. **用 agy (Gemini) 討論企劃**：把內容大綱 + 受眾 + 目標丟給 Gemini，請它審閱邏輯鏈、一句話重點、轉場語
4. **用 gh copilot 做第二意見審閱**
5. 整合兩者的建議，確認最終結構
6. （可選）存入知識庫

### Phase 2：設計系統設定

1. **選擇主題**（從 guizang 5 套預設選一套，不自定義色值）：
   - 🖋 墨水經典：通用默认、商業發布
   - 🌊 靛藍瓷：科技、研究、AI（推薦）
   - 🌿 森林墨：自然、文化、非虚构
   - 🍂 牛皮紙：懷舊、人文、歷史
   - 🌙 沙丘：藝術、設計、創意

2. **確認字體分工**：
   - 衬线（Playfair Display + Noto Serif SC / 詩源宋體）：標題、金句、數字
   - 非衬线（Noto Sans SC / 詩源黑體）：正文、描述
   - 等寬（IBM Plex Mono）：標籤、meta、kicker
   - ⚠️ 字體大小必須考慮：20 人以上會議室投影、50 歲以上長官閱讀
   - h1 最小 44px，正文最小 18px，標籤最小 13px

3. **Grammar 確立**：先做 2 個 showcase 頁（通常是封面 + 一個內容頁），讓使用者確認方向

### Phase 3：批量製作

1. 建立目錄結構：`project-name/slides/`
2. 複製 `deck_stage.js` 和 `deck_index.html` 到專案根目錄
3. 每頁獨立 HTML → `slides/` 目錄
4. 每頁必須：
   - 使用 `<deck-stage>` web component
   - 載入 Google Fonts（4 種字體）
   - 載入 `../deck_stage.js`
   - 包含 chrome（頂部標籤）和 foot（底部頁碼）
   - 遵守反 AI slop 規則

5. 更新 `index.html` 的 `DECK_MANIFEST`

### Phase 4：交付

1. 瀏覽器打開 `index.html` 預覽
2. 概覽網格 → 點選頁面 → 演示模式
3. 鍵盤 `← →` 翻頁，`ESC` 回概覽

## 設計規範

### 來自 guizang-ppt-skill

- **主題色**：只用 5 套預設，不自定義 hex
- **排版**：衬线標題 + 非衬线正文 + 等寬標籤
- **Chrome/Foot**：頂底 monospace 元資訊條
- **組件**：Card、Callout、Flow、Stat、Ghost、Tag、Kicker
- **間距**：padding 6vh 6vw、gap 3-4vw
- **動效**：可選 data-anim（默認不用，保持簡單）

### 來自 huashu-design

- **渲染**：`<deck-stage>` web component（1920×1080、auto-scale）
- **聚合**：`deck_index.html`（概覽網格 + 演示模式）
- **反 AI slop**：不用紫漸变、emoji 裝飾、圓角+border、SVG 畫人臉
- **Placeholder > 爛實現**：沒圖就留灰色方塊，不要畫爛 SVG

### 設計硬性規範（不可違背）

1. **繁體中文**：所有中文字必須為繁體中文
2. **最小字號 18px**：所有可讀文字不得小於 18px（會議室 + 年長長官場景）
3. **卡片等高**：並排的 card 必須高度一致（用 `align-items:stretch` + `flex:1`）
4. **Flow 等寬**：流程圖中的 box/card 必須等寬佔滿（用 `flex:1`）
5. **內容不溢出**：若內容會超過 slide 高度，必須調整呈現方式（縮字、減少行數、拆頁）
6. **影響表達時需討論**：若調整會影響內容表達，先與使用者確認

### 每頁模板

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920">
<title>P{N} · {Title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=IBM+Plex+Mono:wght@300;400;500;600&family=Noto+Serif+SC:wght@300;400;500;600;700;900&family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap" rel="stylesheet">
<script src="../deck_stage.js"></script>
<style>
:root{--ink:#0a1f3d;--ink-rgb:10,31,61;--paper:#f1f3f5;--paper-rgb:241,243,245;--mono:"IBM Plex Mono",ui-monospace,monospace;--serif-en:"Playfair Display",Georgia,serif;--serif-zh:"Noto Serif SC",serif;--sans-zh:"Noto Sans SC",system-ui,sans-serif}
/* ... 共用 CSS ... */
</style>
</head>
<body>
<deck-stage>
<section>
<div class="slide">
  <!-- 內容 -->
  <div class="foot"><span class="title">簡報標題</span><span>{N} / {Total}</span></div>
</div>
</section>
</deck-stage>
</body>
</html>
```

## 常見頁面類型

| 類型 | 用途 | 設計特色 |
|------|------|----------|
| Hero | 封面 | Ghost 背景字 + 居中大標題 |
| Problem | 痛點 | 雙卡片 + 號碼徽章 |
| Split | 對比 | 左右 split grid |
| Flow | 流程 | flow-card + arrow + box |
| Table | 資料 | 表格 + mono 標題列 |
| Demo | 轉場 | 居中 + Ghost + emoji |
| Pillars | 三支柱 | 三欄 card + icon |
| Quote | 金句 | 大号 serif + 居中 |
| Q&A | 問答 | 居中 + Ghost |
| References | 參考 | 列表 + code 連結 |

## 注意事項

### deck_index.html 預設設定（重要！）

huashu-design 的 `deck_index.html` 預設會隨機切換網格/畫廊模式，畫廊模式會導致：
- 卡片太大、點不到
- 頁面重複顯示（畫廊會平鋪重複）
- 畫面不斷飄移（畫廊有 drift 動畫）

**複製 deck_index.html 後，務必立刻做以下修改：**

```javascript
// 找到這三行，改成：
window.GALLERY_CARD_W = 180;       // 卡片基准宽度（縮小以容納14頁）
window.GALLERY_DRIFT_SECONDS = 80; // 画廊漂移一圈时长
window.DECK_OVERVIEW = 'grid';     // 強制網格模式，關閉畫廊飄移
```

### 字體與可讀性

- 詩源宋體（Noto Serif SC）：標題、金句、數字
- 詩源黑體（Noto Sans SC）：正文、描述
- IBM Plex Mono：標籤、meta、kicker
- ⚠️ 字體大小必須考慮：20 人以上會議室投影、50 歲以上長官閱讀
- h1 最小 44px，正文最小 18px，標籤最小 13px

### 每頁 HTML 必須 self-contained

- 字體 + 樣式 + script 都在裡面
- `deck_stage.js` 路徑用相對路徑 `../deck_stage.js`
- 不要在 workflow 中使用 `require()` 或 Node.js API
- 14 頁的批量製作建議用 write 工具逐一建立，不要用 workflow script
