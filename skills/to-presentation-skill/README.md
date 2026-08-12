# to-presentation Skill

用 AI agent 製作高品質 HTML slide deck。整合 guizang-ppt-skill 設計系統 + huashu-design 渲染引擎。

## 特性

- 🎨 5 套預設主題（不自定義色值，穩定出品）
- 📐 衬线/非衬线/等寬 三分工排版系統
- 🖼 `<deck-stage>` web component（1920×1080、auto-scale、鍵盤導航）
- 🚫 反 AI slop 規則（不用紫漸變、emoji 裝飾等）
- 🔄 Gemini + Copilot 雙審閱工作流
- 📱 響應式概覽網格 + 演示模式

## 安裝

### 前置 Skill（必須）

本 skill 依賴以下兩個 skill 的設計系統和渲染引擎：

```bash
# 1. 設計系統（主題色、排版、組件）
npx skills add https://github.com/op7418/guizang-ppt-skill --skill guizang-ppt-skill

# 2. 渲染引擎（deck_stage.js、deck_index.html）
npx skills add alchaincyf/huashu-design
```

### 本 Skill

```bash
# 從 GitHub 安裝
git clone https://github.com/YOUR_USERNAME/to-presentation-skill.git ~/.agents/skills/presentation

# 或用 npx skills（如果已發布）
npx skills add YOUR_USERNAME/to-presentation-skill
```

## 使用方式

直接對 AI agent 說：

```
幫我做一份關於 AI Agent 架構的簡報，15 頁左右
```

```
做一個系統架構課的分享會 PPT，主題是 Plannotator × Obsidian
```

```
Generate a 10-slide presentation about our Q2 roadmap
```

## 工作流程

```
Phase 1: 內容企劃
  ├── 讀取原始資料
  ├── 規劃 slide 結構（12-15 頁）
  ├── Gemini 討論 → Copilot 審閱
  └── 確認最終結構

Phase 2: 設計系統
  ├── 選擇主題（5 套預設選一套）
  ├── 確認字體分工
  └── Grammar 確立（先做 2 個 showcase 頁）

Phase 3: 批量製作
  ├── 建立目錄結構
  ├── 每頁獨立 HTML → slides/
  ├── 套用 guizang 組件
  └── 遵守反 AI slop 規則

Phase 4: 交付
  ├── deck_index.html 聚合
  ├── 瀏覽器預覽
  └── 演示模式
```

## 場景配置（可選）

根據使用場景調整字號和對比度：

| 場景 | h1 最小 | 正文最小 | 對比度 | 說明 |
|------|---------|----------|--------|------|
| 💻 個人/筆電 | 36px | 14px | 標準 | 1-3 人近距離觀看 |
| 🏢 會議室（20+人） | 44px | 18px | 高 | 投影儀 + 年長長官 |
| 🎤 大演講廳 | 52px | 20px | 極高 | 大螢幕 + 遠距離 |

> 預設為「會議室」配置。說「做簡報」時可指定場景，例如：
> - 「做一份會議室用的簡報」→ 自動放大字號
> - 「做一份個人筆電看的簡報」→ 標準字號

## 主題選擇

| 主題 | 色調 | 適合場景 |
|------|------|----------|
| 🖋 墨水經典 | 純墨黑 + 暖米白 | 通用默认、商業發布 |
| 🌊 靛藍瓷 | 深靛藍 + 瓷白 | 科技、研究、AI（推薦） |
| 🌿 森林墨 | 深森林綠 + 象牙 | 自然、文化、非虚构 |
| 🍂 牛皮紙 | 深棕 + 暖米 | 懷舊、人文、歷史 |
| 🌙 沙丘 | 深棕 + 暖沙 | 藝術、設計、創意 |

## 字體系統（可選配置）

### 預設字體組合

| 用途 | 預設 | 替代方案 A（詩源） | 替代方案 B（思源） |
|------|------|-------------------|-------------------|
| 標題、金句 | Playfair Display + Noto Serif SC | Playfair Display + **Noto Serif CJK SC** | **Source Han Serif SC** + Noto Serif SC |
| 正文、描述 | Noto Sans SC | **Noto Sans CJK SC** | **Source Han Sans SC** + Noto Sans SC |
| 標籤、meta | IBM Plex Mono | IBM Plex Mono | IBM Plex Mono |

> 💡 **詩源黑體/宋體**（Source Han Sans/Serif）與 **Noto Sans/Serif CJK SC** 幾乎相同，只是發行方不同。選擇任一組合皆可。

### 字體分工原則（不可違背）

- **衬线**：標題、金句、數字 → 視覺重音
- **非衬线**：正文、描述 → 資訊密度
- **等寬**：標籤、meta → 裝飾節奏

## 目錄結構

```
your-deck/
├── index.html          ← 聚合器（from deck_index.html）
├── deck_stage.js       ← 渲染引擎（from huashu-design）
└── slides/
    ├── 01-cover.html
    ├── 02-problem.html
    ├── ...
    └── 14-references.html
```

## 已知問題

### deck_index.html 預設設定（重要！）

huashu-design 的 `deck_index.html` 預設會隨機切換網格/畫廊模式，畫廊模式會導致：
- 卡片太大、點不到
- 頁面重複顯示
- 畫面不斷飄移

**複製 deck_index.html 後，務必立刻修改：**

```javascript
window.GALLERY_CARD_W = 180;       // 卡片基准宽度
window.GALLERY_DRIFT_SECONDS = 80; // 画廊漂移一圈时长
window.DECK_OVERVIEW = 'grid';     // 強制網格模式
```

## 反 AI Slop 規則

| ❌ 不做 | ✅ 做 |
|---------|-------|
| 紫漸變背景 | 單色或微漸變 |
| emoji 圖標裝飾 | 文字標籤或無裝飾 |
| 圓角 + 左 border accent | 細邊框 + 左色條 |
| SVG 畫人臉 | 用文字或 placeholder |
| Inter 做 display | 用 serif 做標題 |

## 致謝

- [guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) — 設計系統
- [huashu-design](https://github.com/alchaincyf/huashu-design) — 渲染引擎
- [deck_index.html](https://github.com/alchaincyf/huashu-design) — 多檔聚合器

## License

MIT
