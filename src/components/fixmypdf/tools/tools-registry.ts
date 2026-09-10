"use client";

/**
 * Registry of every Tool Shed tool. Group files are owned by their
 * respective build tasks; this file only assembles them.
 */
import type { ToolCategory, ToolDef } from "@/lib/pdf/tools/types";
import { ORGANIZE_TOOLS } from "./organize-tools";
import { CONVERT_TOOLS } from "./convert-tools";
import { OPTIMIZE_TOOLS } from "./optimize-tools";
import { SECURE_TOOLS } from "./secure-tools";
import { REPAIR_TOOLS } from "./repair-tools";
import { ANNOTATE_TOOLS } from "./annotate-tools";
import { SMART_TOOLS } from "./smart-tools";

export const TOOLS: ToolDef[] = [
  ...ORGANIZE_TOOLS,
  ...CONVERT_TOOLS,
  ...OPTIMIZE_TOOLS,
  ...SECURE_TOOLS,
  ...REPAIR_TOOLS,
  ...ANNOTATE_TOOLS,
  ...SMART_TOOLS,
];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  organize: "Organize",
  convert: "Convert",
  optimize: "Shrink & Fit",
  secure: "Protect & Clean",
  repair: "Repair & Scans",
  annotate: "Fill, Sign & Stamp",
  smart: "Smart Insights",
};

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}
