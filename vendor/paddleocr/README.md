# PaddleOCR model + runtime files

These are bundled locally for the same reason Tesseract's files were: the
Chrome Web Store doesn't allow an extension to fetch and execute remote code,
so everything the OCR engine needs has to ship inside the package.

`det.ort`, `rec.ort`, and `dict.txt` are PaddleOCR's PP-OCR detection model,
recognition model, and character dictionary, from PaddlePaddle/PaddleOCR
(Apache 2.0 license) — these are model weights/data, not executable code.
`ort-wasm-simd-threaded.mjs` / `.wasm` are ONNX Runtime Web's WASM backend
(from the `onnxruntime-web` npm package).

## Regenerating these files

`npm run build` (see `../build.js`) regenerates the two `ort-wasm-simd-threaded.*`
files from whatever `onnxruntime-web` version is installed. It does NOT fetch
`det.ort` / `rec.ort` / `dict.txt` — those came from a working reference
extension (PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-extension on GitHub) rather
than being downloaded fresh, since `ppu-paddle-ocr` itself only auto-downloads
models to a local cache directory when used from Node — there's no plain URL
to fetch them from for a browser build. If you ever need to regenerate them
(e.g. to pick up an updated PP-OCR model), the cleanest path is cloning that
reference repo again and copying its `models/` folder.

## License note for the Chrome Web Store listing

Since this ships PaddleOCR's actual model weights, it's worth crediting
PaddlePaddle/PaddleOCR (Apache 2.0) somewhere in the store listing or a NOTICE
file before publishing — not strictly required by Apache 2.0 for this kind of
use, but good practice and something a Web Store reviewer could plausibly ask
about.
