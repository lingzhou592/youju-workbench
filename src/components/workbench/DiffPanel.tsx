"use client";

import { useMemo } from "react";
import type { DocumentVersion } from "@/lib/domain/types";
import { diffStats, sentenceDiff } from "@/lib/revision/diff";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { IconX } from "@/components/ui/Icons";

export function DiffPanel({
  before,
  after,
  notes,
  unresolved,
  onClose,
}: {
  before: DocumentVersion;
  after: DocumentVersion;
  notes: string[];
  unresolved?: string[];
  onClose: () => void;
}) {
  const segments = useMemo(
    () => sentenceDiff(before.body, after.body),
    [before.body, after.body],
  );
  const stats = useMemo(() => diffStats(segments), [segments]);
  const titleChanged = before.title !== after.title;

  return (
    <section className="panel diff-panel">
      <header className="panel-head compact-head">
        <div>
          <span className="section-kicker">修改对比</span>
          <h2>这次改了什么</h2>
          <p>
            句级对比，帮助你确认修改范围没有超出预期。
          </p>
        </div>
        <div className="diff-head-actions">
          <Badge tone="green">+{stats.added} 字</Badge>
          <Badge tone="red">−{stats.removed} 字</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<IconX size={14} />}
            aria-label="关闭对比"
          >
            关闭
          </Button>
        </div>
      </header>

      {titleChanged ? (
        <div className="diff-title-change">
          <span>标题</span>
          <del>{before.title}</del>
          <span className="diff-arrow">→</span>
          <ins>{after.title}</ins>
        </div>
      ) : null}

      <div className="diff-body">
        {segments.map((segment, index) => {
          if (segment.type === "add") {
            return (
              <ins key={index} className="diff-add">
                {segment.text}
              </ins>
            );
          }
          if (segment.type === "remove") {
            return (
              <del key={index} className="diff-remove">
                {segment.text}
              </del>
            );
          }
          return (
            <span key={index} className="diff-same">
              {segment.text}
            </span>
          );
        })}
      </div>

      {notes.length > 0 ? (
        <div className="diff-notes">
          <h3>变更说明</h3>
          <ul>
            {notes.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {unresolved && unresolved.length > 0 ? (
        <Notice tone="warning" compact title="未解决的问题">
          <ul className="compact-list">
            {unresolved.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
    </section>
  );
}
