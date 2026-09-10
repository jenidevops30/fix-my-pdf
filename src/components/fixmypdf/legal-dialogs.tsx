"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/context";

const LAST_UPDATED = "February 2026";

function PrivacyBody() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
      <p>
        <strong className="text-foreground">The short version: we cannot see your documents,
        because they never leave your device.</strong>
      </p>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          1. Files
        </h4>
        <p>
          FixMyPDF processes PDFs entirely inside your browser using WebAssembly. Your file is
          read into your device&apos;s memory, fixed locally, and written back to your disk. No
          upload endpoint exists — there is no server that could receive, store, or leak your
          document.
        </p>
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          2. Data we store
        </h4>
        <p>
          We keep no accounts and no databases. Three small preferences live in your browser&apos;s
          local storage only: your theme (light/dark), your language, and a counter of how many
          files you have fixed on this device. Clearing your browser storage erases all of it.
        </p>
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          3. Tracking &amp; cookies
        </h4>
        <p>
          No analytics, no advertising pixels, no fingerprinting, no third-party requests during
          processing. The app works fully offline once loaded.
        </p>
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          4. Contact
        </h4>
        <p>
          Questions about this policy: <span className="font-mono">hello@fixmypdf.app</span>
        </p>
      </div>
    </div>
  );
}

function TermsBody() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          1. The service
        </h4>
        <p>
          FixMyPDF is a free, client-side tool that transforms PDF files locally in your browser,
          &ldquo;as is&rdquo;, without warranty of any kind. We do not access your files and cannot
          guarantee any specific output for any specific document.
        </p>
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          2. Your responsibility
        </h4>
        <p>
          Always keep the original file and review the fixed result before submitting it anywhere
          important. Verify that compressed documents remain readable and complete — especially
          for legal, medical, or government submissions.
        </p>
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          3. Limitation of liability
        </h4>
        <p>
          To the maximum extent permitted by law, FixMyPDF and its authors are not liable for any
          damages or data loss arising from the use of this tool. You use it at your own risk —
          like any power tool, but for paperwork.
        </p>
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          4. Acceptable use
        </h4>
        <p>
          Use the tool only for documents you have the right to modify. You agree not to use
          FixMyPDF to tamper with documents in violation of any law or agreement.
        </p>
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider font-mono">
          5. Contact
        </h4>
        <p>
          Questions about these terms: <span className="font-mono">hello@fixmypdf.app</span>
        </p>
      </div>
    </div>
  );
}

interface LegalDialogProps {
  kind: "privacy" | "terms";
  children: React.ReactNode;
}

function LegalDialog({ kind, children }: LegalDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const title = kind === "privacy" ? t("legal_privacy_title") : t("legal_terms_title");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto slim-scrollbar">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {t("legal_last_updated")}: {LAST_UPDATED} · {t("legal_lang_note")}
          </DialogDescription>
        </DialogHeader>
        {kind === "privacy" ? <PrivacyBody /> : <TermsBody />}
        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mt-2">
          {t("legal_close")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Footer legal links + dialogs. Self-contained. */
export function LegalDialogs() {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-1.5">
      <LegalDialog kind="privacy">
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {t("foot_privacy")}
        </button>
      </LegalDialog>
      <span aria-hidden="true">·</span>
      <LegalDialog kind="terms">
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {t("foot_terms")}
        </button>
      </LegalDialog>
    </span>
  );
}
