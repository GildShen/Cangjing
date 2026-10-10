# 藏經桌面版

啟動、測試與建置見根目錄 README。資料位於 %APPDATA%/CangjingReader，共同研究規則為 AGENTS.md，研究 Skill 設定與受控文字為 research-skills.json；CLI 與 renderer 外掛維持隔離。0.6.0 Windows x64 安裝檔輸出於 outputs/desktop-release；0.6.0 證據研究工作台已完成本機回歸及介面驗證，詳見 docs/delivery-0.6.0.md。

正式封裝可用 `Cangjing.exe --verify-startup` 在新的臨時資料目錄驗證載入與受限 preload，再自動退出；不使用既有藏經資料。此檢查不取代實機安裝與真實 AI 測試。
