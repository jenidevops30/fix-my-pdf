"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries/en";

const MINI_BADGES: DictKey[] = ["upload_badge_1", "upload_badge_2", "upload_badge_3"];

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadZone({ onFileSelected }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const { t } = useI18n();

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFileSelected(f);
  };

  const loadSample = async () => {
    setLoadingSample(true);
    try {
      const res = await fetch("/samples/fixmypdf-demo.pdf");
      if (!res.ok) throw new Error("Sample could not be loaded.");
      const blob = await res.blob();
      onFileSelected(new File([blob], "fixmypdf-demo.pdf", { type: "application/pdf" }));
    } catch {
      toast.error(t("upload_sample_error"), {
        description: t("upload_sample_error_desc"),
      });
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label={t("upload_aria")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed py-16 px-6 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-orange-500/70 bg-orange-500/10"
            : "border-border bg-muted/40 hover:bg-orange-500/5 hover:border-orange-500/60"
        )}
      >
        <div className="size-14 mx-auto rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center">
          <FileUp className="size-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold mt-4">{t("upload_title")}</h3>
        <p className="text-sm text-muted-foreground font-mono mt-1">{t("upload_sub")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {MINI_BADGES.map((badgeKey) => (
            <span
              key={badgeKey}
              className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
            >
              {t(badgeKey)}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = ""; // allow re-picking the same file
          }}
        />
      </div>
      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={loadSample}
          disabled={loadingSample}
          className="text-xs text-muted-foreground h-9"
        >
          {loadingSample ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FlaskConical className="size-3.5" aria-hidden="true" />
          )}
          {t("upload_sample")}
        </Button>
      </div>
    </div>
  );
}
