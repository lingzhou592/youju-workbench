import type {
  ConfirmationRecord,
  DocumentVersion,
  ReviewRecord,
  Run,
} from "@/lib/domain/types";

export function runToJson(
  run: Run,
  version: DocumentVersion,
  review?: ReviewRecord,
  confirmation?: ConfirmationRecord,
) {
  return {
    schemaVersion: 1,
    tool: "有据 · 文旅营销素材生成与校验工作台",
    exportedAt: new Date().toISOString(),
    disclaimer:
      "演示用模拟资料。引用可定位指能在本次运行的事实卡快照中回查，不代表已在现实世界核实。",
    run: {
      id: run.id,
      title: run.title,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      sample: run.sample ?? false,
      input: run.input,
      generation: run.generation,
      versions: run.versions,
      reviews: run.reviews,
      confirmations: run.confirmations,
    },
    exportedVersion: version,
    currentReview: review ?? null,
    currentConfirmation: confirmation ?? null,
  };
}
