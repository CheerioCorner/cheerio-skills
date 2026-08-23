# Cheerio Skills

> 私有 agent skills 集合，可透過 `npx skills add` 安裝。這份 README 與 `~/.agents/skills` 保持鏡像同步——本機是 source of truth，改動請先改本機再同步過來，不要只改這裡。

## 安裝

```bash
# 列出可用 skills
npx skills add CheerioCorner/cheerio-skills --list

# 安裝單一 skill（全域 + Pi）
npx skills add CheerioCorner/cheerio-skills@wiki-ingest -g -a pi

# 安裝所有 skills
npx skills add CheerioCorner/cheerio-skills --all -g -a pi
```

## Skills 分類

### 🤝 跨 Agent 通訊（呼叫其他 CLI）

| Skill | 說明 |
|-------|------|
| chat-with-claude | 呼叫 Claude Code CLI 執行任務 |
| chat-with-copilot | 呼叫 GitHub Copilot CLI 執行任務 |
| chat-with-gemini | 呼叫 Antigravity CLI（agy）執行 Gemini 任務 |
| chat-with-gemini-research | 用 Gemini 深度研究，強制要求引用出處與 citations |
| round-table | 多 AI 圓桌會議（Pi 主持不投票，Claude+Gemini+Copilot 參與） |

### 🌱 Notion 知識花園

| Skill | 說明 |
|-------|------|
| knowledge-garden | 維護 Notion 知識花園（種子、灌溉、狀態評估） |
| knowledge-garden-page-content | 根據種子/專題資訊研究來源，產生完整頁面內容（研究專題/成熟種子會用 round-table 合成多元觀點） |
| knowledge-garden-to-raw | Notion 頁面 → raw，準備深入研究或 ingest |
| knowledge-garden-trigger | 偵測花園觸發條件（靈感標籤、知識過期、專題過大等），執行有條件的回流 |
| knowledge-garden-visualmap | 種子/專題視覺地圖（Mermaid，狀態評估發現缺地圖時自動觸發建立） |
| gemini-notion-workflow | Gemini 存取 Notion API/CLI 的工具參考；實際呼叫透過 chat-with-gemini |
| notion-cli | Notion CLI（`ntn`）命令參考 |

### 🔬 深度研究

| Skill | 說明 |
|-------|------|
| deep-research-intake | 多輪提問收斂研究意圖與範圍，產出 spec.json |
| deep-research-execute | 讀 spec.json，跑健檢/輪詢/篩選/人類確認/匯入，產出人類可讀的 sources-report.md，可從 checkpoint 接續 |

### 📚 Obsidian Wiki（大腦）

| Skill | 說明 |
|-------|------|
| wiki-ingest | 從 raw/ 建立或更新 wiki 頁面（雙模型交叉驗證，Pi 主持不投票，全自動不需人類確認） |
| wiki-ingest-pdf | PDF → Markdown → raw，轉檔後交給 wiki-ingest 處理 |
| wiki-ingest-youtube | YouTube 字幕/逐字稿 → raw，轉檔後交給 wiki-ingest 處理 |
| wiki-lint | 健康檢查（結構+品質+半衰期+矛盾+Source Fidelity+遺漏稽核，能自動處理就不等人類） |
| wiki-query | 查詢 wiki 內容，高價值洞察全自動回填 |
| work-tracker | 管理 `work/` 可追溯工作狀態 |
| cheerio-roadmap | 地鐵路線圖風格 Artifact 呈現工作進度，問進度/更新 work 時自動重繪同一個連結 |
| learning-loop | 任務完成後自動提取學到的東西、分析工作模式、追蹤 skill 效果 |

### 🛠️ 工程輔助

| Skill | 說明 |
|-------|------|
| code-review | 沿 Standards / Spec 兩軸審查變更 |
| tdd | 測試驅動開發（red-green-refactor） |
| improve-codebase-architecture | 掃描 codebase 找深化機會，產出 HTML 報告後逐一 grill |
| setup-matt-pocock-skills | 設定 issue tracker、triage label、domain doc layout（其他工程 skill 的前置設定） |
| to-spec | 把目前對話整理成 spec 並發布到 issue tracker |
| to-tickets | 把 plan/spec/對話拆成 tracer-bullet tickets |
| skill-creator | 建立、修改、優化 skill，跑 eval 測效果 |
| find-skills | 幫使用者找到並安裝合適的 agent skill |

### 🖊️ Plannotator

| Skill | 說明 |
|-------|------|
| pi-plannotator-auto | 開發維護 pi-plannotator-auto extension |
| plannotator-annotate | 開啟 Plannotator 標註 UI（檔案/URL/資料夾），依回傳標註行動 |
| plannotator-compound | 分析 Plannotator plan 歸檔，找否決模式與回饋分類，產出 HTML dashboard |
| plannotator-last | 對最新一則 assistant 訊息開啟 Plannotator，依標註修訂 |
| plannotator-review | 開啟 Plannotator 瀏覽器 code review UI（worktree 或 PR URL） |
| plannotator-setup-goal | 把想法整理成 `/goal` 用的 goal package |
| plannotator-sync | Plannotator → Obsidian raw/conversations/ 同步，準備 ingest |
| plannotator-visual-explainer | 產生 Plannotator 風格的自包含 HTML 視覺化說明 |

### 🎨 其他

| Skill | 說明 |
|-------|------|
| to-presentation | 製作高品質 HTML slide deck（guizang-ppt-skill 設計系統 + huashu-design 渲染引擎） |
| grilling | 針對 plan/decision/idea 進行地毯式追問，逐一釐清決策樹 |
| grill-me | `grilling` 的 slash-command 捷徑（`disable-model-invocation`，只能明確呼叫） |

## Repository 結構

```
skills/
├── chat-with-claude/SKILL.md
├── chat-with-codex/SKILL.md
├── chat-with-copilot/SKILL.md
├── chat-with-gemini/SKILL.md
├── chat-with-gemini-research/SKILL.md
├── cheerio-roadmap/
├── code-review/
├── deep-research-execute/
├── deep-research-intake/SKILL.md
├── find-skills/SKILL.md
├── gemini-notion-workflow/SKILL.md
├── grill-me/SKILL.md
├── grilling/SKILL.md
├── improve-codebase-architecture/
├── knowledge-garden/
├── knowledge-garden-page-content/SKILL.md
├── knowledge-garden-to-raw/SKILL.md
├── knowledge-garden-trigger/SKILL.md
├── knowledge-garden-visualmap/SKILL.md
├── learning-loop/SKILL.md
├── notion-cli/
├── pi-plannotator-auto/SKILL.md
├── plannotator-annotate/
├── plannotator-compound/
├── plannotator-last/
├── plannotator-review/
├── plannotator-setup-goal/
├── plannotator-sync/SKILL.md
├── plannotator-visual-explainer/
├── round-table/
├── setup-matt-pocock-skills/
├── skill-creator/
├── tdd/
├── to-presentation/
├── to-spec/
├── to-tickets/
├── wiki-ingest/SKILL.md
├── wiki-ingest-pdf/SKILL.md
├── wiki-ingest-youtube/SKILL.md
├── wiki-lint/SKILL.md
├── wiki-query/SKILL.md
└── work-tracker/SKILL.md
```

## License

Private - CheerioCorner
