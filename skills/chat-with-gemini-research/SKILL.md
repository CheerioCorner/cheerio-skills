---
name: chat-with-gemini-research
description: "使用 Gemini 進行深度研究，強制要求引用出處與 citations。適用於：需要多角度調查的主題、需要引用來源的研究任務、「深度研究」、「用 Gemini 研究」、「research with Gemini」等情境。自動整合進 Obsidian 知識庫。"
argument-hint: <研究主題或問題>
---

# Gemini Deep Research

使用 Gemini 進行深度研究，確保每個結論都有可靠來源支撐。

## 前置條件

- `agy` CLI 已安裝並完成 Google OAuth 認證（見 `gy` skill）
- 知識庫位於 `C:/Cheerio/Obsidian/`

## 流程

### Step 1：分析研究需求

收到用戶請求後：

1. **拆解研究問題** — 將用戶的問題拆成 3-5 個子問題
2. **決定研究範圍** — 技術調研？比較分析？原理深入？
3. **選擇 Prompt 模板** — 從 `templates/` 選擇合適模板或自訂

### Step 2：構建研究 Prompt

讀取對應模板，填入用戶的具體問題。

**必備元素：**
- 明確的研究問題
- 要求多角度觀點（至少 3 個角度）
- 強制 citation 格式 + 來源品質分級
- 結構化輸出要求
- 陳述信心等級標記

#### 來源品質分級（Source Quality Tiers）

**Tier 1 — 高可信度（優先使用）**
- 官方文檔（vendor documentation）
- 官方部落格（公司/組織發布）
- 學術論文（peer-reviewed）
- 官方規格書（RFC、spec）
- GitHub 原始碼（帶 README 說明）

**Tier 2 — 中等可信度（可補充）**
- 知名技術部落格（如 Medium、Dev.to 有聲望的作者）
- 技術媒體（如 TechCrunch、The Verge）
- 官方論壇回答（Stack Overflow 高票答案）
- 維基百科（需交叉驗證）

**Tier 3 — 低可信度（僅供參考，需標記）**
- 個人部落格（無背書）
- Reddit / HackerNews 討論
- 匿名來源
- 過時資料（>2 年）

#### 陳述信心等級（Claim Confidence）

每個陳述必須標記信心等級：

| 標記 | 意義 | 什麼時候用 |
|------|------|-----------|
| `[VERIFIED]` | 有 Tier 1-2 來源直接支持 | 有明確引用 |
| `[INFERRD]` | 從多個來源推論得出 | 邏輯推論但無直接陳述 |
| `[UNVERIFIED]` | 無法找到可靠來源 | 常識性內容或推测 |
| `[CONTRADICTED]` | 來源之間有矛盾 | 不同來源說法不同 |

#### 引用規則（嚴格執行）

1. **每個事實陳述必須有引用** — 無法引用的陳述標記 `[UNVERIFIED]`
2. **每個引用必須有 URL** — 無法提供 URL 的來源降級為 Tier 3
3. **來源多樣化** — 至少包含 2 個不同 Tier 1 來源
4. **時效性標記** — 標註每個來源的發布日期
5. **可訪問性** — URL 必須是公開可訪問的（非付費牆後）

#### Prompt 模板（通用版）

```markdown
你是一個深度研究助手。針對以下主題進行深度研究：

## 研究主題
{USER_QUESTION}

## 研究要求

### 1. 多角度分析
- 從至少 3 個不同角度分析此主題
- 每個角度都要有獨立的論證

### 2. 引用與來源品質（嚴格執行）

#### 來源品質分級
- **Tier 1（優先）**：官方文檔、官方部落格、學術論文、RFC/spec、GitHub 原始碼
- **Tier 2（補充）**：知名技術部落格、技術媒體、Stack Overflow 高票答案
- **Tier 3（僅參考）**：個人部落格、Reddit/HN、匿名來源（需標記）

#### 引用規則
1. 每個事實陳述必須附上引用 [REF-N]
2. 每個引用必須有可訪問的 URL
3. 至少包含 2 個不同 Tier 1 來源
4. 標註每個來源的發布日期
5. 無法引用的陳述標記 [UNVERIFIED]

#### 陳述信心等級
- [VERIFIED] — 有 Tier 1-2 來源直接支持
- [INFERRD] — 從多個來源推論得出
- [UNVERIFIED] — 無法找到可靠來源

### 3. 輸出結構

# 研究報告：{TOPIC}

## Executive Summary
（200 字以內的摘要）

## 主要發現

### 角度一：{ANGLE_1}
{內容} [REF-1]

### 角度二：{ANGLE_2}
{內容} [REF-2]

### 角度三：{ANGLE_3}
{內容} [REF-3]

## 深入分析
{交叉比對、異同、趨勢}

## 來源列表

| # | Tier | URL | 標題 | 日期 | 類型 |
|---|------|-----|------|------|------|
| 1 | T1 | https://... | 標題 | YYYY-MM-DD | 官方文檔 |
| 2 | T2 | https://... | 標題 | YYYY-MM-DD | 部落格 |

## 來源品質摘要
- Tier 1 來源：N 個
- Tier 2 來源：N 個
- Tier 3 來源：N 個
- 來源多樣性：N 個不同網站

## 知識缺口
（目前無法確認或需要進一步驗證的事項）

## 建議的下一步
（基於此研究，建議的後續行動）
```

#### Prompt 模板（技術比較版）

