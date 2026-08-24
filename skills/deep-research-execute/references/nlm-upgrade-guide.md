# nlm CLI 升級指南

給 AI 自己執行升級用的程序，不需要每次都請 Cheer 手動處理。目標：`check_provider.js` 回報 `cli_version_ok: false` 時，AI 依照這份文件自主完成升級並驗證，只有真的卡住才升級為請人類協助。

## 目前已驗證的版本門檻

`scripts/check_provider.js` 要求 `cli_version >= 0.9.14`（2026-08-23 驗證過）。這個數字只會往上調，不會往下調——每次升級驗證完，如果發現新版本運作正常，就把這個門檻同步更新成新版本號，避免下次又卡在舊門檻誤判。

## 升級步驟

1. **判斷是否需要升級**：跑 `node scripts/check_provider.js`，看 `cli_version_ok`。`false` 才繼續下面的步驟。
2. **執行升級**：
   ```
   pip install --upgrade notebooklm-mcp-cli
   ```
3. **已知會卡住的狀況：`WinError 32`（檔案被占用）**
   - 症狀：pip 安裝過程中回報 `nlm.exe` 或相關檔案被另一個程序占用，安裝失敗。
   - 處理：
     - 用 `Get-Process | Where-Object {$_.Path -like "*nlm*"}`（PowerShell）或類似方式找出占用者。
     - **不要自己砍掉不確定是誰開啟的 process**——這可能是 Cheer 自己開著的終端機或工具。找到占用者後，明確告知 Cheer「升級被 `<process 名稱/PID>` 卡住，需要您先關閉它」，等待處理後再重跑升級指令。
     - 只有能明確判斷該 process 是自己（AI 這次任務）之前啟動、且已經沒有用途的殘留 process，才可以自行結束它。
4. **升級後驗證（AI 自己跑完，不用等人類確認）**：
   1. 重跑 `node scripts/check_provider.js`，確認 `cli_version_ok: true` 且 `authenticated: true`。若 `authenticated: false`，代表升級可能重置了認證狀態，需要請 Cheer 重新 `nlm login`——這一步才需要人類介入。
   2. 跑以下指令，跟這份文件最後「已知參數快照」章節比對，確認本 skill 實際會用到的旗標沒有被改名/移除：
      ```
      nlm --help
      nlm research start --help
      nlm query notebook --help
      nlm source rename --help
      nlm source delete --help
      nlm list sources --help
      nlm list notebooks --help
      ```
      只要發現任何差異（旗標改名、被移除、新增了必填參數），**先不要繼續跑正式研究任務**，逐一比對 `scripts/*.js` 裡有沒有用到受影響的旗標，改好之後才能繼續。改完記得同步更新下面的「已知參數快照」章節。
   3. 用 `fast` 模式（不是 `deep`）跑一個無關痛癢的小 smoke test，確認整條 `research start --wait-and-import` 路徑還能正常跑完並匯入來源，例如：
      ```
      nlm research start "test query for CLI smoke test" -t "smoke-test-temp" -m fast --wait-and-import --profile <profile>
      ```
      跑完後用 `nlm delete notebook <該 notebook id> --confirm` 清掉這個測試 notebook，不要留垃圾 notebook。
      **不要直接拿正式研究題目當升級後的第一次驗證**——失敗了會分不清是 CLI 升級的問題還是研究內容本身的問題。
5. 驗證全部通過後，才回到正常流程繼續跑使用者實際要的研究任務。

## 已知參數快照（2026-08-23，nlm 0.9.14）

供下次升級時比對用，發現落差就更新這一節：

- `nlm research start QUERY [-s web|drive] [-m fast|deep] [-n NOTEBOOK_ID] [-t TITLE] [--force] [--wait-and-import] [-p PROFILE]`
- `nlm research status NOTEBOOK --task-id TASK_ID [--poll-interval N] [--max-wait N] [--full]`（本 skill 改用 `--wait-and-import` 後已不再是主要路徑，僅作為逾時後的手動查詢備援）
- `nlm query notebook NOTEBOOK QUESTION [--json] [-c CONVERSATION_ID] [-s SOURCE_IDS] [-p PROFILE] [-t TIMEOUT] [--new-conversation]`
- `nlm source delete SOURCE_IDS... [--confirm/-y] [--json/-j] [-p PROFILE]`
- `nlm source rename SOURCE_ID TITLE -n NOTEBOOK [-p PROFILE]`
- `nlm list sources NOTEBOOK [--full] [--json] [--quiet] [--url] [-p PROFILE]`
- `nlm list notebooks [--json] [-p PROFILE]`
- `nlm login profile list`、`nlm login --check [--profile PROFILE]`、`nlm config get auth.default_profile`
