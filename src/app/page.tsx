import { FixMyPdfApp } from "@/components/fixmypdf/app";
import { AppErrorBoundary } from "@/components/fixmypdf/app-error-boundary";
import { FAQ_ITEMS, HOW_TO_STEPS } from "@/components/fixmypdf/faq-data";

const APP_URL = "https://fixmypdf.app";

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "FixMyPDF",
  url: APP_URL,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any (runs in the browser)",
  browserRequirements: "Requires a modern browser with WebAssembly support",
  description:
    "Fix PDFs entirely in your browser: shrink to a size limit, keep specific pages, follow portal upload rules, and remove blank pages. Zero uploads, zero accounts.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Make It Fit (target size limit)",
    "Keep specific pages",
    "Follow portal upload rules (“The website says…”)",
    "Remove blank pages",
    "Remove pages",
    "Find pages containing a word",
  ],
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to fix a PDF without uploading it",
  totalTime: "PT1M",
  step: HOW_TO_STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Server-rendered English fallback strings: this boundary only shows if the
          client tree itself crashes, before i18n could mount. */}
      <AppErrorBoundary
        title="Something broke in the workshop"
        body="An unexpected error crashed this part of the page. Your file was never uploaded — reloading gives you a clean slate."
        reloadLabel="Reload FixMyPDF"
      >
        <FixMyPdfApp />
      </AppErrorBoundary>
    </>
  );
}
