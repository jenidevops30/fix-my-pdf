"use client";

/**
 * SECURE_TOOLS — Password Protect, Remove Password, Redact Text, Flatten,
 * Sanitize, Metadata Editor. Every run stays 100% in this browser tab.
 *
 * Components render ONLY controls + the run button; the ToolDialog owns
 * progress, cancellation, results and downloads.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Eraser,
  FileSearch,
  Layers,
  Loader2,
  Lock,
  LockOpen,
  Search,
  ShieldX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { pagesToCompactSpec } from "@/lib/pdf/format";
import {
  applyMetadata,
  findRedactablePages,
  flattenPdf,
  protectPdf,
  readPdfMetadata,
  redactTerms,
  sanitizePdf,
  unprotectPdf,
  wipeMetadata,
  type PdfMetadata,
  type RedactPreview,
} from "@/lib/pdf/tools/secure";
import type { ToolComponentProps, ToolDef } from "@/lib/pdf/tools/types";
import { ToolHint, ToolNote, ToolStep } from "./parts";

/* --------------------------------- styles ---------------------------------- */

const RUN_BTN =
  "w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base";
const CHIP_EMERALD =
  "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono";
const READONLY_ROW = "space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs";

function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-destructive leading-relaxed">
      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function formatStamp(d: Date | null): string {
  return d ? new Date(d).toLocaleString() : "—";
}

/* ------------------------------ 1 · protect -------------------------------- */

