# 藏經 Cangjing

本機 PDF 研究文件整理工具，基於 [藏書 Cangshu](https://github.com/GildShen/cangshu)（MIT，原作者 GildShen）。目前版本 0.3.1，主要驗證平台為 Windows。

## 功能

0.3.1 將研究理解架構改為階層心智圖，按文字與子樹尺寸排版，可展開收合、平移縮放、符合畫面與來源跳頁。PDF 底部頁碼左側顯示目前文件背景分析，點選可直接查看進度、取消／重試、用量與結果。

0.3.0 新增「研究規則／Skill」管理、本機資料夾與 ZIP 匯入、四個內建研究流程及共同 AGENTS.md。預讀與多頁研究保存當時指令快照，改規則不改舊工作／重試；可回顧實際指令與歷史用量。見 [研究 Skills](docs/research-skills.md)。

研究專案管理採專案清單與單一編輯區，顯示 PDF 數、未儲存變更、儲存／取消及刪除確認。PDF 文件封面可由頁面縮圖右鍵設定，亦可輸入頁碼預覽或恢復第一頁；選擇隨備份保留，原檔與閱讀位置不變。

已啟用 AI 預讀時，同次分析包含研究整理與帶來源的理解架構；UI 顯示不另呼叫 AI。知識圖預設收起，額外萃取只接受手動操作，匯入／預讀不自動啟動。沒有 CLI 時只使用 metadata。

0.2.1 改為 PDF 專用閱讀器。側欄分為「專案／文獻」分頁，預設文獻的最近閱讀，各自記住選取範圍。匯入按鈕直接選 PDF；標註提供三個獨立圖示。用量顯示累計 Token、可展開表格、可讀時間及模型，缺漏值明示未回報。

既有 EPUB 仍保存於資料庫與完整備份；「舊版資料」可匯出原始檔，不列入可閱讀文獻與專案數量。沒有 EPUB 閱讀、轉換或網頁匯出入口。

- PDF 匯入、內容雜湊重複辨識、PDF 第一頁完整比例縮圖快取、縮圖／清單檢視。
- **研究專案**與文件多對多；**文件分類**為獨立單一主分類。新增、改名、刪除專案或分類均保留文件。拖曳與鍵盤可操作的關聯選單；專案範圍可再依分類篩選。
- 多值標籤、閱讀狀態、最近閱讀、文件名稱／作者搜尋及標籤／狀態篩選。
- PDF 目錄、縮圖、頁碼、旋轉與文字搜尋。
- 螢光筆、底線與文字註釋（編輯／刪除／來源跳轉）、附來源頁碼的文件筆記；專案筆記可連結多份文件證據，匯出 Markdown。
- 可人工編輯與確認標題、作者、年份、期刊、DOI，原始 metadata、AI 候選與人工資料分開保存。
- 已登入 Codex CLI 且使用者首次啟用後，PDF 逐頁文字分段背景分析。保留等待／分析中／完成／部分完成／失敗／取消、分段進度、頁面覆蓋、版本與回報 Token 用量；取消／重試／重啟恢復，不因重複匯入而重跑。
- 指定多頁（如 `1-3,7,10-12`）＋自訂研究指令、全文分段整合、取消／手動續跑、附頁碼與原指令的結果筆記；使用量以已回報合計與可展開明細呈現。
- 手動另行啟用的研究知識圖：概念／理論／方法／發現、附逐字證據的有向關係、確定性標示、文件／專案範圍、Cytoscape.js 視覺圖與鍵盤清單、篩選及 JSON／Markdown 匯出。參見 [研究流程](docs/research-workflows.md)。
- AI 結構化結果：書目、摘要、研究問題、方法、發現、限制、建議標籤，附原文短摘錄和物理頁碼，來源無法核對的欄位不採用。
- 隔離本機 renderer 外掛：安裝、啟用／停用、權限與錯誤狀態；文件 metadata 命令／結果面板與筆記 Markdown 匯出範例。
- 本機 ZIP 備份／還原文件、封面頁、縮圖、研究資料、Skill／共同規則與分析紀錄，還原驗證文件雜湊並停用自動分析。

沒有已登入 CLI 時只使用 PDF metadata；不自動改用 OpenAI API。既有選取文字的 Codex CLI／OpenAI API 翻譯、解釋、摘要仍可使用。閱讀與縮圖不等待全文分析。

## 啟動與建置

使用 Node.js 24、npm 11，在專案根目錄執行：

```powershell
cd desktop
npm ci
npm test
npm run test:ui
npm start
```

Electron 直接載入內建介面，不需 dev server、資料庫服務或其他常駐服務。首次取得 Electron 執行資源需網路；若尚未下載完成，可執行 `node node_modules/electron/install.js` 後重試。

```powershell
npm run build  # Windows 可執行資料夾
npm run dist   # Windows NSIS 安裝檔
```

輸出位於 `outputs/desktop-release/`；可直接執行完整 `win-unpacked/Cangjing.exe` 資料夾，或執行 `Cangjing-Setup-0.3.1.exe` 安裝。安裝包未簽章。儲存庫不提交安裝包、node_modules、資料檔或測試截圖。

版本鎖定於 `desktop/package-lock.json`。UI 測試使用自製 PDF 與舊版資料相容測試、獨立測試 profile 與 Chromium viewport，產物放在未追蹤的 `work/`，不呼叫真實 AI。若已有相同版本 Electron，可用 `CANGJING_ELECTRON_BINARY` 指定 UI 測試執行檔。建置工具鏈仍有 npm audit 告警，詳見 [驗證紀錄](docs/verification.md)。

## 資料與 AI

產品識別：`local.cangjing.reader`、`Cangjing.exe`、`%APPDATA%\CangjingReader`、IndexedDB `cangjing-library-v1`。與藏書資料獨立，不自動遷移或複製文件／筆記／金鑰。備份檔含完整匯入文件，請自行妥善保存；API 金鑰、Codex 登入與外掛程式不包含在備份。

自動全文分析需一次明確啟用。頁碼化文字會送至已登入 Codex 服務，可能計入帳戶用量。CLI 使用既有登入身份與額度，維持唯讀、工具禁用、ephemeral 與不可信引文邊界。選取文字的 OpenAI API 功能需自行設定金鑰，金鑰經 safeStorage 加密儲存。

AI 候選仍需人工核對；不能捏造作者、年份、DOI 或引用。覆蓋率分別記錄全文頁數與有效文字頁，掃描空白頁不算成已讀文字。模型沒有回報用量時記為未知。本次未傳送私人研究文件，也未做真實付費 AI 呼叫。

## 文件與限制

- [研究功能及後續規劃](docs/research-roadmap.md)
- [介面與桌面架構](docs/design-architecture.md)
- [外掛貢獻者文件](docs/plugins.md)
- [測試與已知限制](docs/verification.md)

第一版沒有 OCR、雲端同步、Zotero、向量資料庫、外掛市集或原生外掛。跨文件全文搜尋與 BibTeX／RIS 引用匯出仍屬後續規劃。PDF 搜尋需文字層；DRM 不受支援。

## 來源與授權

基於藏書 commit `08b9d95b7443e4541d99cc0dcc1f43e3e6032fde`，僅複用已追蹤應用原始碼、必要閱讀資源與授權。未複製來源 `.git`、私人文件、使用者資料、憑證、安裝包或私人測試截圖；来源工作目錄未修改。依賴以 npm 鎖定安裝，建置使用 Electron 執行資源，不提交依賴目錄。

保留 [MIT License](LICENSE) 的 `Copyright (c) 2026 GildShen` 與完整 [第三方授權聲明](THIRD_PARTY_NOTICES.md)。修改後仍採 MIT；匯入文件及 AI 服務不屬於程式授權範圍。