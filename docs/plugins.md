# 藏經 renderer 外掛 API v1

第一版實作本機資料夾安裝、啟用／停用、相容性驗證、權限 broker、命令、文件詳情文字面板及結果面板。範例 `plugins/document-info/` 提供文件資訊摘要與筆記 Markdown 匯出。核心文件庫、專案／分類、閱讀與 AI 佇列不依賴外掛。

## 格式與安裝

資料夾包含 `manifest.json` 與一個 entry JavaScript 檔；入口限定單一 basename `.js`，禁止相對路徑跳出及 symlink。UI「外掛 → 從資料夾安裝」只複製這兩個已驗證檔案到藏經 userData 的 `plugins/<id>/`，預設停用。第一版不支援多檔案打包、更新、原生程式碼、市集與自動下載。

```json
{
  "id": "document-info",
  "name": "文件資訊摘要",
  "version": "1.0.0",
  "apiVersion": 1,
  "entry": "entry.js",
  "permissions": ["documents.metadata.read", "notes.export"],
  "contributions": {
    "commands": [{"id": "summarize-library", "title": "顯示文件資訊摘要"}],
    "panels": [{"id": "document-metadata", "title": "文件資訊"}]
  }
}
```

`id` 為 3–64 字小寫英數連字號且以英文字母開頭；API 版本必須為 1。不支援的權限／版本會拒絕安裝。啟用表示使用者授予管理介面明列的權限；變更 manifest 不會靜默擴大權限。

## 公開 API

隔離 frame 內的 `CangjingPlugin` 為 frozen API 物件：

| API | 權限 | 行為 |
| --- | --- | --- |
| `getDocuments()` | `documents.metadata.read` | 目前文件的 id、標題、作者、格式、原始 metadata、人工書目、標籤與閱讀狀態；沒有原始二進位、全文、金鑰或 filesystem 路徑 |
| `getProjects()` | `projects.read` | 專案 id、名稱與簡述；不複製文件 |
| `exportNotes()` | `notes.export` | 返回包含來源定位的 Markdown；管理介面可儲存外掛結果 |
| `getData()`／`setData(json)` | `storage` | 僅該外掛 namespace 的 JSON，限制 1 MB，不存取核心 IndexedDB |
| `onCommand(id, handler)` | manifest 命令 | handler 可 async，返回文字結果，最多 20,000 字；返回取消註冊函式 |
| `onPanel(id, handler)` | manifest 面板 | handler 收到 `{documentId}`，返回文字；顯示於核心文件資訊對話框，不注入 HTML |
| `on(event, handler)` | 尚未提供資料事件 | API 預留事件訂閱，返回取消註冊函式；v1 不會推送文件全文或選取事件 |

命令回覆以 textContent 顯示，不執行 HTML。例：

```javascript
CangjingPlugin.onCommand('summarize-library', async () => {
  const documents = await CangjingPlugin.getDocuments();
  return documents.map(d => `${d.title} · ${d.type || 'EPUB'}`).join('\n');
});
```

## 邊界與生命週期

每個外掛在 `sandbox="allow-scripts"` 的獨立 iframe 執行，不加入 allow-same-origin；其來源為 opaque，無法存取閱讀器 DOM、核心 IndexedDB 或 preload。插件 URL 使用 `cangjing-plugin://<id>/`，只允許 index、SDK 與指定 entry 三個資源。CSP 禁止網路連線、圖片外傳、物件、表單及其他資源；不提供 Node、ipcRenderer、child_process、API 金鑰與主程序物件。

parent 檢查訊息來源 frame、`origin === 'null'`、每次載入產生的 token、訊息型別、request id 與 method。主程序 broker 再查已啟用插件身分、方法與 manifest 權限；沒有 AI、全文或任意 filesystem 能力。這是隔離 iframe／RPC，並非同一主閱讀器上下文中的模組沙箱。

載入握手 5 秒、命令回覆 10 秒逾時；錯誤顯示在管理介面。停用／離頁會移除 iframe、清除命令 timer 並拒絕未完成請求，因此訂閱與外掛執行上下文一併銷毀。第一版不保證抵擋惡意 CPU／記憶體耗盡；只應啟用可審查的本機外掛。

## 驗證與後續

`npm test` 驗證 manifest、API 相容性、禁用／未授權請求與 CSP。`npm run test:ui` 在 Electron 實測範例載入、metadata 命令、筆記匯出、無 Node／preload／core globals 與停用清理。不需要私人資料與真實服務呼叫。

後續另行設計側欄／文件詳情的豐富面板、分析器、全文／頁碼文字／選取事件、寫筆記、AI 與網路權限。敏感能力必須有新的顯式權限、主程序驗證及測試；v1 不宣稱這些擴充點已完成。


0.2 提供受信任主程序 `KnowledgeQueue` 的 schemaVersion 1 分析器 adapter 介面，見 [研究流程](research-workflows.md)。這是核心服務擴充，沒有改變 v1 外掛權限，外掛仍不能存取原頁文字或任意呼叫 AI。
