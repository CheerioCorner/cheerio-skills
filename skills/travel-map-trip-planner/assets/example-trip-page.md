<!--
這是「【範例】2026 東京賞櫻五日」旅程頁面正文的原始 Notion-flavored Markdown。
用途：
1. 平常新增旅程 = 用 notion-duplicate-page 複製 example_trip_page（見 schema 的 notion_locations），
   不需要用到這份檔案。
2. 這份檔案是備援與參考：如果 example_trip_page 這頁不慎遺失/損毀，可以用 notion-create-pages
   把下面這段 content 重新建到「旅程」data source 底下，把版面復原。
3. 這份檔案只有「正文」，不含：
   - Properties（旅程名稱/狀態/日期區間/目的地/同行夥伴/預算總額/回顧心得）要另外用
     properties 參數設定，不在這段 markdown 裡
   - 頁尾內嵌的「行程項目」Data Table 是 Notion 的 linked database view 區塊，不是
     markdown 能表達的東西，重建後要另外呼叫 notion-create-view，parent_page_id 指向
     這頁、data_source_id 指向行程項目、filter 所屬旅程＝這頁的 URL，見
     travel-map-trip-planner/SKILL.md 流程 1 步驟 3。
4. 幣別（範例用 JPY）、待辦清單內容、地圖連結，複製後都要按實際旅程改掉。
-->

<callout icon="📌" color="blue_bg">
	這是一頁**旅程範例**，之後要建新旅程時，直接複製（Duplicate）這頁，再改標題、日期、目的地就好，結構不用重搭。
</callout>
---
<columns>
	<column ratio="33">
		<callout icon="💱" color="gray_bg">
			**這趟的即時匯率（JPY）**
			<embed src="https://tool.lifehacker.tw/currency/embed?v=table&b=JPY&a=10000&t=TWD"></embed>
		</callout>
	</column>
	<column ratio="33">
		<callout icon="✅" color="gray_bg">
			**這趟待辦事項**
			- [ ] 確認護照有效期
			- [ ] 訂機票
			- [ ] 訂飯店
			- [ ] 日幣現金
		</callout>
	</column>
	<column ratio="33">
		<callout icon="🗺️" color="gray_bg">
			**這趟的地圖**
			貼上這趟的 Google My Maps 分享連結
		</callout>
	</column>
</columns>
---
<columns>
	<column ratio="25">
		# 💡 點子收集箱
		<details>
		<summary>🍽️ 餐廳候選</summary>
			- …
		</details>
		<details>
		<summary>🏞️ 景點候選</summary>
			- …
		</details>
		<details>
		<summary>🏨 住宿選項</summary>
			- …
		</details>
		<details>
		<summary>🚗 交通方式</summary>
			- …
		</details>
	</column>
	<column ratio="75">
		# 📋 行程項目
		> 下方會插入內嵌的行程項目 Data Table，已篩選只顯示這趟。
	</column>
</columns>
---
# 📝 回顧心得
> 完成後填，準備回饋進地方誌/見聞錄。
