"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MINI_BADGES = ["100% in-browser", "No account", "No watermark"];

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadZone({ onFileSelected }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

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
      toast.error("Could not load the sample document.", {
        description: "Check your connection, or drop one of your own PDFs instead.",
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
        aria-label="Upload a PDF — drop it here or press Enter to browse"
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
            ? "border-orange-400 bg-orange-50/60"
            : "border-slate-300 bg-slate-50/50 hover:bg-orange-50/40 hover:border-orange-400"
        )}
      >
        <div className="size-14 mx-auto rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <FileUp className="size-6 text-orange-600" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold mt-4">Drop your PDF here</h3>
        <p className="text-sm text-slate-500 font-mono mt-1">
          or click to browse — it never leaves your device
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {MINI_BADGES.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-500"
            >
              {badge}
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
          className="text-xs text-slate-600 h-9"
        >
          {loadingSample ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FlaskConical className="size-3.5" aria-hidden="true" />
          )}
          Try a sample document
        </Button>
      </div>
    </div>
  );
}
