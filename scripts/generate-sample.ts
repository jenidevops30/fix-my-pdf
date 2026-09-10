/**
 * One-off generator for the FixMyPDF demo document (public/samples/fixmypdf-demo.pdf).
 * Produces a "scanned" 12-page PDF (~several MB) that exercises every tool:
 *  - big enough that "Make It Fit" has real work to do
 *  - blank pages 7 and 12 for blank removal
 *  - real text layer (incl. "Policy Schedule") for Find & Extract
 * Run: bun scripts/generate-sample.ts
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 612;
const H = 792; // US Letter in points
const IMG_W = 1360;
const IMG_H = 1760;

async function scannedPageJpeg(): Promise<Uint8Array> {
  const { data, info } = await sharp({
    create: {
      width: IMG_W,
      height: IMG_H,
      channels: 3,
      noise: { type: "gaussian", mean: 236, sigma: 13 },
      background: { r: 236, g: 236, b: 236 },
    },
  })
    .jpeg({ quality: 70 })
    .toBuffer({ resolveWithObject: true });
  return new Uint8Array(data.buffer, data.byteOffset, info.size);
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur += " " + w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

const BODY =
  "This demonstration document emulates a scanned application package. " +
  "Portals that receive these files usually impose hard limits, such as five " +
  "megabytes per upload and no more than ten pages per attachment. " +
  "FixMyPDF reads the requirement and produces exactly the file the portal will accept. " +
  "The raster background you see behind this text mimics scanner noise so that " +
  "compression passes behave realistically. ";

const pagesSpec: Array<{ heading: string; body?: string } | "blank"> = [
  { heading: "FixMyPDF Demo Document", body: "Cover sheet for the sample application package." },
  { heading: "Section 1 · Applicant Details", body: BODY },
  { heading: "Section 2 · Academic History", body: BODY + BODY },
  { heading: "Section 3 · Financial Aid Forms", body: BODY + BODY },
  { heading: "Section 4 · Policy Schedule", body: "The Policy Schedule begins here. Coverage tables follow on later sheets. " + BODY },
  { heading: "Section 5 · Declarations", body: BODY },
  "blank",
  { heading: "Section 6 · Supporting Letters", body: BODY + BODY },
  { heading: "Section 7 · Policy Schedule (continued)", body: "Policy Schedule continuation: exclusions and riders. " + BODY },
  { heading: "Section 8 · Signatures", body: BODY },
  { heading: "Section 9 · Checklists", body: BODY },
  "blank",
];

async function main() {
  mkdirSync("public/samples", { recursive: true });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const spec of pagesSpec) {
    const page = doc.addPage([W, H]);
    if (spec === "blank") continue;
    const jpeg = await scannedPageJpeg();
    const img = await doc.embedJpg(jpeg);
    page.drawImage(img, { x: 0, y: 0, width: W, height: H });

    let y = H - 96;
    page.drawText(spec.heading, {
      x: 64,
      y,
      size: 17,
      font: bold,
      color: rgb(0.12, 0.13, 0.16),
    });
    y -= 34;
    const lines = wrap(spec.body ?? "", 88);
    for (const line of lines) {
      if (y < 64) break;
      page.drawText(line, {
        x: 64,
        y,
        size: 10.5,
        font,
        color: rgb(0.22, 0.24, 0.28),
      });
      y -= 17;
    }
  }

  doc.setTitle("FixMyPDF Demo Application Package");
  doc.setProducer("FixMyPDF sample generator");
  const bytes = await doc.save();
  writeFileSync("public/samples/fixmypdf-demo.pdf", bytes);
  console.log(`Wrote public/samples/fixmypdf-demo.pdf (${(bytes.length / 1024 / 1024).toFixed(2)} MB, ${doc.getPageCount()} pages)`);
}

await main();
