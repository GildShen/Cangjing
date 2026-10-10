# Third-party components

The application and retained historical source include third-party components under their respective licenses. Since 0.2.1 the runtime is PDF-only; EPUB.js, converter.js and export.js are excluded from the application package. EPUB.js notices remain for the historical source retained in this repository.
Original project code is licensed under the MIT License in LICENSE.

| Component | Upstream | License |
| --- | --- | --- |
| EPUB.js | https://github.com/futurepress/epub.js | BSD-2-Clause |
| js-yaml 4.3.2 | https://github.com/nodeca/js-yaml | MIT; full license in packaged node_modules/js-yaml/LICENSE |
| argparse 2.0.1 | https://github.com/nodeca/argparse | Python-2.0; full license in packaged node_modules/argparse/LICENSE |
| JSZip | https://github.com/Stuk/jszip | MIT or GPL-3.0; used under MIT |
| Lucide | https://github.com/lucide-icons/lucide | ISC |
| DOMPurify | https://github.com/cure53/DOMPurify | Apache-2.0 or MPL-2.0 |
| PDF.js | https://github.com/mozilla/pdf.js | Apache-2.0 |
| Electron | https://github.com/electron/electron | MIT, plus bundled Chromium notices |
| Cytoscape.js 3.34.3 (historical source only; excluded from 0.6 runtime/package) | https://github.com/cytoscape/cytoscape.js | MIT; retained historical license in ebook-browser/vendor/cytoscape/LICENSE |

Vendor notices are preserved in source headers and accompanying license files.
PDF.js font and WASM notices are included under `ebook-browser/vendor/pdf/`.
Electron distributions include their own LICENSE and LICENSES.chromium.html.
Optional Noto fonts are loaded from Google Fonts, not bundled with this repository.

Graphify-Labs/graphify architecture (https://github.com/Graphify-Labs/graphify/blob/v8/ARCHITECTURE.md) inspired the source-backed extraction / graph construction / chunk-cache workflow. No Graphify source code, assets, Python package, or skill is bundled. Its licenses are not represented as this application's license.

## Semantic evaluation data

The fixed evaluation sample in docs/evaluation/scifact-12.json is derived from [SciFact](https://github.com/allenai/scifact), Wadden et al., “Fact or Fiction: Verifying Scientific Claims” (EMNLP 2020). Claims and evidence annotations are CC BY 4.0; abstracts originate from Semantic Scholar S2ORC and are ODC-By 1.0, per the [dataset license](https://github.com/allenai/scifact/blob/master/LICENSE.md). Selection and archive SHA256 are recorded in the fixture. The abstracts have no physical PDF-page numbers; null page values must not be presented as PDF evidence. These data licenses apply to the sample independently of the application MIT license.
