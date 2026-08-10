# Cheerio Skills

> 私有 agent skills 集合，可透過 `npx skills add` 安裝。

## 安裝

```bash
# 列出可用 skills
npx skills add CheerioCorner/cheerio-skills --list

# 安裝單一 skill（全域 + Pi）
npx skills add CheerioCorner/cheerio-skills@wiki-knowledge -g -a pi

# 安裝所有 skills
npx skills add CheerioCorner/cheerio-skills --all -g -a pi
```

## Skills 分類

### 🌐 Agent-agnostic（任何 agent 都能用）

| Skill | 說明 |
|-------|------|
| copilot | 呼叫 GitHub Copilot CLI 執行任務 |
| knowledge-garden | Notion 知識花園管理 |
| knowledge-garden-trigger | 知識花園自動觸發研究 |
| knowledge-garden-visualmap | 種子/專題視覺地圖 |
| notion-cli | Notion CLI 操作 |
| notion-page-content | Notion 頁面內容產生 |
| notion-wiki-feedback | Notion → Wiki 回流機制 |
| gemini-notion-workflow | Gemini + Notion 整合工作流 |
| learning-loop | 自動學習優化系統 |
| todos | 任務管理 |
| round-table | 多 AI 圓桌會議 |

### 📚 Obsidian-dependent（需要 vault 結構）

| Skill | 說明 |
|-------|------|
| wiki-knowledge | Obsidian 知識庫 ingest/query/lint |
| wiki-ingest | 從 raw/ 資料建立或更新 wiki 頁面（含 Staging Buffer） |
| wiki-lint | 健康檢查（結構+品質+半衰期+矛盾+Source Fidelity） |
| wiki-query | 查詢 wiki 內容 |
| wiki-pdf | PDF → Markdown → raw → wiki |
| wiki-youtube | YouTube → raw → wiki |
| work-tracker | 工作狀態管理 |
| notion-to-raw | Notion → raw 抓取 |
| plannotator-sync | Plannotator → raw 同步 |

## Repository 結構

```
skills/
├── chat-with-copilot/SKILL.md
├── chat-with-gemini/SKILL.md
├── chat-with-gemini-research/SKILL.md
├── gemini-notion-workflow/SKILL.md
├── knowledge-garden/SKILL.md
├── knowledge-garden-page-content/SKILL.md
├── knowledge-garden-to-raw/SKILL.md
├── knowledge-garden-trigger/SKILL.md
├── knowledge-garden-visualmap/SKILL.md
├── learning-loop/SKILL.md
├── notion-cli/SKILL.md
├── pi-plannotator-auto/SKILL.md
├── plannotator-sync/SKILL.md
├── round-table/SKILL.md
├── todos/SKILL.md
├── wiki-ingest/SKILL.md
├── wiki-knowledge/SKILL.md
├── wiki-lint/SKILL.md
├── wiki-pdf/SKILL.md
├── wiki-query/SKILL.md
├── wiki-youtube/SKILL.md
└── work-tracker/SKILL.md
```

## License

Private - CheerioCorner
