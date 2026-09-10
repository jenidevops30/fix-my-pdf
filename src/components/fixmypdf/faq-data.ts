/**
 * English FAQ content — shared between the visible FAQ section (i18n keys)
 * and the server-rendered JSON-LD FAQPage schema in page.tsx.
 * Keep in sync with faq_1..faq_8 in src/lib/i18n/dictionaries/en.ts.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is my file really never uploaded?",
    answer:
      "Yes, really. The engine is WebAssembly running inside this tab — your file is read into memory, fixed, and handed straight back. Watch the live request counter in the privacy ribbon during a fix: it stays at zero external requests. You can even go offline after the page loads and keep working.",
  },
  {
    question: "Why is it free?",
    answer:
      "Because fixing happens on your device, we pay for no servers, no storage and no bandwidth. A paid Pro tier may arrive later for heavy batch jobs — but the core fixes stay free.",
  },
  {
    question: "Will my text stay selectable after compression?",
    answer:
      "Usually yes. The engine always tries the metadata pass first, which keeps every byte of text intact. Only if the file is still over the limit does it re-render pages as sharp images — the PDF looks the same, but the text becomes part of the picture.",
  },
  {
    question: "How small can you make my PDF?",
    answer:
      "It depends on what is inside. Scanned documents routinely shrink 60–90%. If the target is impossible without destroying readability, the engine stops at the safest size and tells you honestly instead of shipping a blurry mess.",
  },
  {
    question: "How is this different from online converters?",
    answer:
      "Upload-based tools copy your file to their servers first — wait times, size quotas, retention policies. FixMyPDF has none of that: no queue, no account, no server that could leak or keep your document.",
  },
  {
    question: "Does it work on my phone?",
    answer:
      "Yes — it runs in any modern mobile browser. Very large files (hundreds of MB) are smoother on desktop simply because phones have less memory.",
  },
  {
    question: "Do you use cookies or trackers?",
    answer:
      "No analytics, no ad pixels, no fingerprinting. The app stores exactly three things locally on your device: your theme, your language, and how many files you have fixed.",
  },
  {
    question: "What rules can “The website says…” understand?",
    answer:
      "Paste the portal’s instructions as-is. It reliably picks out size limits like “under 2 MB”, page caps like “maximum 10 pages”, file formats like PDF or JPG, and pixel dimensions like 600×600.",
  },
];

/** HowTo steps for JSON-LD — mirror how-it-works.tsx. */
export const HOW_TO_STEPS = [
  {
    name: "Upload",
    text: "Your file is opened in your own browser. Zero bytes are sent anywhere.",
  },
  {
    name: "Describe the fix",
    text: "A size limit, the pages you keep, or the portal's pasted rules.",
  },
  {
    name: "Download",
    text: "Every result is verified against the requirement before you get it.",
  },
];
