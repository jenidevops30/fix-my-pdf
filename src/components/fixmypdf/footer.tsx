"use client";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-4 mt-auto">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
          FixMyPDF Browser Engine • Ready
        </span>
        <span>Client-side document triage • No account required</span>
      </div>
    </footer>
  );
}
