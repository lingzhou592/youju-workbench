"use client";

import type { Run } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { getVersionSourceLabel } from "@/state/selectors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconClock } from "@/components/ui/Icons";

export function VersionTimeline({
  run,
  currentVersionId,
  onRestore,
}: {
  run: Run;
  currentVersionId: string;
  onRestore: (versionId: string) => void;
}) {
  const versions = [...run.versions].reverse();

  return (
    <details className="panel version-panel">
      <summary>
        <span className="version-summary-icon">
          <IconClock size={16} />
        </span>
        <span>
          版本历史（{run.versions.length}）
          <small>每次编辑、切换候选、修订或恢复都会追加一个版本</small>
        </span>
      </summary>
      <div className="version-list">
        {versions.map((version) => {
          const index = run.versions.findIndex((item) => item.id === version.id);
          const current = version.id === currentVersionId;
          return (
            <div
              key={version.id}
              className={`version-row ${current ? "version-current" : ""}`}
            >
              <div className="version-main">
                <div className="version-top">
                  <strong>v{index + 1}</strong>
                  <Badge tone="outline">候选 {version.candidate}</Badge>
                  <Badge tone="neutral">
                    {getVersionSourceLabel(version)}
                  </Badge>
                  {current ? <Badge tone="green">当前</Badge> : null}
                  <span className="version-time">
                    {formatDateTime(version.createdAt)}
                  </span>
                </div>
                {version.revisionNotes && version.revisionNotes.length > 0 ? (
                  <ul className="version-notes">
                    {version.revisionNotes.map((note, noteIndex) => (
                      <li key={`${note}-${noteIndex}`}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="version-hash">
                  内容指纹 {version.contentHash.slice(0, 8)}
                </div>
              </div>
              {!current ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRestore(version.id)}
                >
                  恢复为新版本
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="version-footnote">
        版本只追加、不删除。恢复旧版本会创建一个新版本，旧的审核与人工确认不会继承。
      </p>
    </details>
  );
}
