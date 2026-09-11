// Bundles offscreen/offscreen.src.js (which uses npm packages) into
// offscreen/offscreen.js (a plain ESM file the browser can load directly),
// and copies the ONNX Runtime WASM/glue files this needs into
// vendor/paddleocr/ alongside the model files already sitting there.
//
// Run with: npm install && npm run build

const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

async function build() {
  console.log("Building offscreen/offscreen.js from offscreen/offscreen.src.js...");
  await esbuild.build({
    entryPoints: ["offscreen/offscreen.src.js"],
    outfile: "offscreen/offscreen.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["chrome120"],
    minify: false,
    sourcemap: false,
    alias: {
      // The WASM-only onnxruntime-web build, not the default bundle — the
      // default bundle uses embind's `new Function`, which MV3's extension
      // CSP rejects outright.
      "onnxruntime-web": "./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs"
    },
    external: ["onnxruntime-node", "canvas"],
    loader: { ".wasm": "file" }
  });
  console.log("  -> offscreen/offscreen.js written");

  const ortDist = path.join(__dirname, "node_modules", "onnxruntime-web", "dist");
  const destDir = path.join(__dirname, "vendor", "paddleocr");
  fs.mkdirSync(destDir, { recursive: true });

  for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
    const src = path.join(ortDist, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(destDir, file));
      console.log(`  -> copied ${file} into vendor/paddleocr/`);
    } else {
      console.warn(`  !! ${file} not found in node_modules/onnxruntime-web/dist — did npm install run?`);
    }
  }

  console.log("\nBuild complete. Reload the unpacked extension in chrome://extensions.");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
