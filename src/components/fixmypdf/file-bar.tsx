"use client";

import { FileText, Repeat2 } from "lucide-react";
import type { BasicInfo } from "@/lib/pdf/engine";
import { formatBytes } from "@/lib/pdf/format";
import { useI18n } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FileBarProps {
  file: File;
  info: BasicInfo;
  onClearFile: () => void;
}

export function FileBar({ file, info, onClearFile }: FileBarProps) {
  const { t } = useI18n();
  const overTwoMb = file.size > 2 * 1024 * 1024;

  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-border/70">
      <div className="flex items-center gap-4 min-w-0">
        <div className="size-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
          <FileText className="size-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <span className="font-bold text-base break-all">{file.name}</span>
            <Badge className="bg-muted text-muted-foreground font-mono text-[11px] border-transparent">
              {t("file_pages", { n: info.pageCount })}
            </Badge>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {t("file_current_size")}{" "}
            <span className={overTwoMb ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
              {formatBytes(file.size)}
            </span>
            {info.encrypted && <span className="text-amber-600 dark:text-amber-400"> · {t("file_encrypted")}</span>}
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
        {t("file_switch")}
      </Button>
    </div>
  );
}
