# FixMyPDF — Shared Worklog

---
Task ID: 1
Agent: main orchestrator (Z.ai Code)
Task: Project setup for FixMyPDF — install PDF processing dependencies and assets

Work Log:
- Inspected scaffold: Next.js 16 App Router, Tailwind 4, full shadcn/ui set in src/components/ui, sonner available.
- Installed `pdf-lib@1.17.1` and `pdfjs-dist@6.3.289` via bun.
- Copied `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` → `public/pdf.worker.min.mjs` (version-locked worker).
- Copied `node_modules/pdfjs-dist/cmaps` → `public/pdfjs/cmaps` and `standard_fonts` → `public/pdfjs/standard_fonts` for render fidelity.
- Verified pdfjs v6 API still supports `page.render({ canvasContext, viewport })` and `TextItem.hasEOL`.

Stage Summary:
- PDF processing is 100% client-side (privacy pitch is real). Worker served from /pdf.worker.min.mjs. No backend processing needed or wanted.

---
Task ID: 2
Agent: main orchestrator (Z.ai Code)
Task: Build the client-side PDF engine + pure helpers

Work Log:
- Created `src/lib/pdf/format.ts` — SSR-safe pure helpers: formatBytes, mbToBytes, parsePageSpec ("3, 7, 12, 19-23"), pagesToCompactSpec, pagesForFilename, baseName, parseRequirements (deterministic regex parser for size/pages/format/dimensions), downloadBlob.
- Created `src/lib/pdf/pdfjs.ts` — lazy dynamic importer of pdfjs-dist (never executes during SSR); sets workerSrc=/pdf.worker.min.mjs; loadPdfjsDoc with cMap/standardFont URLs and safe buffer copies (pdf.js transfers buffers).
- Created `src/lib/pdf/engine.ts` — all browser-side operations:
  - getBasicInfo (pageCount + encrypted flag, pdf-lib with pdfjs fallback)
  - extractPagesToFile / removePagesFromFile (structural surgery via pdf-lib; friendly error for password-protected files)
  - analyzeDocument (one render pass per page → thumbnails + ink ratios; cached by UI)
  - detectBlankPages + BLANK_THRESHOLDS (conservative 0.002 / normal 0.006 / lenient 0.015 ink ratio)
  - findPagesWithText (pdf.js text layer search, per-page snippets, reports scanned/no-text documents)
  - makeItFit — flagship compressor: pass 0 = metadata strip (text stays selectable; early-exits if it fits), then deterministic 5-step raster ladder (144→54 DPI, quality 0.72→0.36, optional grayscale) that stops at the first pass under target; honest per-pass report, best-effort fallback if nothing fits
  - applyRequirements ("The website says…"): trims to maxPages (keeps first N) then compresses to maxBytes
- Fixed makeItFit: single pageCount lookup, simplified best-pass tracking, unified early-return.

Stage Summary:
- Engine API is stable and typed; UI agents should only import from `@/lib/pdf/engine` and `@/lib/pdf/format`. Progress callbacks: `onProgress({phase, percent, detail})`.

---
Task ID: 3
Agent: main orchestrator (Z.ai Code)
Task: Demo sample PDF + theme/font wiring

Work Log:
- Wrote `scripts/generate-sample.ts` (sharp gaussian-noise "scanned" pages + pdf-lib text overlay) and generated `public/samples/fixmypdf-demo.pdf` (2.63 MB, 12 pages, blank pages 7 & 12, searchable "Policy Schedule" on pages 5 & 9). Served at `/samples/fixmypdf-demo.pdf`.
- Rewrote `src/app/layout.tsx`: DM Mono (--font-dm-mono) + Anonymous Pro (--font-anon-pro) via next/font/google, FixMyPDF metadata, sonner Toaster (bottom-right, richColors), body has min-h-screen flex flex-col for sticky footer.
- Updated `src/app/globals.css`: @theme maps --font-sans → Anonymous Pro, --font-mono/--font-heading → DM Mono; base layer styles h1-h6/buttons with heading font; orange ::selection; `.slim-scrollbar` utility for page grids.

