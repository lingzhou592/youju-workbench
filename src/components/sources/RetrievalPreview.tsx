"use client";

import { useState } from "react";
import type { Brief, FactCard } from "@/lib/domain/types";
import type { RankedFact } from "@/lib/retrieval/rank";
import { rankFacts } from "@/lib/retrieval/rank";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconSearch } from "@/components/ui/Icons";

function previewBrief(query: string): Brief {
  return {
    campaignName: "检索预览",
    product: query,
    goal: "",
    audience: query,
    sellingPoints: query,
    toneOverride: "",
    constraints: "",
    channel: "小红书",
  };
}

export function RetrievalPreview({ facts }: { facts: FactCard[] }) {
  const [query, setQuery] = useState(
    "长沙大学生周末夜游，岳麓山两小时轻散步，12 人小团",
  );
  const [results, setResults] = useState<RankedFact[]>([]);
  const [ran, setRan] = useState(false);

  const run = () => {
    setResults(rankFacts(facts, previewBrief(query)).slice(0, 6));
    setRan(true);
  };

  return (
    <section className="panel aside-panel retrieval-preview">
      <header className="aside-head">
        <span className="section-kicker">检索预览</span>
        <h3>关键词会命中哪些资料？</h3>
        <p>
          与工作台使用同一套中文二元组关键词匹配。这里可以先观察排序是否合理，再回到工作台选择。
        </p>
      </header>
      <textarea
        className="preview-query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rows={3}
        aria-label="检索预览查询"
      />
      <Button
        variant="secondary"
        size="sm"
        block
        onClick={run}
        icon={<IconSearch size={14} />}
        disabled={!query.trim()}
      >
        预览排序
      </Button>
      {ran ? (
        <div className="preview-results">
          {results.length > 0 ? (
            results.map((item) => (
              <div key={item.fact.id} className="preview-result">
                <div className="preview-result-top">
                  <code>{item.fact.id}</code>
                  <strong>{item.fact.title}</strong>
                  <Badge tone={item.fact.status === "archived" ? "amber" : "neutral"}>
                    {item.fact.status === "archived" ? "已归档" : item.fact.category}
                  </Badge>
                  <span>{item.score}</span>
                </div>
                <p>{item.reasons.slice(0, 2).join("；")}</p>
              </div>
            ))
          ) : (
            <p className="muted small-note">
              没有命中。可以换一个更具体的查询，或检查资料标签。
            </p>
          )}
        </div>
      ) : null}
      <p className="aside-footnote">
        这是关键词匹配，不是向量检索；排序只用于辅助人工选择。
      </p>
    </section>
  );
}
