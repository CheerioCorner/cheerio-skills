# Gemini Deep Research Skill

使用 Gemini 進行深度研究，**強制要求引用出處**且**確保來源品質**。

## 結構

```
gemini-deep-research/
├── SKILL.md           # 主要 skill 文件
├── README.md          # 本文件
├── templates/         # Prompt 模板
│   ├── general.md     # 通用深度研究
│   ├── comparison.md  # 技術比較分析
│   └── tutorial.md    # 技術教學/原理深入
└── scripts/           # 工具腳本
    └── validate-citations.py  # 引用完整性 + 來源品質驗證
```

## 使用方式

### 自然語言觸發
- 「深度研究 X」
- "用 Gemini 研究 X"
- "research X with Gemini"
- 「幫我調查 X 的最新發展」

### Slash Command
```
/gemini-deep-research <研究主題>
```

## 來源品質分級（Source Quality Tiers）

### Tier 1 — 高可信度（優先使用）
- 官方文檔（vendor documentation）
- 官方部落格（公司/組織發布）
- 學術論文（peer-reviewed）
- 官方規格書（RFC、spec）
- GitHub 原始碼

### Tier 2 — 中等可信度（可補充）
- 知名技術部落格（Medium、Dev.to 有聲望作者）
- 技術媒體（TechCrunch、The Verge）
- Stack Overflow 高票答案
- 維基百科

### Tier 3 — 低可信度（僅供參考）
- 個人部落格
- Reddit / HackerNews 討論
- 匿名來源
- 過時資料（>2 年）

## 陳述信心等級（Claim Confidence）

| 標記 | 意義 |
|------|------|
| `[VERIFIED]` | 有 Tier 1-2 來源直接支持 |
| `[INFERRD]` | 從多個來源推論得出 |
| `[UNVERIFIED]` | 無法找到可靠來源 |
| `[CONTRADICTED]` | 來源之間有矛盾 |

## Prompt 模板選擇

| 模板 | 適用場景 | 特點 |
|------|---------|------|
| general.md | 一般研究、多角度分析 | 最通用 |
| comparison.md | 技術方案比較 | 結構化比較矩陣 |
| tutorial.md | 技術原理深入 | 從 Why → What → How |

## 引用規則（嚴格執行）

1. **每個事實陳述都要有引用** — 使用 [REF-N] 標記
2. **每個引用必須有 URL** — 無法提供 URL 的降級為 Tier 3
3. **至少 2 個 Tier 1 來源** — 確保基本可信度
4. **來源多樣化** — 至少 3 個不同網站
5. **無法引用的標記 [UNVERIFIED]** — 誠實標示

## 後處理

使用 `scripts/validate-citations.py` 驗證報告品質：

```bash
python scripts/validate-citations.py <report.md>
```

輸出：
- 引用統計（總數、已驗證、缺失）
- 來源品質分佈（Tier 1/2/3）
- 來源多樣性（不同網站數）
- 未驗證陳述列表
- 品質評分 (0-100)

## 品質指標

好的深度研究報告應該：
- 至少 5 個獨立引用
- 至少 2 個 Tier 1 來源
- 至少 3 個不同來源網站
- 涵蓋正面觀點與限制/風險
- 明確標示 `[VERIFIED]` vs `[UNVERIFIED]`

## 知識庫整合

研究報告可自動整合進 Obsidian 知識庫：

1. **Raw Research** — `raw/research/YYYY-MM-DD-{slug}.md`
2. **Source Note** — `wiki/sources/YYYY-MM-DD-{slug}.md`
3. **Entity/Concept** — 提取重要概念建立 wiki 頁面

## 依賴

- `agy` CLI（Google Gemini 存取）
- Python 3.6+（引用驗證腳本）