```markdown
你是一個技術比較分析師。針對以下技術方案進行深度比較：

## 比較主題
{USER_QUESTION}

## 比較框架

### 1. 維度定義
列出 4-6 個關鍵比較維度（如：效能、易用性、生態系、成本、擴充性）

### 2. 每個維度的評估
對每個候選方案在每個維度上進行評估，附上引用。

### 3. 引用與來源品質
（同通用版的 Tier 分級 + 引用規則）

### 4. 輸出結構

# 技術比較：{TOPIC}

## Overview
（150 字摘要）

## Comparison Matrix

| 維度 | 方案 A | 方案 B | 方案 C |
|------|--------|--------|--------|
| 維度1 | ... [REF-1] | ... [REF-2] | ... [REF-3] |

## 詳細分析

### 維度一：{DIMENSION}
{各方案比較} [REF-4]

### 維度二：{DIMENSION}
{各方案比較} [REF-5]

## 來源品質摘要
（同通用版格式）

## 來源列表
（同通用版格式）

## Recommendation
（基於特定使用場景的建議）

## 知識缺口
## 建議的下一步
```

### Step 3：執行 Gemini 研究

使用 `agy` CLI 執行研究。建立 run 目錄追蹤。

```bash
# 建立 run 目錄
RUN_ID=$(date +%Y%m%d-%H%M%S)
RUN_DIR=".pi/gemini-runs/$RUN_ID"
mkdir -p "$RUN_DIR"

# 寫入 prompt 到檔案（避免 shell escape 問題）
cat > "$RUN_DIR/prompt.md" << 'PROMPT_EOF'
{CONSTRUCTED_PROMPT}
PROMPT_EOF

# 執行 agy
agy -p "$(cat $RUN_DIR/prompt.md)" \
  --output-format stream-json \
  > "$RUN_DIR/output.log" 2>&1
```

**等待完成**：觀察 output.log，直到 agy 結束。

### Step 4：解析與後處理

讀取 Gemini 輸出，執行以下後處理：

1. **驗證引用完整性**
   - 檢查每個 [REF-N] 是否都有對應的來源條目
   - 標記缺失的引用

2. **檢查來源品質**
   - 統計 Tier 1/2/3 來源數量
   - 確認至少有 2 個 Tier 1 來源
   - 標記來源多樣性（來自幾個不同網站）

3. **格式化報告**
   - 確保 Markdown 格式正確
   - 表格完整
   - 連結可點擊

4. **生成原始報告**
   - 輸出到 `raw/research/YYYY-MM-DD-{slug}.md`
   - 包含 frontmatter（見下方格式）

#### Raw Research Frontmatter

```yaml
---
title: "{研究主題}"
type: raw-research
created: YYYY-MM-DD
agent: gemini
model: gemini-2.5-pro
topic: "{相關topic}"
subtopics:
  - "{子主題1}"
  - "{子主題2}"
sources_count: N
sources_tier1: N
sources_tier2: N
sources_tier3: N
sources_diversity: N
tags: [research, gemini, {topic-tags}]
---
```

### Step 5：知識庫整合（可選）

若用戶要求或研究結果值得入庫：

1. **建立 Source Note** — `wiki/sources/YYYY-MM-DD-{slug}.md`
2. **提取 Entity/Concept** — 建立或更新相關 wiki 頁面
3. **更新 Index + Log** — 依照 wiki-knowledge skill 流程

### Step 6：回報結果

向用戶報告：
- 研究摘要（3-5 句）
- 發現的關鍵洞察
- 來源品質摘要（Tier 1/2/3 分佈、多樣性）
- 原始報告位置
- 是否已入庫（若執行 Step 5）

## 品質檢查清單

在回報前，確認：

### 來源品質
- [ ] 至少 2 個 Tier 1 來源（官方文檔、學術論文）
- [ ] 來源來自至少 3 個不同網站
- [ ] 沒有超過 50% 的來源來自同一網站
- [ ] 來源日期合理（多數 <2 年）

### 引用完整性
- [ ] 每個事實陳述都有引用標記 [REF-N]
- [ ] 無法引用的陳述標記 [UNVERIFIED]
- [ ] 每個引用都有對應的 URL
- [ ] 來源列表包含 Tier 標記

### 報告完整性
- [ ] 包含「來源品質摘要」章節
- [ ] 包含「知識缺口」章節
- [ ] 信心等級標記正確使用

## 品質指標

好的深度研究報告應該：
- 至少 5 個獨立引用
- 至少 2 個 Tier 1 來源
- 至少 3 個不同來源網站
- 涵蓋正面觀點與限制/風險
- 明確標示 `[VERIFIED]` vs `[UNVERIFIED]`

## 整合點

- **gy skill**：使用 agy CLI 執行
- **wiki-knowledge**：結果可自動 ingest
- **knowledge-garden**：重要發現可成為種子
- **work-tracker**：大型研究可建立工作項目

## 注意事項

- Gemini 有週制配額，避免短時間大量查詢
- 研究結果需人工驗證關鍵資訊
- 引用的 URL 可能隨時間失效
- 敏感主題需注意資料隱私

## 來源品質的為什麼

### 為什麼要這麼嚴格？

1. **可驗證性** — 用戶可以點擊 URL 確認資訊
2. **可追溯性** — 知道資訊從哪裡來，方便深入研究
3. **可信度** — Tier 1-2 來源通常經過審查或有公信力
4. **時效性** — 標記日期確保資訊沒有過時

### 來源多樣性的重要性

- 單一來源可能有偏見
- 多來源交叉驗證提高可信度
- 不同角度呈現完整圖像
- 發現來源之間的矛盾也是有價值的發現

### 未驗證陳述的處理

有些陳述可能：
- Gemini 無法找到可靠來源
- 屬於邏輯推理而非事實
- 是常識性內容

這些情況下，必須明確標記，讓用戶知道需要進一步驗證。