function ProtectTool({ files, busy, run }: ToolComponentProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [useOwner, setUseOwner] = useState(false);
  const [owner, setOwner] = useState("");
  const file = files[0];

  const mismatch = confirm.length > 0 && password !== confirm;
  const ready =
    !!file &&
    password.length > 0 &&
    password === confirm &&
    (!useOwner || owner.length > 0);

  const submit = () => {
    if (!file || !ready) return;
    run(async (ctx) => [
      await protectPdf(
        file,
        { user: password, owner: useOwner ? owner : undefined },
        ctx
      ),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="protect-password">Password</Label>
          <Input
            id="protect-password"
            type="password"
            autoComplete="new-password"
            placeholder="Choose a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="protect-confirm">Confirm password</Label>
          <Input
            id="protect-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat the password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            aria-invalid={mismatch}
          />
          {mismatch && <InlineError>Passwords don&apos;t match yet.</InlineError>}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <div className="space-y-0.5">
            <Label
              htmlFor="protect-owner"
              className="text-xs font-medium cursor-pointer"
            >
              Separate owner password (restrict editing)
            </Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Readers with the main password can print &amp; copy — but not edit,
              annotate or assemble.
            </p>
          </div>
          <Switch
            id="protect-owner"
            checked={useOwner}
            onCheckedChange={setUseOwner}
          />
        </div>

        {useOwner && (
          <div className="space-y-1.5">
            <Label htmlFor="protect-owner-pw">Owner password</Label>
            <Input
              id="protect-owner-pw"
              type="password"
              autoComplete="new-password"
              placeholder="Unlocks full rights — must differ"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
        )}

        <ToolNote>
          Pick something you&apos;ll remember — we can&apos;t recover it for you.
        </ToolNote>
      </div>

      <Button className={RUN_BTN} disabled={busy || !ready} onClick={submit}>
        <Lock className="size-4" aria-hidden="true" /> Lock PDF with a password
      </Button>
    </div>
  );
}

/* ------------------------------ 2 · unprotect ------------------------------ */

function UnprotectTool({ files, busy, run }: ToolComponentProps) {
  const [password, setPassword] = useState("");
  const file = files[0];
  const ready = !!file && password.length > 0;

  const submit = () => {
    if (!file || !ready) return;
    run(async (ctx) => [await unprotectPdf(file, password, ctx)]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="unprotect-password">Current password</Label>
        <Input
          id="unprotect-password"
          type="password"
          autoComplete="current-password"
          placeholder="The password you set before"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </div>
      <ToolHint>
        The file is decrypted and re-saved right here in the tab. A wrong
        password changes nothing — the original stays untouched.
      </ToolHint>
      <Button className={RUN_BTN} disabled={busy || !ready} onClick={submit}>
        <LockOpen className="size-4" aria-hidden="true" /> Remove the password
      </Button>
    </div>
  );
}

/* -------------------------------- 3 · redact ------------------------------- */

function RedactTool({ files, busy, run }: ToolComponentProps) {
  const [termsText, setTermsText] = useState("");
  const [scanning, setScanning] = useState(false);
  const file = files[0];

  const terms = useMemo(
    () =>
      termsText
        .split(/[\n,]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    [termsText]
  );
  const termsKey = termsText.trim().toLowerCase();

  // Results carry the file + terms they were computed from — stale data
  // simply stops displaying, no effects needed.
  const [scan, setScan] = useState<{
    file: File;
    termsKey: string;
    data: RedactPreview;
  } | null>(null);
  const [scanError, setScanError] = useState<{ file: File; message: string } | null>(
    null
  );

  const preview =
    scan && scan.file === file && scan.termsKey === termsKey ? scan.data : null;
  const error = scanError && scanError.file === file ? scanError.message : null;

  const findTerms = () => {
    if (!file || terms.length === 0 || scanning) return;
    setScanning(true);
    setScanError(null);
    findRedactablePages(file, terms).then(
      (data) => {
        setScan({ file, termsKey, data });
        setScanning(false);
      },
      (err) => {
        setScanError({
          file,
          message:
            err instanceof Error ? err.message : "Could not scan this PDF.",
        });
        setScanning(false);
      }
    );
  };

  const submit = () => {
    if (!file || terms.length === 0) return;
    run(async (ctx) => [await redactTerms(file, terms, ctx)]);
  };

  return (
    <div className="space-y-5">
      <ToolStep n={1} title="Terms to redact">
        <Textarea
          value={termsText}
          onChange={(e) => setTermsText(e.target.value)}
          placeholder={"e.g. Jane Doe, ACME-441, confidential"}
          rows={3}
          className="font-mono text-sm"
          aria-label="Terms to redact"
        />
        <ToolHint>
          Separate terms with commas or new lines. Matching ignores
          capitalization and works on the real text layer.
        </ToolHint>
        {terms.length === 0 && termsText.length > 0 && (
          <InlineError>Add at least one term to redact.</InlineError>
        )}
      </ToolStep>

      <ToolStep n={2} title="Find terms">
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={findTerms}
            disabled={scanning || busy || !file || terms.length === 0}
          >
            {scanning ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-3.5" aria-hidden="true" />
            )}
            Find terms
          </Button>
        </div>

        {scanning && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Scanning the text layer…
          </p>
        )}

        {!scanning && error && <InlineError>{error}</InlineError>}

        {!scanning && preview && preview.pages.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
            <Badge variant="outline" className={CHIP_EMERALD}>
              Found on pages: {pagesToCompactSpec(preview.pages)}
            </Badge>
            <Badge variant="outline" className={CHIP_EMERALD}>
              {preview.pages.length} {preview.pages.length === 1 ? "page" : "pages"}
            </Badge>
            <Badge variant="outline" className={CHIP_EMERALD}>
              {preview.occurrences}{" "}
              {preview.occurrences === 1 ? "match" : "matches"}
            </Badge>
          </div>
        )}

        {!scanning && preview && preview.pages.length === 0 && (
          <p
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs leading-relaxed px-3 py-2"
            aria-live="polite"
          >
            No matches in the text layer. Scanned pages can&apos;t be found by
            text search, and this tool can&apos;t draw boxes on scanned images
            by hand — the terms may still be visible as pictures.
          </p>
        )}
      </ToolStep>

      <ToolNote>
        Redacted pages are rebuilt as pictures with the boxes burned in — the
        words underneath are truly gone. Other pages keep their real text.
      </ToolNote>

      <Button
        className={RUN_BTN}
        disabled={busy || !file || terms.length === 0}
        onClick={submit}
      >
        <Eraser className="size-4" aria-hidden="true" /> Redact &amp; download
      </Button>
    </div>
  );
}

/* -------------------------------- 4 · flatten ------------------------------ */

function FlattenTool({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  const submit = () => {
    if (!file) return;
    run(async (ctx) => [await flattenPdf(file, ctx)]);
  };

  return (
    <div className="space-y-4">
      <ToolNote>
        Every page becomes a picture: text is no longer selectable, form fields
        are baked in. Use this before Redact or after Fill Forms.
      </ToolNote>
      <Button className={RUN_BTN} disabled={busy} onClick={submit}>
        <Layers className="size-4" aria-hidden="true" /> Flatten PDF
      </Button>
    </div>
  );
}

/* -------------------------------- 5 · sanitize ----------------------------- */

const SANITIZE_ALWAYS_REMOVED = [
  "document JavaScript",
  "embedded file attachments",
  "XFA forms",
  "tracking metadata",
];

function SanitizeTool({ files, busy, run }: ToolComponentProps) {
  const [removeLinks, setRemoveLinks] = useState(true);
  const file = files[0];

  const submit = () => {
    if (!file) return;
    run(async (ctx) => [await sanitizePdf(file, { removeLinks }, ctx)]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-bold font-mono uppercase tracking-wide">
          Always removed
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SANITIZE_ALWAYS_REMOVED.map((label) => (
            <Badge key={label} variant="outline" className={CHIP_EMERALD}>
              {label}
            </Badge>
          ))}
        </div>
        <ToolHint>
          Outline bookmarks, named destinations and page content are kept.
        </ToolHint>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <div className="space-y-0.5">
          <Label
            htmlFor="sanitize-links"
            className="text-xs font-medium cursor-pointer"
          >
            Remove clickable link annotations
          </Label>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Strips ALL annotations on every page — links, comments and
            highlights go too.
          </p>
        </div>
        <Switch
          id="sanitize-links"
          checked={removeLinks}
          onCheckedChange={setRemoveLinks}
        />
      </div>

      <ToolNote tone="emerald">
        A rebuilt, clean copy: only page content survives. Nothing leaves your
        device.
      </ToolNote>

      <Button className={RUN_BTN} disabled={busy} onClick={submit}>
        <ShieldX className="size-4" aria-hidden="true" /> Sanitize PDF
      </Button>
    </div>
  );
}

/* -------------------------------- 6 · metadata ----------------------------- */

type MetadataRead =
  | { file: File; status: "reading" }
  | { file: File; status: "ok"; meta: PdfMetadata }
  | { file: File; status: "error"; error: string };

function MetadataTool({ files, busy, run }: ToolComponentProps) {
  const file = files[0];
  const [read, setRead] = useState<MetadataRead | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const readToken = useRef(0);

  // Read current metadata whenever the file changes (token-guarded, and all
  // state writes happen in promise callbacks — never synchronously).
  useEffect(() => {
    if (!file) return;
    const token = ++readToken.current;
    const target = file;
    Promise.resolve().then(() => {
      if (readToken.current !== token) return;
      setRead({ file: target, status: "reading" });
      readPdfMetadata(target).then(
        (meta) => {
          if (readToken.current !== token) return;
          setRead({ file: target, status: "ok", meta });
          setTitle(meta.title);
          setAuthor(meta.author);
          setSubject(meta.subject);
          setKeywords(meta.keywords);
        },
        (err) => {
          if (readToken.current !== token) return;
          setRead({
            file: target,
            status: "error",
            error:
              err instanceof Error
                ? err.message
                : "Could not read this PDF's metadata.",
          });
        }
      );
    });
  }, [file]);

  const current = read && read.file === file ? read : null;
  const meta = current && current.status === "ok" ? current.meta : null;

  const save = () => {
    if (!file) return;
    run(async (ctx) => [
      await applyMetadata(file, { title, author, subject, keywords }, ctx),
    ]);
  };

  const wipeAll = () => {
    if (!file) return;
    setTitle("");
    setAuthor("");
    setSubject("");
    setKeywords("");
    run(async (ctx) => [await wipeMetadata(file, ctx)]);
  };

  return (
    <div className="space-y-4">
      {current && current.status === "reading" && (
        <p
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Reading current metadata…
        </p>
      )}

      {current && current.status === "error" && (
        <InlineError>{current.error}</InlineError>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="meta-title">Title</Label>
          <Input
            id="meta-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-author">Author</Label>
          <Input
            id="meta-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-subject">Subject</Label>
          <Input
            id="meta-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject / description"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-keywords">Keywords</Label>
          <Input
            id="meta-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="invoice, 2024, urgent"
            className="font-mono text-sm"
          />
          <ToolHint>Comma-separated — saved as a keyword list.</ToolHint>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-bold font-mono uppercase tracking-wide">
          Read-only details
        </p>
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
          {(
            [
              ["Creator", meta?.creator],
              ["Producer", meta?.producer],
              ["Created", meta ? formatStamp(meta.created) : null],
              ["Modified", meta ? formatStamp(meta.modified) : null],
            ] as Array<[string, string | null]>
          ).map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[7.5rem_1fr] items-baseline gap-x-3"
            >
              <span className="text-muted-foreground font-mono">{label}</span>
              <span className="font-mono truncate text-right" title={value ?? ""}>
                {value || "—"}
              </span>
            </div>
          ))}
        </div>
        <ToolHint>
          Creator &amp; producer reveal which software made this file — dates
          show when. Only a save rewrites them.
        </ToolHint>
      </div>

      <div className="space-y-2">
        <Button
          className={RUN_BTN}
          disabled={busy || !file || !meta}
          onClick={save}
        >
          <FileSearch className="size-4" aria-hidden="true" /> Save metadata
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={busy || !file || !meta}
          onClick={wipeAll}
        >
          Wipe everything instead
        </Button>
        <ToolHint>
          Saving keeps everything you didn&apos;t change. Wiping blanks Title,
          Author, Subject &amp; Keywords, drops the hidden XMP packet and sets
          the producer to FixMyPDF — output is named{" "}
          <span className="font-mono">…-clean.pdf</span>.
        </ToolHint>
      </div>
    </div>
  );
}

/* ------------------------------- definitions ------------------------------- */

export const SECURE_TOOLS: ToolDef[] = [
  {
    id: "protect",
    name: "Password Protect",
    tagline: "Lock a PDF behind a password — encrypted right here.",
    icon: Lock,
    category: "secure",
    io: {
      accept: ".pdf",
      minFiles: 1,
      maxFiles: 1,
      hint: "One PDF · it never leaves your device",
    },
    Component: ProtectTool,
  },
  {
    id: "unprotect",
    name: "Remove Password",
    tagline: "Unlock a PDF you own — with the password you know.",
    icon: LockOpen,
    category: "secure",
    io: {
      accept: ".pdf",
      minFiles: 1,
      maxFiles: 1,
      hint: "One PDF — you'll type its password below",
    },
    Component: UnprotectTool,
  },
  {
    id: "redact",
    name: "Redact Text",
    tagline: "Burn out words for good — not just a black box on top.",
    icon: Eraser,
    category: "secure",
    io: {
      accept: ".pdf",
      minFiles: 1,
      maxFiles: 1,
      hint: "One PDF with a text layer (not a scan)",
    },
    Component: RedactTool,
  },
  {
    id: "flatten",
    name: "Flatten PDF",
    tagline: "Freeze forms, layers & annotations into plain pages.",
    icon: Layers,
    category: "secure",
    io: { accept: ".pdf", minFiles: 1, maxFiles: 1, hint: "One PDF" },
    Component: FlattenTool,
  },
  {
    id: "sanitize",
    name: "Sanitize & Strip Junk",
    tagline: "Remove hidden JS, attachments, links & tracking metadata.",
    icon: ShieldX,
    category: "secure",
    io: { accept: ".pdf", minFiles: 1, maxFiles: 1, hint: "One PDF" },
    Component: SanitizeTool,
  },
  {
    id: "metadata",
    name: "Metadata Editor",
    tagline: "See what your PDF reveals — rewrite or wipe it.",
    icon: FileSearch,
    category: "secure",
    io: { accept: ".pdf", minFiles: 1, maxFiles: 1, hint: "One PDF" },
    Component: MetadataTool,
  },
];
