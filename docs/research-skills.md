# 藏經 0.3.0 研究規則與 Skill

「研究規則／Skill」管理產品內的研究指令，與 renderer 外掛、Codex 全域 Skill 安裝分開。藏經載入 Skill 的文字流程及受控 references；不使用 CLI 原生自動探索或執行完整 Skill 工具鏈。格式參考 [官方 Build skills](https://learn.chatgpt.com/docs/build-skills)，共同指引正式採 [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。

## 內建流程

- literature-evidence：文獻結構與證據分析。
- methods-review：研究方法檢視。
- source-comparison：跨頁與文獻比較。
- traceable-knowledge：可溯源知識萃取。

所有流程要求實體頁碼、逐字摘錄、未知欄位留空、區分作者明載／AI 推論／不確定，不補造 DOI、引用或書目。核心輸出仍符合研究 JSON 或知識圖來源 schema。

## 匯入及管理

選本機 Skill 資料夾，或 ZIP 中根目錄／單一上層資料夾。只接受 UTF-8 的 SKILL.md 與 references/ 下 md／txt 純文字；不支援 scripts、assets、agents 設定、hooks 或其他檔案。匯入後先停用；可查看名稱、描述、來源、版本、完整流程與參考，再啟用。使用者項目可刪除；內建項目可停用，或以「恢復內建規則與 Skills」恢复。

SKILL.md 需 YAML frontmatter 的小寫連字號 name、非空 description 及 Markdown 流程。版本建議放在 metadata.version；未提供顯示「未指定」。產品亦接受文字型 version／license／compatibility 與文字 metadata；YAML 標籤、別名、錨點、重複鍵或非字串名稱／描述會拒絕。不宣稱支援原生 Skill 的所有欄位或資源。

上限：Skill ZIP 1 MB；展開總文字 256 KB；21 個文字檔（1 個入口＋最多 20 個 references）；每檔與共同規則各 64 KB；100 個 Skill。驗證中央 ZIP 目錄、實際串流展開量、大小、路徑、重複／大小寫檔名、符號連結、UTF-8 與二進位內容；不直接解壓至檔案系統。YAML 使用 js-yaml 的 JSON schema，並拒絕標籤／別名／錨點。

共同規則可直接編輯，或匯入 Markdown 為草稿；匯入 agent.md 等名稱會提示儲存時正規化為 AGENTS.md。正式規則存於藏經獨立資料目錄的單一 AGENTS.md；Skill 設定與受控文字存 research-skills.json，不讀取私人全域 Skill、金鑰或其他主機設定。

## 套用與快照

多頁研究可選已啟用的 Skill 或不套用；預讀、知識萃取各有預設配置。即使不選 Skill，原研究功能與共同規則仍可使用。

優先序：核心輸出／来源／權限契約 → 使用者研究指令 → AGENTS.md → 選定 Skill／references。PDF 與先前 AI 回覆始終是待核對證據。由主程序解析選擇並組成指令，維持 ignore-user-config、skip_host_skill_discovery、工具／外掛／hooks／shell／網路禁用與唯讀 ephemeral 執行。這些 Skill 只增加研究指令，不擴大權限。

每個工作保存 Skill ID／版本／內容雜湊、共同規則文字／雜湊、实际指令與整體 profileHash。分段、整合、重試使用同份快照；停用或刪除 Skill 不會抹去舊工作。設定改變不會自動重送資料。預讀可按「以目前研究規則重新分析」；手動知識萃取採當前配置。不同快照隔離去重與快取，舊結果／用量留在歷史，可展開實際指令。

## 理解架構与備份

預讀的同次 JSON 回覆包含研究整理與 architecture 節點／關係。原文明確、推論、不確定分開，沒有逐字來源的項目不採用；UI 繪圖不另送 AI。圖顯示預設收起，手動開啟使用既有結果。額外知識萃取需另行手動同意與點擊；不因匯入、預讀或程式啟動自動萃取，可能增加用量。

備份 v3 包含 Skills、共同規則、各工作完整快照、歷史用量、研究架構與封面頁，沒有登入／金鑰／外掛程式。仍讀取 v1／v2；舊備份缺少 Skill 管理設定時保留目前設定，旧工作沒有快照時維持原功能，不把新 Skill 偷套入舊工作。還原停用自動分析與知識萃取；未完成多頁工作需手動繼續。

多頁介面目前一次選一份 PDF；比較 Skill 僅比較已提供內容，不會自動讀取其他文獻。大型包、複雜 PDF 與真實 AI 結果品質仍需更多測試；本次使用合成資料與模擬 CLI。
