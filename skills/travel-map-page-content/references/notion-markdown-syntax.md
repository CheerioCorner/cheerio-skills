# Notion-flavored Markdown 語法備忘（旅遊地圖實際用過、驗證可用的子集）

完整規格是 MCP 資源 `notion://docs/enhanced-markdown-spec`（透過 notion-fetch 讀取），
語法很大，這份只收錄旅遊地圖頁面實際會用到、已經驗證成功的子集，省得每次都要整份
重新讀一次規格文件。真的遇到這裡沒有的語法，還是要去讀完整規格，不要用猜的。

## Callout（提示框）

```
<callout icon="💱" color="gray_bg">
	**粗體標題**
	內文...
</callout>
```

- `icon` 可以是 emoji，也可以省略
- `color` 可選：`gray_bg`／`blue_bg`／`green_bg`／`brown_bg`／`red_bg`／`yellow_bg`／`purple_bg`，省略就是預設白底
- 可以巢狀（callout 裡面再放 callout），用於「大標題 callout 包住說明 callout」的情境

## Columns（分欄）

```
<columns>
	<column ratio="33">
		內容...
	</column>
	<column ratio="33">
		內容...
	</column>
	<column ratio="34">
		內容...
	</column>
</columns>
```

- `ratio` 是百分比數字（不用寫 %），同一組 `<columns>` 底下的 `ratio` 加總抓大概接近 100 即可，不用剛好整除
- 常見比例：兩欄對半用 `50`/`50`；窄欄+寬欄用 `25`/`75`（例：點子收集箱窄欄、行程項目表格寬欄）

## Embed（嵌入外部工具）

```
<embed src="https://tool.lifehacker.tw/currency/embed?v=table&b=JPY&a=10000&t=TWD"></embed>
```

用於嵌入匯率換算工具等外部小工具，`src` 是完整 URL。

## Details（可折疊區塊，toggle）

```
<details>
<summary>🍽️ 餐廳候選</summary>
	- 項目一
	- 項目二
</details>
```

用於「點子收集箱」這種預設收合、點開才看到內容的清單。

## 標題加背景色

```
# ✈️ 旅程 {color="blue_bg"}
```

標題後面加 `{color="..."}` 可以讓整個標題區塊變色，用於區隔頁面上的大分區（旅程/地方誌/見聞錄各用不同顏色）。

## 內嵌資料庫（Linked Database View）

**不是 markdown 語法能表達的東西**——這是 Notion 的 block 類型，要用 `notion-create-view`
工具搭配 `parent_page_id` 建立，不能寫在 content 字串裡。如果在既有頁面內容裡看到
`<database url="..." data-source-url="...">名稱</database>`，那是 fetch 讀出來的既有區塊
表示法，不是你可以自己手寫塞進 content 去建立的語法。

## 分隔線

```
---
```

用來隔開頁面的大區塊（例如「頁首 callout」跟「匯率/待辦/地圖三欄」之間）。

## 已知風險：手動輸入 Unicode 逃逸字元容易打錯字

實際建置時發生過的教訓：手動用 `\uXXXX` 逃逸序列輸入中文字時，容易選錯碼位打出形近字
（例如「這趟」誤打成「這趙」、「回饋」誤打成「回馈」）。寫入前建議用平常的中文字直接
輸入，而不是逐字查 Unicode 碼位；寫入後最好用 notion-fetch 讀回來目視核對一次，不要
只憑「工具沒報錯」就假設內容正確。
