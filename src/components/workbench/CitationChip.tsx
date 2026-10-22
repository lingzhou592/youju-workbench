"use client";

import { useId, useState } from "react";
import type { FactCard } from "@/lib/domain/types";

export function CitationChip({
  factId,
  fact,
  quote,
}: {
  factId: string;
  fact?: FactCard;
  quote?: string;
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const label = factId.replace("F-", "");

  if (!fact) {
    return (
      <span
        className="cite-chip cite-chip-missing"
        title={`${factId} 不在本次运行的资料快照中`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className="cite-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="cite-chip"
        aria-describedby={open ? popoverId : undefined}
        aria-label={`查看引用 ${factId} 的原文`}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <span className="cite-popover" id={popoverId} role="tooltip">
          <span className="cite-popover-head">
            <strong>{factId}</strong>
            <span>{fact.title}</span>
          </span>
          {quote ? (
            <span className="cite-popover-quote">引用：{quote}</span>
          ) : (
            <span className="cite-popover-quote cite-popover-missing">
              这条引用还没有填写原文摘录。
            </span>
          )}
          <span className="cite-popover-fact">{fact.content}</span>
          <span className="cite-popover-source">
            {fact.sourceName} · {fact.category}
            {fact.status === "archived" ? " · 已归档" : ""}
          </span>
        </span>
      ) : null}
    </span>
  );
}
