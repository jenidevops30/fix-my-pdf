"use client";

import { FileText, Repeat2 } from "lucide-react";
import type { BasicInfo } from "@/lib/pdf/engine";
import { formatBytes } from "@/lib/pdf/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FileBarProps {
  file: File;
  info: BasicInfo;
  onClearFile: () => void;
}

export function FileBar({ file, info, onClearFile }: FileBarProps) {
  const overTwoMb = file.size > 2 * 1024 * 1024;

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-slate-100">
      <div className="flex items-center gap-4 min-w-0">
        <div className="size-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
          <FileText className="size-6 text-orange-600" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <span className="font-bold text-base break-all">{file.name}</span>
            <Badge className="bg-slate-100 text-slate-600 font-mono text-[11px] border-transparent">
              {info.pageCount} Pages
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Current size:{" "}
            <span className={overTwoMb ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {formatBytes(file.size)}
            </span>
            {info.encrypted && <span className="text-amber-600"> · password-protected</span>}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearFile}
        className="shrink-0 self-start sm:self-auto"
      >
        <Repeat2 aria-hidden="true" />
        Switch file
      </Button>
    </div>
  );
}
