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
| knowledge-garden | Notion 知識花園管理 |
| notion-cli | Notion CLI 操作 |

### 📚 Obsidian-dependent（需要 vault 結構）

| Skill | 說明 |
|-------|------|
| wiki-knowledge | Obsidian 知識庫 ingest/query/lint |
| youtube-to-wiki | YouTube → raw → wiki |
| work-tracker | 工作狀態管理 |
| notion-to-raw | Notion → raw 抓取 |
| plannotator-sync | Plannotator → raw 同步 |

## Repository 結構

```
skills/
├── knowledge-garden/SKILL.md
├── notion-cli/SKILL.md
├── wiki-knowledge/SKILL.md
├── youtube-to-wiki/SKILL.md
├── work-tracker/SKILL.md
├── notion-to-raw/SKILL.md
└── plannotator-sync/SKILL.md
```

## License

Private - CheerioCorner
