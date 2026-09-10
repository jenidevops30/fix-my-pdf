/**
 * build-brand-assets.mjs — FixMyPDF brand asset pipeline
 *
 * Run from /home/z/my-project:  bun scripts/build-brand-assets.mjs
 *
 * Inputs  (AI-generated, no baked-in text):
 *   public/icons/icon-raw.png   (1024x1024 app icon art)
 *   public/icons/og-bg-raw.png  (1344x768 OG background art)
 *
 * Outputs:
 *   public/icons/icon-512.png        512x512 PNG
 *   public/icons/icon-192.png        192x192 PNG
 *   public/icons/apple-touch-icon.png 180x180 PNG
 *   public/icons/favicon-32.png      32x32  PNG
 *   public/og-image.png              1200x630 PNG (+ crisp SVG text overlay)
 */

import sharp from "sharp";
import { statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ICONS = path.join(ROOT, "public", "icons");
const ICON_RAW = path.join(ICONS, "icon-raw.png");
const OG_RAW = path.join(ICONS, "og-bg-raw.png");
const OG_OUT = path.join(ROOT, "public", "og-image.png");

// ---------------------------------------------------------------------------
// Icon pipeline: square source -> exact-size PNGs (cover crop guards against
// any non-square drift in the raw art).
// ---------------------------------------------------------------------------
const ICON_TARGETS = [
  { file: "icon-512.png", size: 512 },
  { file: "icon-192.png", size: 192 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
];

async function buildIcons() {
  for (const { file, size } of ICON_TARGETS) {
    const out = path.join(ICONS, file);
    await sharp(ICON_RAW)
      .resize(size, size, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9 })
      .toFile(out);
  }
}

// ---------------------------------------------------------------------------
// OG pipeline: 1200x630 cover crop + SVG text overlay rendered by sharp
// (vector-rasterized typography — pixel-crisp, never AI text).
// ---------------------------------------------------------------------------

// Top-left text block starts around x=72, y=210 (cap-top of the headline).
// Baselines: headline cap-top ≈ 210 for the 88px line.
const ogTextSvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <text x="72" y="272" font-family="sans-serif" font-weight="700" font-size="88" fill="#ffffff">FixMyPDF</text>
  <text x="72" y="350" font-family="sans-serif" font-weight="600" font-size="54" fill="#ffffff">Your PDF is wrong.</text>
  <text x="72" y="418" font-family="sans-serif" font-weight="700" font-size="54" fill="#f97316">We&#39;ll fix it.</text>
  <text x="72" y="502" font-family="sans-serif" font-weight="400" font-size="30" fill="#94a3b8">100% in your browser &#183; zero uploads</text>
</svg>`.trim();

async function buildOg() {
  await sharp(OG_RAW)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .composite([{ input: Buffer.from(ogTextSvg), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(OG_OUT);
}

// ---------------------------------------------------------------------------
// Verification: every output must exist, be a valid PNG, and match its exact
// dimensions. Prints a metadata table; exits non-zero on any mismatch.
// ---------------------------------------------------------------------------
const EXPECTED = [
  ...ICON_TARGETS.map((t) => ({
    file: path.join(ICONS, t.file),
    w: t.size,
    h: t.size,
  })),
  { file: OG_OUT, w: 1200, h: 630 },
];

async function verify() {
  let ok = true;
  const rows = [];
  for (const { file, w, h } of EXPECTED) {
    const rel = path.relative(ROOT, file);
    try {
      const meta = await sharp(file).metadata();
      const bytes = statSync(file).size;
      const valid =
        meta.format === "png" && meta.width === w && meta.height === h;
      if (!valid) ok = false;
      rows.push({
        file: rel,
        dims: `${meta.width}x${meta.height}`,
        fmt: meta.format,
        size: `${(bytes / 1024).toFixed(1)} KB`,
        status: valid ? "OK" : "MISMATCH (expected " + w + "x" + h + " PNG)",
      });
    } catch (err) {
      ok = false;
      rows.push({
        file: rel,
        dims: "-",
        fmt: "-",
        size: "-",
        status: "MISSING/INVALID: " + err.message,
      });
    }
  }

  console.table(rows);
  return ok;
}

const results = await Promise.all([buildIcons(), buildOg()]);
void results;
const ok = await verify();
console.log(ok ? "\nAll brand assets OK." : "\nAsset verification FAILED.");
process.exit(ok ? 0 : 1);
