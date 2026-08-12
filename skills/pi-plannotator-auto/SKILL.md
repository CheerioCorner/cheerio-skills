---
name: pi-plannotator-auto
description: >
  開發和維護 pi-plannotator-auto extension 的規則和工作流程。
  當使用者提到「pi-plannotator-auto」、「plannotator extension」
  「open_annotate」或「annotation UI」時使用此 skill。
  也適用於：討論、報告、UI 調整、AI 討論完畢等觸發情境。
---

# Pi-Plannotator-Auto Development Skill

本 skill 提供開發和維護 pi-plannotator-auto extension 的完整規則。

---

## 🎯 Auto-Trigger 規則（Pi 行為準則）

**核心原則：** 當以下情境發生時，Pi 應主動提議開啟 Annotation UI。
使用者說「好」或確認後，才呼叫 `open_annotate`。

**永遠不要自動開 UI — 先問再開。**

### 觸發情境

| # | 情境 | 觸發時機 | 問法範例 |
|---|------|----------|----------|
| 1 | **討論 (Discuss)** | 使用者說「討論 X」「來討論」「我想討論」等 | 「討論到一個段落了，要不要開 Annotation UI 來標記你的想法？」 |
| 2 | **報告產出 (Report)** | AI 完成一份報告/分析/研究後 | 「報告完成了，要不要開 Annotation UI 來批註或調整？」 |
| 3 | **UI 調整 (Adjustment)** | 使用者說「用 UI 調」「在 UI 上改」「視覺化調整」等 | 「收到，讓我開 Annotation UI 讓你直接標記調整。」 |
| 4 | **AI 討論完畢 (Post-discussion)** | 多 agent workflow 或 subagent 討論結束後 | 「討論完畢，要不要開 Annotation UI 來審閱結論？」 |

### 觸發流程

```
觸發條件滿足
    │
    ▼
Pi 問使用者：「要不要開 Annotation UI？」
    │
    ├── 使用者說「好 / 要 / open it」 ──→ 呼叫 open_annotate(context=...)
    │
    └── 使用者說「不用 / 沒關係」 ──→ 繼續對話，不開 UI
```

### open_annotate 呼叫時機

- **情境 1（討論）：** 在討論告一段落時觸發，不打斷進行中的討論
- **情境 2（報告）：** 在報告完整呈現後觸發，讓使用者批註
- **情境 3（UI 調整）：** 使用者明確要求時立即觸發，不需要額外問
- **情境 4（AI 討論完畢）：** 在 workflow/subagent 完成後觸發

### context 參數對照

| 情境 | context 值 | 內容來源 |
|------|-----------|----------|
| 討論 | `"discussion"` | 當前對話摘要或討論主題 |
| 報告 | `"report"` | AI 產出的報告全文 |
| UI 調整 | `"adjustment"` | 使用者指定要調整的內容 |
| AI 討論完畢 | `"post-discussion"` | workflow 結論或 subagent 輸出 |

### 注意事項

- 情境 3（UI 調整）是使用者主動要求，不需要先問，直接開
- 如果內容太長（> 5000 字），先摘要再丟進 UI
- 每次只開一個 annotation session，不要並行多個
- 如果使用者拒絕，不要重複提議

---

## ⚡ 必讀規則（每次修改前）

1. **永遠不要直接 push 到 master** — 必須建立 branch → PR → merge
2. **發布 npm 需要 tag** — push `v*` tag 才會觸發 publish workflow
3. **版本號要一致** — package.json version 必須和 tag 一致

---

## 📚 文件閱讀指南

### 什麼時候該讀什麼？

