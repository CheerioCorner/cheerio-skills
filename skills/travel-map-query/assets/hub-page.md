<!--
這是「✈️ Cheerio 旅遊地圖」主頁正文的原始 Notion-flavored Markdown。
用途：純備援參考——主頁是一次性建立的東西，平常操作不會重建它，這份檔案是萬一
主頁遺失/損毀時的復原依據，不是日常流程的一部分。

重建方式：
1. 用 notion-create-pages 建一頁 workspace 層級頁面，title「✈️ Cheerio 旅遊地圖」，
   icon 設 🧭（不要把 emoji 寫進 title 文字裡，跟知識花園的圖示規則一致），content
   貼下面這段（三個 <database> 標籤裡的 url／data-source-url 要換成當下實際的
   database/data source，見 travel_map_schema.yaml 的 notion_locations）
2. 三個 <database> 內嵌區塊是用 notion-create-view 的 parent_page_id 附加上去的，
   不是靠這段 markdown 本身建立——如果整頁重建，這三個內嵌檢視要另外重新呼叫
   notion-create-view（旅程／地方誌／見聞錄，順序見下方 content，旅程排最前面）。
-->

<callout icon="🧭">
	# 航跡藍圖
	> 每一趟旅程都是一次探索。有些去過還想再去，有些還只是一個念頭。<br>重要的是：走過的路、吃過的店、辦過的簽證，都留下來，下次不用重找一次。
	<callout icon="🌏" color="gray_bg">
		這裡是 Cheerio 知識花園的旅行版本，三個資料庫各司其職：
		- **📍 地方誌** — 洲/國家/城市或區域，固定四層分類，是旅程唯一會關聯的目的地清單，終生精簡
		- **📓 見聞錄** — 掛在地方誌底下的餐廳、景點、主題筆記，會持續增加，但不影響地方誌
		- **✈️ 旅程** — 一趟趟實際或還在構想的旅行，狀態從點子走到已完成
		行程項目不是獨立資料庫的展示對象，它是每趟旅程頁面正文裡的一塊內嵌 Data Table。
	</callout>
</callout>
---
<columns>
	<column ratio="50">
		<callout icon="💱" color="gray_bg">
			**常用匯率總覽**
			<embed src="https://tool.lifehacker.tw/currency/embed?v=table&b=TWD&a=1000&t=JPY%2CUSD%2CEUR%2CTHB%2CKRW"></embed>
		</callout>
	</column>
	<column ratio="50">
		<callout icon="🗺️" color="gray_bg">
			**足跡總覽地圖（歷年所有旅程）**
			<details>
			<summary>如何嵌入？</summary>
				在 Google My Maps 標記所有去過的地方，複製分享連結貼在這裡即可即時同步。
			</details>
		</callout>
	</column>
</columns>
---
# ✈️ 旅程 {color="blue_bg"}
> 打開主頁最想先看到的是「現在有什麼行程」。
<!-- 內嵌旅程 database 檢視插入於此 -->
---
# 📍 地方誌 {color="brown_bg"}
> 旅程的目的地清單，只收洲/國家/城市或區域，終生大概一兩百筆。
<!-- 內嵌地方誌 database 檢視插入於此 -->
---
# 📓 見聞錄 {color="green_bg"}
> 所有吃過玩過的餐廳、景點、主題筆記，可能上千筆，當參考資料查。
<!-- 內嵌見聞錄 database 檢視插入於此 -->
---
*維護者：Cheerio + Pi*
*建立日期：2026-08-31*
