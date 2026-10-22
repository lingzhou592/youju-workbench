import type { DocumentVersion, Run } from "@/lib/domain/types";

export function safeFilenamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
}

export function buildFilename(
  run: Run,
  version: DocumentVersion,
  extension: "md" | "json",
): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const brand = safeFilenamePart(run.input.brand.name) || "品牌";
  const campaign =
    safeFilenamePart(run.input.brief.campaignName) ||
    safeFilenamePart(run.title) ||
    "文案";
  return `${brand}_${campaign}_候选${version.candidate}_${date}.${extension}`;
}
