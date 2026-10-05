# 0.4.0 驗證與限制

驗證日期：2026-10-05（Asia/Taipei），Windows、Node.js 24.13.0、Electron 44.3.0。

- 單元測試 68 項、Electron／Chromium 介面檢查 210 項通過，renderer error 0。全部 AI 回覆為合成替身，PDF、Skill 與資料目錄為獨立 fixtures；沒有私人 PDF、金鑰或真實 AI 請求。
- 滾輪使用真正 Chromium mouseWheel 事件，驗證長頁內捲動、頁底向下只翻一頁／慣性鎖、頁頂反向落於上一頁底、短頁、末頁不循環、關閉偏好、Ctrl、側欄、對話框與旋轉。單元驗證 render＋quiet 鎖與水平／Shift／停用事件。失敗渲染保留旧 canvas 和頁碼；既有縮放／換文件／文字標註檢查保留。
- 摘要開啟沒有 AI 呼叫；完整、部分、舊版零散結果、覆蓋與缺值明示、原文和來源跳頁均通過。新的理論／結論解析與舊指令快照兼容另有單元測試。
- AI 目錄需手動送出，切換／開啟不送 AI；分段、來源／頁碼／層級驗證、推論標記、取消重試、進度／用量／快照／歷史、掃描頁不 OCR 與備份保留通過。包含真實 PDF bookmark fixture：原始目錄優先，原書籤指向第 2 實體頁，切換後保留。
- 副本在真實 Windows 暫存檔案系統執行 SHA256 與目錄檢查。驗證獨立專案、同名不同內容不覆蓋、同內容重用、實際名稱持久、不隨標題改名、更換目錄／移除關聯保留外部檔、中斷發布啟動恢復、junction 拒絕、授權根身分變更拒絕、刪除專案撤銷未來寫入授權與備份撤銷授權。ENOSPC／EACCES 是限定檔案操作的故障注入，驗證錯誤狀態、保留關聯和手動重試；沒有填滿真實磁碟或更改系統 ACL。
- 原生選擇器／确认框 API 的回傳採測試替身，主程序預覽與確認流程、取消不寫檔、確認後真實 PDF 副本／雜湊通過；未實際手動操作 Windows 原生選擇器。開啟目錄的 OS Explorer 行為未人工驗證。
- 390／768／1440／1920／2560 的摘要、AI 目錄／切換按鈕與副本管理無水平溢出，保留文獻庫、Skill、心智圖與 PDF 閱讀器的原有檢查；已人工查看截圖。
- NSIS x64 安裝包成功重建，版本 0.4.0，113477414 bytes。ASAR 共 343 個檔案／目錄，277 個檔案與當前來源逐位元比較（含全部封裝 reader 資源、主程序／preload／新 queues、研究 Skills 與授權）。正式依賴只有 js-yaml／argparse；排除測試、工作資料、金鑰、使用者 Skill 設定、PDF／EPUB／轉換模組。
- 真正封裝 Cangjing.exe 的 --verify-startup 通過：app.isPackaged=true、版本 0.4.0、reader／新模組／受限 preload 載入、無 Node require、空文件庫和空佇列。使用新的 OS 臨時 profile，不讀寫既有藏經 profile，安全設定保持。非致命 fs.Stats deprecation warning 已保存於紀錄。

仍未驗證：真實 Codex／OpenAI 端到端回覆、乾淨 Windows 安裝／升級／解除安裝、檔案關聯／系統捷徑、macOS／Linux、大量文獻與特殊 PDF 壓力、真實斷電。正式包啟動檢查不等於完成這些驗證。安裝包未簽章，沒有 OCR。

2026-10-05 的 npm audit 共 2 項（1 high：http-cache-semantics；1 moderate：fast-uri），未修復；屬開發／建置依賴。--omit=dev 的正式依賴 audit 為 0 項。沒有更改鎖定依賴版本，不把告警數變動稱為修復。

副本逐次驗證路徑／realpath／Windows 重解析點和 dev/ino；Node 路徑 API 不宣稱對具備本機檔案修改權限的攻擊者提供目錄句柄級原子保證。不支援硬連結時採獨佔複製，突然中止可能留未完成檔，下次不採作成功、也不覆蓋。授權目錄改動／中止可能保留暫存檔。副本是獨立保存，不監看外部手動更動或作雙向同步。

备份含原始 PDF 與副本 registry／AI 目錄；外部副本、內部來源快取、金鑰與 CLI 登入不封裝。還原目錄須重新選擇並確認。IndexedDB 與外部檔案系統不是同一原子交易。

只修改藏經 checkout；沒有對 D:/dev/books 做寫入。MIT 和原作者署名保留。安裝檔 SHA256：f60512069fcd2861ec665664652cb106f590105152d19465e86de5476fb29dcd。本機驗證紀錄與截圖在 outputs/verification-0.4.0，不提交 profile、私人資料或安裝包。
