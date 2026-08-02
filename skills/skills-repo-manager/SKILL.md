---
name: skills-repo-manager
description: 管理 cheerio-skills 私有 repo。當使用者提到「更新 skills repo」、「sync skills」、「push skills」或需要管理 skills 時使用。
---

# Skills Repo Manager

管理 `C:/cheerio/pi/cheerio-skills/` 私有 repo 的同步與更新。

## Repo 位置

- **本地：** `C:/cheerio/pi/cheerio-skills/`
- **GitHub：** https://github.com/CheerioCorner/cheerio-skills
- **安裝：** `npx skills add CheerioCorner/cheerio-skills@<skill-name> -g -a pi`

## 操作流程

### 1. 同步更新（主要用途）

當 `~/.agents/skills/` 中的 skills 有變更時，同步到 cheerio-skills repo：

```bash
# 來源目錄
SOURCE="C:/Users/User/.agents/skills"

# 目標目錄
TARGET="C:/cheerio/pi/cheerio-skills/skills"

# 同步指定 skill
cp -r "$SOURCE/<skill-name>" "$TARGET/"

# 同步多個 skills
for skill in wiki-knowledge youtube-to-wiki work-tracker notion-to-raw notion-cli knowledge-garden plannotator-sync pi-plannotator-auto; do
  cp -r "$SOURCE/$skill" "$TARGET/"
done
```

### 2. 提交變更

```bash
cd C:/cheerio/pi/cheerio-skills
git add -A
git status  # 確認變更內容
git commit -m "update: <skill-name> - <簡短說明>"
git push
```

### 3. 查看 Repo 狀態

```bash
cd C:/cheerio/pi/cheerio-skills
git status
git log --oneline -5
```

### 4. 列出可安裝的 Skills

```bash
npx skills add CheerioCorner/cheerio-skills --list
```

## Skills 清單

| Skill | 類別 | 說明 |
|-------|------|------|
| knowledge-garden | Agent-agnostic | Notion 知識花園管理 |
| notion-cli | Agent-agnostic | Notion CLI 操作 |
| wiki-knowledge | Obsidian-dependent | 知識庫 ingest/query/lint |
| youtube-to-wiki | Obsidian-dependent | YouTube → raw → wiki |
| work-tracker | Obsidian-dependent | 工作狀態管理 |
| notion-to-raw | Obsidian-dependent | Notion → raw 抓取 |
| plannotator-sync | Obsidian-dependent | Plannotator → raw 同步 |
| pi-plannotator-auto | Pi-specific | Extension 開發規則 |

## 注意事項

- 只同步我們建立的 skills，不包含第三方 skills
- 每次更新後執行 `git push` 同步到 GitHub
- 變更說明要簡潔明確
