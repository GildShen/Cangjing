# Third-party components

The application and retained historical source include third-party components under their respective licenses. Since 0.2.1 the runtime is PDF-only; EPUB.js, converter.js and export.js are excluded from the application package. EPUB.js notices remain for the historical source retained in this repository.
Original project code is licensed under the MIT License in LICENSE.

| Component | Upstream | License |
| --- | --- | --- |
| EPUB.js | https://github.com/futurepress/epub.js | BSD-2-Clause |
| JSZip | https://github.com/Stuk/jszip | MIT or GPL-3.0; used under MIT |
| Lucide | https://github.com/lucide-icons/lucide | ISC |
| DOMPurify | https://github.com/cure53/DOMPurify | Apache-2.0 or MPL-2.0 |
| PDF.js | https://github.com/mozilla/pdf.js | Apache-2.0 |
| Electron | https://github.com/electron/electron | MIT, plus bundled Chromium notices |
| Cytoscape.js 3.34.3 | https://github.com/cytoscape/cytoscape.js | MIT; full license in ebook-browser/vendor/cytoscape/LICENSE |

Vendor notices are preserved in source headers and accompanying license files.
PDF.js font and WASM notices are included under `ebook-browser/vendor/pdf/`.
Electron distributions include their own LICENSE and LICENSES.chromium.html.
Optional Noto fonts are loaded from Google Fonts, not bundled with this repository.

Graphify-Labs/graphify architecture (https://github.com/Graphify-Labs/graphify/blob/v8/ARCHITECTURE.md) inspired the source-backed extraction / graph construction / chunk-cache workflow. No Graphify source code, assets, Python package, or skill is bundled. Its licenses are not represented as this application's license.