| 情況 | 應該讀取的文件 | 原因 |
|------|----------------|------|
| **第一次接觸這個專案** | README.md → AGENTS.md → docs/index.md | 先了解專案是什麼，再了解規則 |
| **要修改 extension 程式碼** | docs/architecture.md → docs/tools.md → extensions/*.ts | 先了解架構，再看具體實作 |
| **要新增 tool 或 command** | docs/tools.md → extensions/auto-annotate.ts | 了解現有 tool 的模式 |
| **要修改依賴關係** | docs/dependencies.md → package.json | 了解依賴類型和影響 |
| **要發佈新版本** | 本文件的「正確工作流程」章節 | 避免流程錯誤 |

### 快速閱讀順序

```
第一次：README.md (1 min) → AGENTS.md (2 min) → docs/index.md (1 min)
修改 code：docs/tools.md (1 min) → extensions/*.ts
發佈：AGENTS.md 的工作流程章節
```

---

## 正確工作流程

### 修改程式碼並發布

```bash
# 1. 建立新 branch
git checkout master
git pull
git checkout -b feature/your-feature-name

# 2. 修改檔案（package.json, extensions/*.ts 等）

# 3. 更新版本號（如果有功能變更）
npm version patch  # 1.0.1 → 1.0.2
# 或
npm version minor  # 1.0.1 → 1.1.0
# 或
npm version major  # 1.0.1 → 2.0.0

# 4. Commit 並推送
git add .
git commit -m "feat: add new feature"
git push -u origin feature/your-feature-name

# 5. 建立 Pull Request
gh pr create --title "feat: add new feature" --body "description"

# 6. 合併 PR → 自動觸發 publish！
```

### GitHub Actions 會自動：
- ✅ 讀取 package.json 的 version
- ✅ 建立 tag (vX.X.X)
- ✅ 執行 `npm publish --access public --provenance`
- ✅ 發布到 npm registry

### Obsidian 工作紀錄邊界

- 原始 annotator feedback 仍保存至 `C:/Cheerio/Obsidian/raw/conversations/`。
- 若 feedback 形成明確決策、工作進展或完成結果，追加至 `work/history/YYYY-MM.md`，並保留 `refs:`。
- 不再寫入 `todos/` 或 `journal/`。

## 注意事項
- 如果 version 已經發布過（tag 已存在），會自動跳過
- 只需要 bump version + 合併 PR，其他全自動！

## 專案結構

```
pi-plannotator-auto/
├── extensions/
│   └── auto-annotate.ts    ← 主要 extension 程式碼
├── docs/                   ← OKF 知識目錄
│   ├── index.md            ← 入口文件
│   ├── architecture.md     ← 系統架構
│   ├── tools.md            ← Tool 和 Command 說明
│   ├── dependencies.md     ← 依賴關係
│   ├── log.md              ← 變更歷史
│   └── references/         ← 外部資源引用
├── package.json             ← 包含 pi manifest
├── README.md
├── LICENSE
├── AGENTS.md               ← 開發規則
└── .github/workflows/
    ├── ci.yml               ← PR 驗證
    └── publish.yml          ← tag 觸發 npm publish
```

## Package.json 重要欄位

```json
{
  "name": "@cheeriocorner/pi-plannotator-auto",
  "keywords": ["pi-package"],  // ← gallery 抓取依據
  "pi": {
    "extensions": ["./extensions"]
  }
}
```

## Gallery 顯示條件

Package 要出現在 pi.dev/packages，需要：
1. ✅ `pi-package` keyword
2. ✅ `pi` manifest（extensions/skills/prompts/themes）
3. ⏳ npm registry indexing（可能需要幾小時到幾天）

## 常見錯誤

| ❌ 錯誤做法 | ✅ 正確做法 |
|------------|------------|
| 直接 push 到 master | 建立 branch → PR |
| 改完就 push | 先 `npm version` 更新版本 |
| 忘記 push tag | `git push origin vX.X.X` |
| version 和 tag 不一致 | 確保 package.json version == tag |

## 專案位置

- **本地路徑：** `C:/Cheerio/pi/packages/pi-plannotator-auto`
- **GitHub：** https://github.com/CheerioCorner/pi-plannotator-auto
- **NPM：** https://www.npmjs.com/package/@cheeriocorner/pi-plannotator-auto