Stage Summary:
- Fonts: headings/buttons = DM Mono (via --font-heading / font-heading utility or automatic for h1-h6+button), body = Anonymous Pro (default font-sans). Accent color: orange-600 (#ea580c). Page canvas: #f8faff. Do NOT use blue/indigo.

---
Task ID: 3-b
Agent: full-stack-developer
Task: Build FixMyPDF UI

Work Log:
- Read worklog.md + inspected engine.ts/format.ts signatures, layout.tsx (fonts/Toaster wired), globals.css (.slim-scrollbar), and shadcn/ui primitives (Button, Badge, Card, Checkbox, Progress, Input, Label, Textarea, Skeleton).
- Created `src/components/fixmypdf/types.ts` — shared Mode / JobResult / AnalysisState / WorkspaceCallbacks types (JobResult fit variant gained one OPTIONAL field `targetBytes?` so ResultPanel can render "(Too Large)" truthfully when no byte limit existed).
- Built shell components: `header.tsx` (sticky, pulsing wasm trust pill), `hero.tsx` (badge, H1, 6 role=tablist mode pills with aria-pressed), `footer.tsx` (mt-auto sticky footer), `how-it-works.tsx` (#how-it-works, 3 steps), `privacy-ribbon.tsx` (ShieldCheck + 0ms/0bytes stats).
- Built `upload-zone.tsx` (drag/drop + click + hidden input reset for re-pick, sample-doc loader with spinner + toast error), `file-bar.tsx` (page badge, size colored rose>2MB/emerald, amber password note, Switch file button).
- Built 6 modes in `modes/`: fit-mode (presets 1/2/5MB with ★ Common, exact MB input w/ "MB MAX" suffix, strip-metadata checked + grayscale unchecked, orange CTA w/ live label), requirements-mode (parseRequirements → emerald actionable chips + slate informational chips, amber "no limit detected" hint, disabled until actionable), keep-mode (ensureAnalysis on mount, thumbnail grid w/ selection ring + check badge, bidirectional spec input via parsePageSpec/pagesToCompactSpec, filename preview, skeleton grid + progress while analyzing), blank-mode (sensitivity toggles w/ BLANK_THRESHOLDS info line, blank chips w/ ink %, emerald clean state), remove-mode (spec input + live "N of M pages will remain" preview, quick actions blanks/odd/even, guard against removing all pages), find-mode (form search w/ progress, results list w/ page badges + snippets + line-clamp, scanned-doc amber warning, extract-found CTA).
- Built `result-panel.tsx` (Verification Engine header w/ per-kind status badges, idle promise bullets per mode, working Progress, fit body w/ rose/emerald size bars + honest pass ledger w/ last-success emphasis + amber fallback note + trim info line, pages body w/ big page count, error alert + Try again, sticky download footer w/ toast).
- Built `secondary-cards.tsx` (3 keyboard-accessible Cards w/ previews that switch mode + smooth-scroll to #workspace; active card tinted orange), `workspace.tsx` (file gate → FileBar + 2-col grid lg:controls|result, stacks <lg), `app.tsx` (orchestrator: PDF validation + >200MB warning toast, getBasicInfo w/ error toast, runId-guarded ensureAnalysis cache, runFit/runRequirements/runExtract/runRemove/search runners w/ working→result→error+toast lifecycle, onResetResult).
- Rewrote `src/app/page.tsx` to render `<FixMyPdfApp />`; no other route/page/API created; no changes to layout.tsx, globals.css, src/lib/**, or ui components.
- Verified: `bun run lint` → 0 problems; `bunx tsc --noEmit` → 0 errors in new files; dev server (auto) compiles `/` with 200; sample PDF present at /samples/fixmypdf-demo.pdf; grep confirms zero blue/indigo classes.

Stage Summary:
- Complete single-route FixMyPDF UI shipped in src/components/fixmypdf/** (13 files + page.tsx). All 6 modes (fit, keep, requirements, blank, remove, find) are reachable from hero pills and secondary cards, wired to the real engine API with progress, toasts, and verified-download result panel. Palette slate/orange/emerald/rose only; sticky footer; mobile-first stacking.
- Deviations (intentional, documented): (1) added eslint ignore for public/** — the vendored minified pdf.worker.min.mjs (Task 1 asset) was failing `bun run lint` with 6 pre-existing errors; (2) one optional `targetBytes?` field on JobResult fit variant, needed for the spec's conditional "(Too Large)" label; (3) remove-mode also warms ensureAnalysis on mount so its "Remove blank pages" quick action works without visiting keep/blank first; (4) blank-mode removal flows through runRemove(pages, {action:"blank", headline, bullets}) so the JobResult "blank" action is used; (5) `bunx tsc --noEmit` still reports pre-existing errors in examples/, skills/ and src/lib/pdf/** (pdfjs v6 typings from Task 2) — those paths are outside this task's allowed edit scope; all Task 3-b files type-check clean.

---
Task ID: 4 & 5
Agent: main orchestrator (Z.ai Code)
Task: pdfjs v6 API fixes, final lint/tsc, and full Agent Browser end-to-end verification

Work Log:
- Fixed pdfjs-dist v6 breaking changes in src/lib/pdf: render() now requires the canvas param (used { canvas: null, canvasContext } to keep white-fill + grayscale ctx.filter working); doc.destroy() moved to the loading task (loadPdfjsDoc now returns { doc, destroy } handle); removed removed isEvalSupported option.
- bunx tsc --noEmit clean for all project code; bun run lint 0 errors.
- Agent Browser verification of the golden paths on http://localhost:3000 (all green):
  - Home renders (hero, 6 mode pills, upload zone, secondary cards, how-it-works, privacy ribbon, sticky footer); zero console/page errors; dev.log clean.
  - Sample loader: "Try a sample document" fetches /samples/fixmypdf-demo.pdf -> file bar shows 12 pages / 2.6 MB (rose).
  - MAKE IT FIT 1.0 MB: pass ledger Original 2.6MB ✗ -> metadata ✗ -> 144DPI 2.1MB ✗ -> 110DPI 891KB ✓, "Passed All Limits", download to disk verified (912,833 bytes, valid PDF, 12 pages, opens via pdf-lib).
  - KEEP PAGES: thumbnails render (blank 7/12 appear white), typed "1, 5, 9" syncs grid selection, filename preview fixmypdf-demo-pages-1-5-9.pdf, extracted PDF validated = exactly 3 pages.
  - BLANK PAGES: detected p.7 + p.12 at 0.00% ink (Normal sensitivity), removed -> "Removed 2 blank pages", remaining 10 pages.
  - FIND: "Policy Schedule" -> Found on 2 pages (5, 9), 4 matches, snippets shown, extract CTA present.
  - "THE WEBSITE SAYS...": pasted "must be a PDF, maximum size 1 MB, maximum 10 pages" -> chips ≤1.0MB, ≤10 pages, PDF informational -> ran -> "Trimmed to the first 10 of 12 pages" + compressed; downloaded output validated: 10 pages, 0.78 MB (BOTH constraints pass).
  - REMOVE PAGES: input "1-2, 5" -> live "9 of 12 pages will remain" -> removed 3 pages OK.
  - Mobile 390x844: layout stacks cleanly, header fits, footer sticks naturally; desktop 1280 full-page clean.
- Honesty fix: upload-zone badge "Max 500 pages analyzed" (unenforced claim) -> "100% in-browser".
- Cleaned verification screenshots; dev server healthy (GET / 200) after final edit.

Stage Summary:
- FixMyPDF is production-ready: every MVP fix from the concept doc is implemented, browser-verified end-to-end with real downloads validated byte-level. All processing is client-side (privacy claim is true). Zero runtime errors in dev.log.

---
Task ID: 6
Agent: main orchestrator (Z.ai Code)
Task: Add dark mode (next-themes) + switch typography to DM Mono / DM Sans / Jost

Work Log:
- Rewrote `src/app/layout.tsx`: swapped Anonymous Pro for DM Sans (--font-dm-sans) and added Jost (--font-jost) via next/font/google (self-hosted equivalent of the user's Google Fonts <head> embed); wrapped app in next-themes ThemeProvider (attribute="class", defaultTheme="system", disableTransitionOnChange); body now uses font-sans (DM Sans).
- Created `src/components/theme-provider.tsx` and `src/components/theme-toggle.tsx` (CSS-driven sun/moon icon swap to avoid hydration mismatch; aria-label "Toggle dark mode").
- Rewrote `src/app/globals.css` palettes: light = FixMyPDF brand (canvas #f8faff, ink #0b1329 primary, orange-500 ring), dark = deep-navy "midnight blueprint" (#060c1b bg, #0c1526 card, light primary for inverted buttons, rgba slate-blue borders); added --font-display → Jost theme key, .dark ::selection, .dark slim-scrollbar styles.
- Added ThemeToggle to header; restyled header/hero/footer/how-it-works/privacy-ribbon/upload-zone/file-bar/workspace/secondary-cards/result-panel/app root plus all 6 mode files to semantic tokens (bg-card, bg-muted, text-muted-foreground, border-border, bg-primary/text-primary-foreground) and dark: variants for orange/emerald/rose/amber accents (e.g. bg-emerald-500/10, dark:text-orange-400); progress tracks → bg-muted with dark orange indicator.
- Typography roles: DM Sans = body, DM Mono = h2-h6/buttons/inputs/labels/mono text (unchanged base rule), Jost = hero h1 via new font-display utility.
- Verification: bun run lint → 0 problems; bunx tsc --noEmit clean; Agent Browser E2E — light full page ✓, dark full page ✓, toggle round-trip dark→light→dark ✓, theme + DM Sans persist after reload (computed style checked) ✓; dark-mode golden flows: sample load → Make It Fit ≤1.0 MB → "Passed All Limits" 891 KB (-67%) pass ledger + download click ✓; Keep-pages thumbnail grid in dark ✓; mobile 390×844 light + dark stack cleanly with sticky footer ✓; zero console/page errors; dev.log clean.

Stage Summary:
- FixMyPDF now ships a first-class dark theme (navy brand, inverted CTAs) with a header toggle + system default, and the requested font system: DM Mono (technical voice) + DM Sans (body) + Jost (display headline). No engine/lib changes; all previous flows still browser-verified green in both themes.

---
Task ID: 8-a
Agent: general-purpose sub agent (image/asset generation)
Task: Brand icon + OG image generation and resizing

Work Log:
- Read worklog.md for brand context (navy #0b1329/#060c1b, orange #ea580c, emerald #059669, canvas #f8faff; no blue/indigo/purple). No app source code touched.
- Invoked image-generation skill; generated both artworks via `z-ai image` CLI (generation succeeded, no fallback needed):
  - App icon art (1024x1024): flat minimal orange drafting-compass X-cross mark with wrench joint on solid deep navy, generous padding, no text.
  - OG background art (1344x768 landscape): white PDF sheet on right clamped by orange brackets + crosshair, floating pages, emerald check badge, blueprint grid, empty dark left half reserved for overlay text.
- Saved raws to public/icons/icon-raw.png and public/icons/og-bg-raw.png. Note: the z-ai CLI emitted JPEG bytes despite .png names — normalized both raws to true PNG in place (same dims) with sharp before processing.
- Created scripts/build-brand-assets.mjs (sharp, run via `bun scripts/build-brand-assets.mjs`):
  - Icon ladder from icon-raw.png: icon-512.png (512), icon-192.png (192), apple-touch-icon.png (180), favicon-32.png (32) — all PNG, fit:"cover" guard.
  - OG: og-bg-raw.png cover-cropped to exactly 1200x630, composited with a hand-authored SVG text overlay rendered by sharp (crisp vector typography, NOT AI text), all per spec: "FixMyPDF" 88px/700/#fff at x=72 (baseline 272, cap-top ≈210), "Your PDF is wrong." 54px/600/#fff, "We&#39;ll fix it." 54px/700/#f97316 (apostrophe XML-escaped), "100% in your browser &#183; zero uploads" 30px/#94a3b8 with extra spacing. Saved to public/og-image.png.
  - Script self-verifies: re-reads every output via sharp metadata + fs stat, prints a table, exits non-zero on any format/dimension mismatch.
- Verification (all green): `file` confirms valid PNG magic on all outputs; sharp metadata table OK; pixel-sampled sanity checks confirmed the SVG overlay really rasterized (white headline px, orange "We'll fix it." px, slate tagline px) and icon palette is on-brand (orange mark px at center, deep-navy px at corner). Re-ran build after raw normalization — stable results.

Stage Summary:
- PWA icon set + OG image shipped: public/icons/icon-512.png (512x512, 257 KB), public/icons/icon-192.png (192x192, 34 KB), public/icons/apple-touch-icon.png (180x180, 29 KB), public/icons/favicon-32.png (32x32, 1.2 KB), public/og-image.png (1200x630, 489 KB), plus raws icon-raw.png (1024x1024) and og-bg-raw.png (1344x768). Reproducible pipeline in scripts/build-brand-assets.mjs. Next agent: wire these into layout.tsx metadata (icons + openGraph) and webmanifest — deliberately NOT done here per task scope.

---
Task ID: 8-b
Agent: general-purpose sub agent (i18n translation)
Task: Translate i18n dictionaries (hi/es/fr/de/pt/zh)

Work Log:
- Read worklog.md for project context and src/lib/i18n/dictionaries/en.ts (source of truth, 247 keys, `Dict` type). No files touched outside src/lib/i18n/dictionaries/.
- Created six locale dictionaries implementing `import type { Dict } from "./en"` with the MANDATORY `: Dict` annotation and en.ts key order preserved: hi.ts (Hindi), es.ts (Spanish/neutral LatAm tú), fr.ts (French/vous), de.ts (German/formal Sie), pt.ts (Brazilian Portuguese/você), zh.ts (Simplified Chinese/你).
- Translation conventions applied: all {n} {mb} {size} {pct} {kept} {total} {remaining} {name} {query} {pages} {matches} placeholders preserved verbatim; brand/technical terms kept untranslated (FixMyPDF, PDF, MB, KB, ZIP, WebAssembly, WASM, pdf-lib, pdf.js, EXIF, B&W, Workday, Visa, Pro, Policy Schedule sample phrase); curly quotes “ ” everywhere incl. zh; ★/•/·/→/≤/—/…/600×600 glyphs and numbers kept; mode names cross-referenced consistently inside copy (e.g. find_scanned points to the translated "Remove Blank Pages"/"Make It Fit" names).
- Wrote temp scripts/check-i18n.ts (key-sort parity + per-key {placeholder} parity against en) and ran `bun scripts/check-i18n.ts`; deleted the temp script afterwards.
- Fixed one self-introduced syntax slip in zh.ts (missing comma after hero_title_2 while converting headline to Chinese 。 punctuation).

Stage Summary:
- Six dictionaries created: src/lib/i18n/dictionaries/{hi,es,fr,de,pt,zh}.ts — each 247/247 keys, placeholders verified identical to en.
- Verification: `bunx tsc --noEmit 2>&1 | grep "src/lib/i18n"` → zero output (clean); parity script printed KEY PARITY OK + PLACEHOLDER PARITY OK for all 6 locales; English-only leftovers limited to brand terms (spot-scanned).
- Notes for the UI agent: zh uses “ ” quotes too; fr/de keep “ ” per spec (not « »/„ “); "Policy Schedule" in find_placeholder intentionally untranslated so the bundled sample doc search reproduces; result_pages_out is a trailing fragment like en.

---
Task ID: 7-9 (main batch)
Agent: main orchestrator (Z.ai Code)
Task: Ship all remaining market-standard enhancements that fit the zero-backend / zero-database / zero-storage constraint

Work Log:
- Assessed prior state via worklog.md: engine + 6 modes + dark mode + fonts already shipped and E2E-verified. Filtered the 58-item enhancement list to client-only items and built the rest.
- Task 8-a (subagent, general-purpose): generated brand assets via image-generation skill + sharp pipeline → public/icons/{icon-512,icon-192,apple-touch-icon,favicon-32}.png + public/og-image.png (1200x630, crisp SVG text overlay). Visually verified both.
- Task 8-b (subagent, general-purpose): translated the UI dictionary to hi/es/fr/de/pt/zh with key+placeholder parity checks (247/247 keys each, tsc clean).
- i18n system: src/lib/i18n/{config.ts,context.tsx,dictionaries/en.ts + 6 locales}. Locales are code-split dynamic imports; EN inlined as fallback; locale persisted in localStorage; <html lang> synced; hydration-stable (EN first paint, adopt after mount via rAF). LanguageSwitcher (shadcn Select) in header.
- Wired t() into ALL fixmypdf components (header, hero, upload-zone, file-bar, workspace, result-panel, 6 modes, secondary-cards, how-it-works, privacy-ribbon, footer).
- New sections: FAQ (accordion, 8 Qs) + Pricing (Free live vs Pro $4 coming-soon, one-time positioning, mailto waitlist) + LegalDialogs (Privacy Policy + Terms, zero-collection content, Radix Dialog) + FAQ data shared with JSON-LD.
- SEO: metadataBase + canonical + local favicon/apple icons + manifest link + OG/Twitter images + viewport themeColor; JSON-LD (WebApplication, HowTo, FAQPage) server-rendered in page.tsx; public/sitemap.xml added (robots.txt existed).
- PWA: public/manifest.webmanifest (icons any+maskable, standalone, brand colors) + public/sw.js (precache shell, cache-first immutable assets incl. pdfjs cmaps/worker, network-first navigations, versioned cache, never touches cross-origin) + PwaRegister (production-only).
- Zero-upload proof: live cross-origin request counter (Resource Timing diff per fix) shown in privacy ribbon — "0 external cross-origin requests while fixing" with green pulse; turns amber if any external request ever appears.
- Delight/polish: SuccessBurst confetti (framer-motion, honors useReducedMotion, auto-unmount); keyboard shortcuts (Enter → primary CTA via data-primary-cta, Esc → reset; guards for dialogs/textarea/native buttons; find-mode single-flight lock); auto-download preference (persisted, runs once per successful result); device-local fix counter in footer with singular/plural in all 7 locales; AppErrorBoundary wrapping the app from page.tsx.
- Keep-mode quick-select row: All/Clear/Odd/Even/Every-2nd/Every-3rd; remove-mode gained Every-Nth chips.
- Lint compliance for Next 16 react-hooks/set-state-in-effect: rAF-deferred post-mount reads, promise-callback dict loading, render-time derived state for confetti.
- Deferred (documented, with reasons): batch multi-file queue (architectural change to single-file state model) and before/after page-level visual diff (extra engine render pass per result).

Stage Summary:
- Verification (Agent Browser E2E, all green): full render light+dark; sample load → Make It Fit ≤1.0MB → "Passed All Limits" 891KB (-67%) with honest pass ledger; download → footer counter + "0 external requests" proof; locale switch EN↔HI (html lang updates, persists across reload); dark mode round trip; FAQ accordion opens; privacy/terms dialog + Escape close; mobile 390x844 no h-scroll, footer natural; Enter/Esc shortcuts; manifest/sw/og/sitemap all 200; zero console/page errors; bun run lint + bunx tsc clean.

---
Task ID: 10-h
Agent: general-purpose sub agent (presets + sw)
Task: Custom device-local target presets in fit-mode + sw.js OCR asset caching
Work Log:
- Read worklog.md, fit-mode.tsx, en.ts (+ config.ts/context.tsx for the Dict type + rAF hydration pattern), and public/sw.js before editing.
- sw.js (Task 2): added "/tesseract/" and "/tessdata/" to CACHE_FIRST_PREFIXES — the existing fetch handler already gates on same-origin GET, so they now get the identical cache-first treatment as the pdfjs assets; bumped VERSION "fixmypdf-v1" → "fixmypdf-v2" so installed clients re-install and prune old caches. Network-first navigations and everything else untouched (verified by re-read).
- i18n: added `fit_save_target` ("Save target") and `fit_saved_toast` ("Saved {mb} MB to this device") immediately after `fit_cta` in en.ts and at the identical position in hi/es/fr/de/pt/zh — {mb} placeholder preserved verbatim everywhere, MB kept untranslated per dictionary conventions, key order stable, all files keep the `: Dict` annotation (en now 250 keys, full parity in all locales).
- fit-mode.tsx: device-local custom presets under localStorage key "fixmypdf:custom-presets" (JSON array of MB numbers, max 5, sorted ascending, deduped, 0.1 MB precision, validated 0.1..100; try/catch-safe read/write helpers). Loaded into state inside a requestAnimationFrame callback after first paint (never read during render) — same hydration-stable pattern as the app-level prefs in app.tsx.
- fit-mode.tsx UI: small outline size="sm" Button with Star icon labeled via `fit_save_target` next to the MB input; clicking stores the current value as a preset — dedupe (already present → do nothing, no toast), cap at 5 with oldest dropped (state keeps save order; storage always written sorted), sonner success toast `t("fit_saved_toast", { mb: value.toFixed(1) })`. Custom presets render as extra chips appended to the presets row, styled exactly like the built-ins (border-border / selected border-orange-500 bg-orange-500/10, token-based → dark-mode safe) with a small orange Star subtitle line and an X button (aria-label "Remove preset X.X MB") that deletes from state + localStorage; chips always display ascending. Disabled save when input invalid.
- Wrote TEMP scripts/check-i18n-parity.ts (asserts both new keys exist in all 6 locales with identical {mb} placeholder sets + full key parity vs en), ran `bun scripts/check-i18n-parity.ts` → "i18n parity OK … en has 250 keys, all locales in parity", then DELETED the script.
- Verification: `bunx tsc --noEmit 2>&1 | grep -E "(fit-mode|i18n)"` → empty; `bun run lint 2>&1 | grep -E "(fit-mode|i18n|sw\.js)"` → no matches (the single repo warning is pre-existing in tools/dialog.tsx, owned by the concurrent tools task — not this task's files). dev.log tail: the only compile errors are pre-existing Module-not-found for in-progress ./secure-tools / ./repair-tools / ./smart-tools imports in src/components/fixmypdf/tools/tools-registry.ts (another agent's in-flight workstream; error traces never mention fit-mode/i18n/sw.js and were present in dev.log before this task's first request) — zero new compile errors from this change set.

Stage Summary:
- Make-It-Fit now supports up to 5 device-local custom MB target presets: save via "Save target", remove via chip X, persisted across reloads in localStorage "fixmypdf:custom-presets" only (no backend/db), hydration-stable loading, dark-mode-safe chips, and i18n shipped in all 7 dictionaries with verified {mb} placeholder parity. sw.js bumped to v2 with cache-first handling of the OCR tool's /tesseract/* and /tessdata/* assets, matching the pdfjs asset strategy for offline repeat visits.

---
Task ID: 10-f
Agent: general-purpose sub agent (annotate tools)
Task: Tool Shed annotate group — fill-forms, sign, page-numbers, watermark, header-footer
Work Log:
- Read worklog.md + contracts (tools/types.ts, tools/kit.ts, format.ts, engine.ts) and the Tool Shed shell (parts.tsx, dialog.tsx, tools-registry.ts, tools-section.tsx); registry already imports ./annotate-tools.
- Built src/lib/pdf/tools/annotate.ts — 5 pure pdf-lib engines: fillForm (per-field try/catch, skipped-names collected, optional flatten wrapped so a flatten failure still returns the filled file with a meta note), stampSignature (embedPng + anchor math with 4% x-margin / offsetPct y-offset), addPageNumbers (Helvetica rgb(0.35,0.39,0.48), widthOfTextAtSize centering, skip-first doesn't shift the sequence), addWatermark (text: rotated-centre via rotated-bbox midpoint, diagonal tiling grid every ~pageW/3 with alternating half-step offsets; image: PNG/JPEG magic-byte sniff, center or 4-corner stamps, true drawText/drawImage opacity), addHeaderFooter (6 slots, 24pt margins, shrink-to-fit loop 0.5pt steps down to 6pt then ellipsis truncation). All engines: assertNotEncrypted after loadPdf, ctx.progress per page/step, throwIfAborted in loops, deterministic baseName outputs (-filled/-signed/-numbered/-watermarked/-headfoot).
- Built src/components/fixmypdf/tools/annotate-tools.tsx exporting ANNOTATE_TOOLS (5 ToolDefs, category "annotate", batchRun only for page-numbers "1 / N" bottom-center start 1 and watermark CONFIDENTIAL defaults): fill-forms loads fields inline (run-token/alive-guarded async, setState only after await per Next 16 set-state-in-effect; panel remounts per file via key) with per-type controls (Input/Textarea/Switch/Select over getOptions) in a max-h-96 slim-scrollbar list, zero-fields amber note + hidden run, flatten Switch default ON; sign has draw|type Tabs (canvas pad 520×160, pointer capture, stroke #111827 2.5px round, Clear button, transparent-PNG export; typed preview via Segoe Script/Bradley Hand cursive canvas with auto-shrink) + page/anchor/width%/offset% controls; page-numbers, watermark (RadioGroup text|image + ToolNote), header-footer (3+3 slot grid, size Select, "24pt margins · Helvetica" hint, run disabled until any line).
- Verified pdf-lib 1.17.1 field/draw APIs and lucide 0.525 icons (Signature/Stamp/PenLine/Hash/PanelTop all present) before writing.
- Verification: bunx tsc --noEmit filtered to the two files → zero output; bun run lint filtered "annotate" → zero output (removed an unused eslint-disable img-element directive after the config turned that rule off); temp smoke script (deleted after run) exercised all engines against a generated 3-field-form PDF — 6/6 fields set + values round-tripped, flatten → 0 fields, bogus radio option → skipped, page numbers (formats/skip-first/start 5), tiled+single+image watermarks, signature on page 2, friendly errors for page-99 OOB / empty header-footer / formless PDF, AbortSignal → AbortError; fixed duplicate opacity in watermark meta; palette check → no blue/indigo/purple.
Stage Summary:
- Annotate group shipped: fill-forms, sign, page-numbers, watermark, header-footer — engines in src/lib/pdf/tools/annotate.ts, UI in src/components/fixmypdf/tools/annotate-tools.tsx (ANNOTATE_TOOLS), 100% client-side, honest progress/abort/friendly errors, deterministic output names, tsc + lint clean on both files. No other files touched (worklog append excepted).

---
Task ID: 10-a
Agent: general-purpose sub agent (organize tools)
Task: Tool Shed organize group — merge, split, rotate, reorder, reverse, insert-blank, duplicate
Work Log:
- Read worklog.md + contracts (types.ts, kit.ts, format.ts, engine.ts) + shared parts (ToolStep/ToolHint/ToolNote) + ToolDialog to nail the Component contract (controls + run button only; dialog owns progress/results) and the existing slate/orange/dark-mode class language.
- Created `src/lib/pdf/tools/organize.ts` — pure pdf-lib surgery engine, no pdfjs import anywhere: mergePdfs (copyPages all pages per file → {first}-merged.pdf), parseGroups (comma tokens, each via parsePageSpec, per-group friendly errors) + chunkEveryN, splitPdf (fresh doc per group → {base}-pages-1-3.pdf, single-page mode pads {base}-page-001.pdf), rotatePages ((existing+angle)%360 via setRotation(degrees(...)), stacks with prior rotation), reorderPdfPages (copyPages in new 0-based order, isPermutation guard), reversePdfPages (last→first), insertBlankPage (size cloned from page 1 via getPage(0).getSize(), out.insertPage(idx,[w,h]) for start/end/after-page), duplicatePdfPages (repeated indices accepted: each selected page repeated `times` right after the original). All fns: ctx.progress + throwIfAborted in loops, `doc.isEncrypted` → exact friendly "Unlock it first (Protect & Clean → Remove password)" error, 0-page guards, exported ENCRYPTED_PDF_MESSAGE + isPermutation for the UI. Batch runs wired: rotate=90° all, reverse=same, insert-blank=at end.
- Created `src/components/fixmypdf/tools/organize-tools.tsx` ("use client", exports ORGANIZE_TOOLS with the 7 exact ids/names/taglines/icons, category "organize"):
  - merge: numbered file list with ↑/↓ per row + "Sort by name" (localeCompare numeric); order kept as index permutation validated by isPermutation so add/remove safely falls back to drop order (no setState-in-effect).
  - split: RadioGroup ranges/every-n/single; ranges input validated live via parseGroups against probed page count, every-n input 1..500, emerald "This will create N PDFs" preview; run builder resolves page count (probe reuse or loadPdf) then engine splitPdf with singlePageNames for per-page mode.
  - rotate: angle Select (90 default/180/270) + pages Input (blank=all) with live parsePageSpec validation; engine stacks rotation.
  - reorder: on file change analyzeDocument(files[0]) with a run-token ref + cleanup invalidation ("Rendering previews… x%" inline row, no setState after unmount/switch); dnd-kit grid (DndContext closestCenter + PointerSensor distance 6, SortableContext rectSortingStrategy, useSortable + CSS.Transform.toString, 96px thumbs, orange 1-based badge, GripVertical hint, touch-manipulation), Reverse order / Reset order buttons; ≤1 page → amber "Nothing to reorder — this PDF has a single page." + disabled run; engine rebuild via copyPages(display).
  - reverse: control-free, "Reverse page order" run button, single-page amber note via probe.
  - insert-blank: position Select start/end(default)/after-page + N input (1..pageCount-1, live guards incl. single-page case), hint that the blank matches page-1 size; engine inserts at computed index.
  - duplicate: pages Input (blank = every page) + times 1..10 default 1, live "Output will have N pages" emerald note; engine builds the repeat-order array.
  - Shared local helpers: usePdfProbe (keyed by name:size:lastModified → pages + encrypted amber warnings, async-callback-only setState for the Next 16 set-state-in-effect rule), resolvePageCount, ProbeRow, RunButton (w-full, disabled={busy}, imperative labels).
- Verification: `bunx tsc --noEmit | grep organize` → empty (only pre-existing errors elsewhere: __repair-smoke, examples/, tools-registry missing the OTHER group files convert/optimize/secure/smart/repair/annotate — not this task's scope); `bun run lint | grep organize` → clean. Engine behavior proven with a throwaway bun+pdf-lib harness (deleted after): 31/31 checks — parseGroups/chunkEveryN/isPermutation edge cases, merge page counts, split names+contents, rotation math incl. stacking, reorder/reverse verified by per-page width fingerprints, blank size cloning at start/after/end, duplicate layouts (selected ×2 and all ×1).
Stage Summary:
- Organize group shipped: 7 tools (merge, split, rotate, reorder, reverse, insert-blank, duplicate) in exactly two new files — src/lib/pdf/tools/organize.ts (typed, friendly-error engine, abort+progress aware, zero pdfjs/network) and src/components/fixmypdf/tools/organize-tools.tsx (contract-compliant controls + run buttons only). 100% client-side, brand-compliant (orange/emerald/amber, semantic tokens + dark: variants), no blue/indigo/purple. Tools-registry already picks ORGANIZE_TOOLS up; remaining group files belong to sibling tasks.
---
Task ID: 10-e
Agent: general-purpose sub agent (repair tools)
Task: Tool Shed repair group — fix-corrupted, remove-duplicates, deskew, scan-cleanup, split-scans
Work Log:
- Read worklog.md, contracts (tools/types.ts, tools/kit.ts), format.ts, engine.ts + existing Tool Shed shell (parts.tsx, dialog.tsx, tools-registry.ts) to match conventions before writing anything.
- Created src/lib/pdf/tools/repair.ts (pure TS, no React, no static pdfjs): 5 engines over kit primitives only (fileBytes, loadPdf, savePdf, renderPages, canvasesToPdfBytes, pdfOutput, throwIfAborted) + baseName/formatBytes:
  - fixCorrupted: tolerant PDFDocument.load({ignoreEncryption, throwOnInvalidObject:false, updateMetadata:false}) → save({useObjectStreams:false}) for a plain-xref max-compat rebuild; page count verified by re-loading the output ("N pages recovered · size"); load/save/verify failures all throw the honest "Too damaged for in-browser structural repair…" message.
  - dedupePages: renderPages dpi 40 grayscale → 8×8 average-hash (grayscale mean → 64 bits) + ink ratio per canvas; similar = Hamming ≤ 3, exact = distance 0 AND same canvas dims; keeps first occurrence, rebuilds kept indices via pdf-lib copyPages (kept pages stay vector); meta "Removed k duplicate pages · x of n kept".
  - deskewPdf: per page downscale ≤400px → binarize (<200 lum) → for −8..8° step 0.5 score horizontal-projection variance (y' = y + x·tan a, Σ count², max = straightest); |angle| < 0.3° skipped; rotation in-place onto white rotated bounding box; rebuild dpi 100; progress "Page i of n · tilt a°".
  - scanCleanup: renderPages dpi 150 with contrast/brightness/grayscale CSS filter → snapWhites pass over Uint8ClampedArray (r,g,b ≥ threshold → 255) with putImageData → rebuild quality 0.8.
  - splitDoubleScans: renderPages dpi 150 → cut x = w/2 + offset, inner-edge margin trim each half, interleave halves per order radio → canvasesToPdfBytes dpi 150 (page pt = px×72/150); meta "2N pages from N".
  - All engines: friendly Errors ("This PDF has no pages.", honest password message after loadPdf + doc.isEncrypted check), per-page ctx.progress, throwIfAborted in every loop, deterministic {base}-fixed/-deduped/-deskewed/-clean/-split.pdf names.
- Created src/components/fixmypdf/tools/repair-tools.tsx ("use client", exports REPAIR_TOOLS: ToolDef[]): Wrench/CopyX/AlignVerticalJustifyCenter/Sparkles/Columns2 icons; shared local ChoiceOption (label+RadioGroupItem, orange selected state) and SliderRow (Label+readout+Slider) primitives; ToolStep/ToolHint/ToolNote per spec incl. exact amber/emerald notes; controls-only components with single w-full run Button (disabled={busy}), split-scans io.multiple:false (no batch), other four expose batchRun with defaults (similar / auto / cleanup defaults).
- Verified math standalone in bun: projection-variance estimator recovers correction = −content tilt for ±3.5/±5/±8/0.5° synthetic line sets (sign convention consistent with ctx.rotate in rotateCanvasInPlace); Hamming sanity 0/3.
- Full browser E2E of the engines via a temporary esbuild-bundled harness served from public/ (deleted after): synthetic PDFs built with pdf-lib in-browser; 9/9 PASS — fix-corrupted valid rebuild (3 pages recovered · 2.3 KB), truncated file → honest "Too damaged…" throw, dedupe similar+exact both remove the identical pair (output 2/3 pages), deskew auto straightens a −4° scan ("1 pages · 1 straightened"), manual 0 skips, scan-cleanup 3 pages cleaned, split left/right-first + offset/margin → 2 pages from 1 each.
- Verification: `bunx tsc --noEmit | grep "src/(lib/pdf/tools/repair|components/fixmypdf/tools/repair-tools)"` → empty; `bun run lint | grep -i repair` → clean (overall 0 errors; the 1 pre-existing warning is in dialog.tsx, untouched); no blue/indigo/purple, no `any`, no console.* in my files.
- Ops note: the shared dev server was OOM-killed by the kernel (global-oom on next-server ~1.9GB RSS) while agent-browser + esbuild ran concurrently; restarted it via `bun run dev` (persistence re-checked). Root "/" currently 500s on module-not-found for the six sibling tool-group files (organize/convert/optimize/secure/annotate/smart) that tools-registry.ts imports — pre-existing parallel-build state, NOT caused by this task; the REPAIR_TOOLS import resolves and my files compile clean.
Stage Summary:
- Repair group shipped: 2 files (src/lib/pdf/tools/repair.ts engines + src/components/fixmypdf/tools/repair-tools.tsx UI exporting REPAIR_TOOLS) implementing all 5 tools with progress, cancellation, honest errors, deterministic output names, and batchRun where specified. All engines browser-verified end-to-end with synthetic PDFs (9/9 smoke checks) plus standalone math validation of the deskew estimator; tsc/lint green for both files. Next agent: nothing pending on the repair group; the 500 on / blocks on the other Tool Shed group files landing.

---
Task ID: 10-b
Agent: general-purpose sub agent (convert tools)
Task: Tool Shed convert group — pdf-to-images, images-to-pdf, grayscale, n-up, booklet
Work Log:
- Read worklog.md + contracts (types.ts, kit.ts, format.ts) and the existing Tool Shed shell (dialog.tsx, parts.tsx, tools-registry.ts) to match the component contract (controls + run button only; dialog owns progress/cancel/results).
- Created src/lib/pdf/tools/convert.ts — pure-TS engine, pdf-lib only, pdf.js reached exclusively through kit's lazy loader, heic2any only as dynamic import `(await import("heic2any")).default`:
  - pdfToImages: pdf-lib page-count guard ("This PDF has no pages."), parsePageSpec for the optional page input (blank = all), kit renderPages (dpi/pages/signal/onProgress), then a local canvasToBlobBytes helper (canvas.toBlob, quality only for JPEG) → per-page blobOutput `{base}-page-001.jpg/png` with "page N · W×H px" meta; friendly render/encode error mapping (password-protected detection included).
  - imagesToPdf: jpeg/png → direct embedJpg/embedPng with graceful fall-through to canvas decode (CMYK/exotic), HEIC/HEIF (type or extension) → dynamic heic2any → PNG blob, everything else → createImageBitmap with <img>-element fallback → PNG; page sizing auto (1px=1pt) or a4/letter with per-image orientation + 24pt fit & center; friendly per-file decode error; output images-to-fixmypdf.pdf.
  - grayscalePdf: rasterizePdfBytes(bytes, {dpi:150, filter:"grayscale(1)"}, {dpi:150, quality}) with page-count guard + progress; `{base}-grayscale.pdf`.
  - nUpPdf + bookletPdf share tile helpers (fitTile aspect-fit/center, drawTile = drawPage + 0.5pt border rgb(0.8,0.8,0.85), 18pt margins + 8pt gutter): 2-up landscape / 4-up portrait sheets (A4 595.28×841.89, Letter 612×792), trailing empty cells skipped; booklet pads to a multiple of 4 with blank cells using the canonical fold order [padded-2s, 2s+1, 2s+2, padded-2s-1]; embedding errors at save mapped to friendly messages (pdf-lib resolves embedded pages lazily at save).
  - Every loop honours throwIfAborted(ctx.signal) and reports ctx.progress per page/image/sheet.
- Created src/components/fixmypdf/tools/convert-tools.tsx — "use client", exports CONVERT_TOOLS: ToolDef[] (5 tools, category "convert", icons Image/ImageIcon, Images, Contrast, Grid2X2, BookOpen, exact io specs incl. images-to-pdf accept ".jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,image/*", multiple, maxFiles 100, hint). Controls built from shadcn RadioGroup/Select/Slider/Input + ToolStep/ToolHint/ToolNote (amber note on grayscale, booklet double-sided note); images-to-pdf has an ↑/↓ reorder list derived render-time from files (no setState-in-effect); run buttons are w-full, disabled={busy}, imperative labels (e.g. "Export PDF as JPG", "Build PDF from N images", "Lay out as 2-up", "Build booklet PDF").
- Verified with headless bun smoke tests (pdf-lib-only paths): n-up/booklet sheet counts + exact page geometry, JPEG/PNG fallback + friendly decode error, invalid-PDF and zero-page friendly errors, plus a byte-level imposition-order proof (inflated each sheet's content stream + form XObjects): booklet 8p → [8|1],[2|7],[6|3],[4|5], 6p padding blanks correct, n-up 2-up/4-up reading order exact. All passed; temp scripts deleted.
- bunx tsc --noEmit filtered to my two files → zero errors; bun run lint → zero mentions of convert files (only pre-existing warning in dialog.tsx). Dev-server 500 on / is from other agents' not-yet-created tool group files (./organize-tools, ./smart-tools, …) imported by tools-registry.ts — convert.ts and convert-tools.tsx resolve fine.
- Note for next agent: fflate 0.8.3 inflateSync fails under Bun (env quirk, zlib data inflates fine with node:zlib); browser runtime unaffected, kit zipOutputs is compression-direction only.
Stage Summary:
- Convert group shipped: PDF to Images (JPG/PNG, quality 50–95, DPI 96–300, optional page spec → per-page images), Images to PDF (JPG/PNG/WebP/GIF/BMP/HEIC with reorder + auto/A4/Letter sizing → single tidy PDF), PDF to Grayscale (3 quality presets), N-up Layout (2-up/4-up on A4/Letter with hairline tile borders) and Booklet Imposition (verified saddle-stitch order, blank-cell padding, double-sided printing note). 100% client-side, abortable, progress-reporting, deterministic naming, friendly errors; tsc + lint clean for both files.

---
Task ID: 10-c
Agent: general-purpose sub agent (optimize tools; worklog backfilled by orchestrator after deadline)
Task: Tool Shed optimize group — resize-pages, crop-margins, scale-pages, dpi-fixer, quality-reducer

Work Log:
- Created src/lib/pdf/tools/optimize.ts + src/components/fixmypdf/tools/optimize-tools.tsx (5 tools, category "optimize").
- batchRun provided for resize (A4 auto), crop (auto, 12pt), dpi-fixer (300), quality-reducer (q60); scale-pages interactive only.
- Vector-preserving A4/Letter re-layout via embedPage; auto crop via low-DPI whitespace bounding boxes; pixel-size rebuild with contain/cover.

Stage Summary:
- Files verified by orchestrator: tsc clean, exports present, contract-conformant. Logged post-hoc because the agent hit the context deadline after writing files.

---
Task ID: 10-d
Agent: general-purpose sub agent (secure tools; worklog backfilled by orchestrator after deadline)
Task: Tool Shed secure group — protect, unprotect, redact, flatten, sanitize, metadata editor

Work Log:
- Created src/lib/pdf/tools/secure.ts + src/components/fixmypdf/tools/secure-tools.tsx (6 tools, category "secure").
- Encryption via @cantoo/pdf-lib dynamic import (AES-256), verified against its typings; plain save() yields unencrypted output for unprotect.
- Redact = term-bbox burn-in on affected pages (rasterized) + structural copy of clean pages; sanitize = structural rebuild dropping JS/attachments/annots/metadata.

Stage Summary:
- Files verified by orchestrator: tsc clean, exports present, contract-conformant. Logged post-hoc after context deadline.

---
Task ID: 10-g
Agent: general-purpose sub agent (smart tools; worklog backfilled by orchestrator after deadline)
Task: Tool Shed smart group — extract-text, extract-images, why-big, visual-diff, ocr, auto-prescribe

Work Log:
- Created src/lib/pdf/tools/smart.ts + src/components/fixmypdf/tools/smart-tools.tsx (6 tools, category "smart").
- OCR fully self-hosted: tesseract.js v7 worker/core from /tesseract/, eng model from /tessdata/ (cacheMethod none); no external requests.
- why-big + auto-prescribe render in-component reports and dispatch fixmypdf:open-tool / target:workspace events consumed by tools-section.

Stage Summary:
- Files verified by orchestrator: tsc clean, exports present, contract-conformant. Logged post-hoc after context deadline.

---
Task ID: 10-main
Agent: main orchestrator (Z.ai Code)
Task: Add all 49 no-database / no-store features — "Tool Shed" (39 new tools) + workflow features

Work Log:
- Foundation: src/lib/pdf/tools/types.ts (ToolDef/RunCtx/ToolOutput contracts) + kit.ts (shared engine kit: renderPages/renderOnePage with gray+adjust pixel ops, rasterizePdfBytes, zipOutputs via fflate, extractTextPerPage, loadPdf/savePdf).
- Shell: dialog.tsx (stages pick/run/done, progress+Cancel, per-output Get + ZIP-all, before/after first-page preview, batch runner, memory-cleared note), parts.tsx (ToolFiles dropzone with drag+click+Ctrl+V paste, ToolStep/ToolHint/ToolNote), tools-section.tsx (search + 7 category chips + 39-card grid + fixmypdf:open-tool event listener), tools-registry.ts, app.tsx + header "All tools" link.
- Parallel subagents built 7 engine+component groups (39 tools): organize(7), convert(5), optimize(5), secure(6 incl. @cantoo/pdf-lib AES-256 protect/unprotect + term-bbox redact), repair(5), annotate(5 incl. signature pad), smart(6 incl. offline OCR + why-big + auto-prescribe). 10-h added device-local custom target presets (fit-mode, i18n ×7, sw.js v2 caches /tesseract/ + /tessdata/).
- Assets: tesseract.js worker+cores copied to public/tesseract/, eng.traineddata.gz (tessdata_fast) to public/tessdata/ — OCR makes ZERO external requests.
- E2E bugs found & fixed by orchestrator: (1) tool-switch inherited previous tool's files/results → render-time derived-state reset; (2) ctx.filter silently ignored by pdf.js v6 (grayscale/scan-cleanup/OCR-preprocess AND pre-existing makeItFit grayscale) → replaced with applyCanvasPixelOps bitmap rewrites across kit + engine + 5 tool engines; (3) batch mode unreachable for single-file tools → effectiveIo grants multiple when batchRun exists, >1 files auto-switches to batch panel.

Stage Summary:
- Browser-verified E2E: merge 2→8pp byte-validated; split every-2→3 PDFs+ZIP validated; AES-256 protect (fails w/o pw, opens with) + unprotect roundtrip incl. wrong-pw error; grayscale byte-verified (7301 gray px / 0 colored); fill-forms fields→flattened, "Ada Lovelace" extractable; OCR page → 44 B text, 0 external requests; why-big breakdown; batch 2 files→2 outputs+ZIP; cancel mid-OCR; custom preset 3.7 MB persists across reload; dark + 390px mobile clean (no h-scroll); flagship Make It Fit re-verified post-edit (891 KB, -67%, Passed All Limits). tsc+lint clean. Known non-blockers: pre-existing dev-only Radix useId hydration warning; headless-automation can't save .txt downloads (identical code path delivers PDFs/ZIPs).
