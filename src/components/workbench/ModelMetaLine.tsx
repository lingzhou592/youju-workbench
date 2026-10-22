import type { ModelMeta } from "@/lib/domain/types";
import { formatLatency, formatTokens } from "@/lib/format";

export function ModelMetaLine({
  meta,
  sample = false,
  compact = false,
}: {
  meta?: ModelMeta;
  sample?: boolean;
  compact?: boolean;
}) {
  if (sample) {
    return (
      <span className="model-meta model-meta-sample">
        内置示例 · 非模型实时生成
      </span>
    );
  }
  if (!meta) {
    return <span className="model-meta">未记录模型信息</span>;
  }
  return (
    <span className={`model-meta ${compact ? "model-meta-compact" : ""}`}>
      <span className={`source-dot source-${meta.source}`} aria-hidden="true" />
      {meta.model}
      <span className="model-meta-divider">·</span>
      {formatLatency(meta.latencyMs)}
      {meta.usage?.totalTokens ? (
        <>
          <span className="model-meta-divider">·</span>
          {formatTokens(meta.usage.totalTokens)} tokens
        </>
      ) : null}
      <span className="model-meta-divider">·</span>
      {meta.source === "mock" ? "本地 Mock" : "实时模型"}
    </span>
  );
}
