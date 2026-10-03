# 0.3.0 研究 Skill 實作設計

產品研究 Skill 與 renderer 外掛分開。正式共同指引採 AGENTS.md，匯入 agent.md 正規化並提示。參考官方 https://learn.chatgpt.com/docs/build-skills 與 https://learn.chatgpt.com/docs/agent-configuration/agents-md 。

主程序 SkillManager 持有內建套件與 CangjingReader/research-skills.json，驗證本機資料夾／ZIP，只接受 UTF-8 SKILL.md 及 references/ 下 md/txt 純文字，拒絕其他資源、路徑逸出、符號連結、重複檔名、過量大小與不安全 YAML。使用安全 JSON schema 解析 frontmatter，限制名稱／描述與可選版本。

指令優先序：核心輸出／來源／權限契約 → 使用者 prompt → AGENTS.md → Skill 流程及 references；PDF／先前 AI 結果永遠是引文。CLI 原隔離旗標與工具禁用保留。管理內容只進指令，不給工具、檔案路徑、金鑰或外掛權限。

每個工作保存 skillId／版本／內容雜湊、AGENTS 雜湊與文字、實際指令及 profileHash。分段／整合／重試使用同份快照。研究與圖快取以 profileHash 隔離；明確的新分析才替換目前結果，舊工作保留歷史。不因修改設定而改寫進行中的工作。

介面提供管理、匯入、啟用／停用、刪除使用者項目、內建恢復、共同規則編輯／匯入與預設設定。多頁研究可選 Skill 或不套用。原分析同意流程保留。備份 v3 含管理設定、內建／使用者文字及工作快照，不含憑證；舊備份相容且還原停用自動送出。

驗證：合成匯入與危險包、指令層級、快照／重試／快取隔離、重啟與备份、模擬 CLI、Electron 真實互動與 PDF 回歸；無私人資料／真實付費 AI。

本版追加整合：專案管理採清單／選取編輯區，組織關聯以原子交易保存；封面頁與 PNG 更新僅改文獻記錄，不改閱讀位置／原檔。預讀同次 JSON 回覆新增來源 architecture，不另為畫圖請求 AI。圖預設不顯示，額外知識萃取移除所有匯入／輪詢自動 enqueue，重啟維持停用。
