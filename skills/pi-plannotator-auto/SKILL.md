---
name: pi-plannotator-auto
description: 開發和維護 pi-plannotator-auto extension 的規則和工作流程。當使用者提到「pi-plannotator-auto」、「plannotator extension」、「open_annotate」或「annotation UI」時使用此 skill。
---

# Pi-Plannotator-Auto Development Skill

本 skill 提供開發和維護 pi-plannotator-auto extension 的完整規則。

## ⚡ 必讀規則（每次修改前）

1. **永遠不要直接 push 到 master** — 必須建立 branch → PR → merge
2. **發布 npm 需要 tag** — push `v*` tag 才會觸發 publish workflow
3. **版本號要一致** — package.json version 必須和 tag 一致

## 📚 文件閱讀指南

| 情況 | 應該讀取的文件 | 原因 |
|------|----------------|------|
| **第一次接觸** | README.md → AGENTS.md → docs/index.md | 先了解專案是什麼 |
| **要修改程式碼** | docs/architecture.md → docs/tools.md → extensions/*.ts | 先了解架構 |
| **要新增 tool** | docs/tools.md → extensions/auto-annotate.ts | 了解現有模式 |
| **要發佈新版本** | AGENTS.md 的「正確工作流程」章節 | 避免流程錯誤 |

## 正確工作流程

```bash
# 1. 建立新 branch
git checkout master && git pull
git checkout -b feature/your-feature-name

# 2. 修改檔案

# 3. 更新版本號
npm version patch  # 或 minor / major

# 4. Commit 並推送
git add . && git commit -m "feat: add new feature"
git push -u origin feature/your-feature-name

# 5. 建立 Pull Request
gh pr create --title "feat: add new feature" --body "description"

# 6. 合併 PR → 自動觸發 publish！
```

## 專案結構

```
pi-plannotator-auto/
├── extensions/
│   └── auto-annotate.ts    ← 主要 extension 程式碼
├── docs/                   ← OKF 知識目錄
├── package.json             ← 包含 pi manifest
├── README.md
├── AGENTS.md               ← 開發規則
└── .github/workflows/
    ├── ci.yml               ← PR 驗證
    └── publish.yml          ← tag 觸發 npm publish
```

## Gallery 顯示條件

Package 要出現在 pi.dev/packages，需要：
1. ✅ `pi-package` keyword
2. ✅ `pi` manifest（extensions/skills/prompts/themes）

## 專案位置

- **本地路徑：** `C:/Cheerio/pi/packages/pi-plannotator-auto`
- **GitHub：** https://github.com/CheerioCorner/pi-plannotator-auto
- **NPM：** https://www.npmjs.com/package/@cheeriocorner/pi-plannotator-auto
