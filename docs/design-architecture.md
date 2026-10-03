# 藏經基礎版設計與架構

## 設計決策

- Surface：文件庫為 command-led、閱讀器為 reading-led；使用者整理研究文件並回查閱讀證據。
- P1：文件列表或原文；P2：研究專案、文件分類與搜尋；P3：作者、格式、章節／頁碼和筆記；Action：匯入、閱讀與標註。
- Content truth：空庫不預填文件、統計與書目；測試只用自製合成文件。
- Composition：窄版「產品／匯入 → 搜尋／排序 → 文件格 → 可收合的專案／分類導覽」；寬版「研究專案／文件分類 | 搜尋、文件格」，閱讀時「目錄 | 原文 | 可選 AI 輔助」。
- System：沿用既有平面工具介面、Lucide 圖示、中文字體與 44px 窄版控制；藍色標示操作和選取。PDF 使用完整比例首頁縮圖；清單模式保留較小比例縮圖。
- Signature：PDF 真實首頁與證據頁碼，文字備援以左側線標辨識來源文件；無裝飾動效、假數據與行銷主視覺。
- Failure risks：窄版工具列換行遮蔽原文；超寬文件格疏離。以 390、768、1440、1920、2560px 真實 Chromium viewport 檢查。

## 桌面架構

保留主程序掌管本機檔案、AI 服務和加密設定；renderer 管理閱讀介面與 IndexedDB；preload 以 contextBridge 暴露限定 invoke 方法。contextIsolation、sandbox、webSecurity 為 true，nodeIntegration 為 false。IPC 檢查主視窗、主 frame 與固定來源，AI 請求及設定有型別／長度／允許值驗證。檔案由原生對話框或啟動參數取得，讀取前限制格式、大小與檔案類型；應用資源阻擋路徑越界。

藏經使用 local.cangjing.reader、Cangjing.exe、%APPDATA%\CangjingReader、cangjing-library-v1 與獨立 localStorage 鍵；不從藏書資料目錄遷移。單一執行個體鎖依 Electron userData 隔離。API 金鑰在新資料目錄加密保存，不回傳 renderer。CLI 仍使用使用者既有 Codex 登入身份與額度；AI 服務帳戶不因資料目錄分開而變成不同帳戶。

後續風險：匯入大型文件仍在 renderer 處理，全文索引宜搬到 worker；資料備份／遷移需先於新資料表。Windows 為本次驗證平台，macOS 生命週期未驗證。開發建置工具依賴 audit 告警需另外處理，不把測試通過解讀為全部依賴無風險。


## 已驗證與最弱環節

文件庫與 PDF 閱讀器已於五種 Chromium viewport 驗證。最弱環節是窄版 PDF 工具列的空間成本：390px 需多行控制；已確認原文仍可見且目錄會自動收起。大型文件庫與全文文字擷取效能仍未壓力測試。背景分析和插件狀態不阻擋核心閱讀；損壞的佇列或外掛設定會另存保留並停用相關功能。

## 0.2.0 的研究流程擴充

閱讀器保留原本的文件庫／閱讀工作流，文字標註面板增加底線、文字註釋與證據連結。多頁研究使用獨立對話框，先顯示文字量與頁面覆蓋；知識圖使用左圖右證據、窄版上下排列，另有鍵盤清單。已以實際 Electron viewport 修正小視窗溢出及舊 aside 樣式影響。

主程序的 CliScheduler 序列化 selected text、PageTasks、ResearchQueue 及 KnowledgeQueue，互動工作優先下一個分段。原頁文字快取、圖分段快取、工作結果與知識 schema 分開；圖只採精確來源驗證，同名保留各來源。核心 adapter 介面沒有開放 renderer 外掛敏感能力。詳見 [研究流程](research-workflows.md)。

## 0.2.1 PDF 專用介面

側欄採真實 tablist／tab／tabpanel、roving tabindex 與方向鍵／Home／End，各自記住專案、分類與文獻範圍，預設文獻＋最近閱讀。空專案顯示建立引導，切換不寫入文件資料。

所有讀取入口只接受 PDF；舊 EPUB 的資料庫、來源筆記與備份相容保留，可匯出原始檔，不計入閱讀庫。EPUB.js、轉換器及網頁匯出模組不裝入執行包；PDF 仍使用共用 WebBookReader 輔助方法、JSZip 備份及 DOMPurify。

三個 icon-only 標註按鈕具 aria-label／title。右鍵與 toolbar 在 pointerdown 保留來源選取，依文件／頁碼核對；元素邊界 Range 亦換算文字偏移。選單方向鍵與 Enter／Space 可操作；無選取和編輯欄位保留原生選單。

UsageUI 統一累計／表格與狀態，不把快取或推理再加到合計。使用穩定 DOM 保留 details 開啟狀態和 summary 焦點。
