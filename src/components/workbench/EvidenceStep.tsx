"use client";

import { useMemo, useState } from "react";
import {
  FACT_CATEGORIES,
  type Brief,
} from "@/lib/domain/types";
import type { RankedFact } from "@/lib/retrieval/rank";
import { normalizeText } from "@/lib/retrieval/tokenize";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconArchive,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconFilter,
  IconInfo,
  IconSearch,
  IconX,
} from "@/components/ui/Icons";

export function EvidenceStep({
  brief,
  ranked,
  selectedIds,
  onToggle,
  onSetSelection,
  onBack,
  onNext,
  onOpenSources,
}: {
  brief: Brief;
  ranked: RankedFact[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSetSelection: (ids: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  onOpenSources: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [onlySelected, setOnlySelected] = useState(false);

  const maxScore = useMemo(
    () => Math.max(...ranked.map((item) => item.score), 1),
    [ranked],
  );

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return ranked.filter((item) => {
      if (!showArchived && item.fact.status === "archived") return false;
      if (category !== "all" && item.fact.category !== category) return false;
      if (onlySelected && !selectedIds.includes(item.fact.id)) return false;
      if (query) {
        const haystack = normalizeText(
          `${item.fact.id} ${item.fact.title} ${item.fact.content} ${item.fact.sourceName} ${item.fact.tags.join(" ")}`,
        );
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [ranked, search, category, showArchived, onlySelected, selectedIds]);

  const selectedFacts = ranked
    .map((item) => item.fact)
    .filter((fact) => selectedIds.includes(fact.id));
  const archivedSelected = selectedFacts.filter(
    (fact) => fact.status === "archived",
  );

  const selectTop = () => {
    const top = ranked
      .filter((item) => item.fact.status === "active" && item.score > 0)
      .slice(0, 8)
      .map((item) => item.fact.id);
    onSetSelection(top);
  };

  return (
    <div className="step-grid">
      <section className="panel evidence-panel">
        <header className="panel-head">
          <div>
            <span className="section-kicker">STEP 02 · 依据</span>
            <h2>哪些资料可以支撑这篇文案？</h2>
            <p>
              系统根据 Brief 做关键词检索，排序只是辅助。最终由你决定用哪些事实卡；被选中的资料会成为本次运行的快照。
            </p>
          </div>
          <Badge tone="outline">{selectedIds.length} 张已选</Badge>
        </header>

        <Notice tone="info" compact>
          检索方式是中文二元组关键词匹配（标题 / 标签 / 正文加权），不是向量检索，也不是“自动判断真伪”。命中词会显示在每张卡下方。
        </Notice>

        <div className="evidence-toolbar">
          <div className="search-wrap">
            <IconSearch size={16} />
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索编号、标题、内容、来源或标签"
              aria-label="搜索事实卡"
            />
            {search ? (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch("")}
                aria-label="清空搜索"
              >
                <IconX size={14} />
              </button>
            ) : null}
          </div>

          <label className="select-wrap">
            <IconFilter size={15} />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="按分类筛选"
            >
              <option value="all">全部分类</option>
              {FACT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="check-inline">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            显示已归档
          </label>

          <label className="check-inline">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(event) => setOnlySelected(event.target.checked)}
            />
            只看已选
          </label>
        </div>

        <div className="evidence-list-head">
          <span>
            显示 {filtered.length} / {ranked.length} 张
          </span>
          <button type="button" className="text-button" onClick={selectTop}>
            选择相关度前 8 张
          </button>
        </div>

        <div className="fact-list">
          {filtered.map((item) => {
            const fact = item.fact;
            const selected = selectedIds.includes(fact.id);
            const width = Math.max(
              4,
              Math.round((Math.max(item.score, 0) / maxScore) * 100),
            );
            return (
              <label
                key={fact.id}
                className={`fact-card ${selected ? "fact-selected" : ""} ${
                  fact.status === "archived" ? "fact-archived" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(fact.id)}
                />
                <span className="fact-check" aria-hidden="true">
                  {selected ? <IconCheck size={13} /> : null}
                </span>
                <span className="fact-main">
                  <span className="fact-topline">
                    <code className="fact-id">{fact.id}</code>
                    <strong>{fact.title}</strong>
                    <Badge tone="neutral">{fact.category}</Badge>
                    {fact.status === "archived" ? (
                      <Badge tone="amber">
                        <IconArchive size={12} /> 已归档
                      </Badge>
                    ) : null}
                    <span className="fact-source">{fact.sourceName}</span>
                  </span>
                  <span className="fact-content">{fact.content}</span>
                  <span className="fact-tags">
                    {fact.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </span>
                  <span className="fact-match-row">
                    <span className="match-reasons">
                      {item.reasons.slice(0, 4).map((reason) => (
                        <span key={reason} className="match-reason">
                          {reason}
                        </span>
                      ))}
                    </span>
                    <span className="score-wrap" title={`相关度 ${item.score}`}>
                      <span className="score-bar">
                        <span
                          className="score-fill"
                          style={{ width: `${width}%` }}
                        />
                      </span>
                      <span className="score-number">{item.score}</span>
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
          {filtered.length === 0 ? (
            <div className="inline-empty">
              没有符合条件的资料。可以清空搜索，或到“品牌与资料”补充一张事实卡。
            </div>
          ) : null}
        </div>

        <footer className="panel-actions">
          <Button
            variant="ghost"
            onClick={onBack}
            icon={<IconArrowLeft size={16} />}
          >
            返回 Brief
          </Button>
          <div className="action-row">
            <Button variant="secondary" onClick={onOpenSources}>
              去补充资料
            </Button>
            <Button
              variant="primary"
              onClick={onNext}
              disabled={selectedIds.length === 0}
              trailingIcon={<IconArrowRight size={16} />}
            >
              下一步：生成文案
            </Button>
          </div>
        </footer>
      </section>

      <aside className="step-aside">
        <section className="panel aside-panel aside-sticky">
          <header className="aside-head">
            <span className="section-kicker">已选依据</span>
            <h3>{selectedIds.length} 张事实卡</h3>
            <p>生成时会完整发送这些卡片，并要求模型逐条标注引用。</p>
          </header>

          {archivedSelected.length > 0 ? (
            <Notice tone="warning" compact title="注意旧版资料">
              {archivedSelected.map((fact) => fact.id).join("、")} 已被标记为归档，请确认是否仍然适用。
            </Notice>
          ) : null}

          <div className="selected-list">
            {selectedFacts.length > 0 ? (
              selectedFacts.map((fact) => (
                <div key={fact.id} className="selected-item">
                  <div>
                    <code>{fact.id}</code>
                    <strong>{fact.title}</strong>
                    <small>
                      {fact.category} · {fact.sourceName}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggle(fact.id)}
                    aria-label={`移除 ${fact.id}`}
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="selected-empty">
                还没有选择资料。可以点“选择相关度前 8 张”，或逐张勾选。
              </div>
            )}
          </div>

          <div className="aside-actions">
            <Button variant="secondary" size="sm" onClick={selectTop}>
              使用推荐组合
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetSelection([])}
              disabled={selectedIds.length === 0}
            >
              清空
            </Button>
          </div>

          <Button
            variant="primary"
            block
            onClick={onNext}
            disabled={selectedIds.length === 0}
            trailingIcon={<IconArrowRight size={16} />}
          >
            {selectedIds.length === 0
              ? "至少选择 1 张资料"
              : "生成两版标题候选"}
          </Button>

          <div className="aside-footnote-row">
            <IconInfo size={14} />
            <span>
              当前 Brief：{brief.campaignName || "未命名活动"}；推广对象：
              {brief.product || "未填写"}。
            </span>
          </div>
        </section>

        <section className="panel aside-panel aside-note">
          <span className="section-kicker">选择建议</span>
          <ul className="compact-list">
            <li>价格、时间、人数、报名方式各至少保留一张卡。</li>
            <li>旧版资料会让模型和审核都更容易产生冲突。</li>
            <li>资料越少不一定越安全；缺少关键依据时，规则会直接标出。</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
