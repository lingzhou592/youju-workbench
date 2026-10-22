"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Run } from "@/lib/domain/types";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  countModelIssues,
  getActiveVersion,
  getCurrentConfirmation,
  getCurrentReview,
  getRuleSummary,
  getRunStatus,
  getRunStatusLabel,
} from "@/state/selectors";
import { useApp } from "@/state/AppStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  IconClock,
  IconFileText,
  IconTrash,
} from "@/components/ui/Icons";

function statusTone(run: Run) {
  const status = getRunStatus(run);
  if (status === "confirmed") return "green" as const;
  if (status === "reviewed") return "blue" as const;
  if (status === "sample") return "purple" as const;
  if (status === "generated") return "amber" as const;
  return "neutral" as const;
}

export function RunList() {
  const router = useRouter();
  const { state, dispatch, toast } = useApp();
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Run | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const runs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.runs.filter((run) => {
      if (!query) return true;
      return (
        run.title.toLowerCase().includes(query) ||
        run.input.brief.product.toLowerCase().includes(query) ||
        run.input.brief.campaignName.toLowerCase().includes(query)
      );
    });
  }, [state.runs, search]);

  const confirmedCount = state.runs.filter(
    (run) => getRunStatus(run) === "confirmed",
  ).length;
  const sampleCount = state.runs.filter((run) => run.sample).length;

  const openRun = (run: Run) => {
    dispatch({ type: "SET_ACTIVE_RUN", id: run.id });
    dispatch({ type: "SET_STEP", step: "review" });
    router.push("/");
  };

  return (
    <section className="history-section">
      <div className="history-toolbar">
        <div>
          <h2>运行记录</h2>
          <p>
            每次生成、编辑、修订、审核与确认都留在这条运行里。打开后会回到工作台的校验步骤。
          </p>
        </div>
        <div className="history-toolbar-actions">
          <div className="search-wrap history-search">
            <IconClock size={14} />
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索活动或产品"
              aria-label="搜索运行记录"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClearOpen(true)}
            disabled={state.runs.length === 0}
            icon={<IconTrash size={14} />}
          >
            清空历史
          </Button>
        </div>
      </div>

      <div className="history-stats">
        <span>
          <strong>{state.runs.length}</strong> 条运行
        </span>
        <span>
          <i className="dot-pass" /> {confirmedCount} 条已确认
        </span>
        <span>
          <i className="dot-warn" /> {sampleCount} 条内置示例
        </span>
      </div>

      {runs.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<IconFileText size={24} />}
            title={search ? "没有匹配的运行记录" : "还没有运行记录"}
            description={
              search
                ? "换一个关键词，或清空搜索。"
                : "去工作台完成一次 Brief、选择依据并生成；也可以先加载内置示例运行。"
            }
            action={
              <Button variant="primary" onClick={() => router.push("/")}>
                去工作台
              </Button>
            }
          />
        </div>
      ) : (
        <div className="run-list">
          {[...runs]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((run) => {
              const version = getActiveVersion(run);
              const review = getCurrentReview(run, version);
              const confirmation = getCurrentConfirmation(run, version);
              const ruleSummary = getRuleSummary(run, version);
              const issues = countModelIssues(run, version);
              return (
                <article key={run.id} className="panel run-card">
                  <div className="run-card-main">
                    <div className="run-card-top">
                      <Badge tone={statusTone(run)} dot>
                        {getRunStatusLabel(run)}
                      </Badge>
                      {run.sample && getRunStatus(run) !== "sample" ? (
                        <Badge tone="purple">内置示例</Badge>
                      ) : null}
                      <Badge tone="outline">候选 {version.candidate}</Badge>
                      <span className="run-time">
                        {formatRelative(run.updatedAt)}
                      </span>
                    </div>
                    <h3>{run.title}</h3>
                    <p className="run-product">{run.input.brief.product}</p>
                    <div className="run-meta">
                      <span>{formatDateTime(run.createdAt)}</span>
                      <span>{run.versions.length} 个版本</span>
                      <span>{run.input.facts.length} 张事实卡</span>
                      <span>
                        规则 {ruleSummary.pass} 通过 / {ruleSummary.warn} 提醒 /{" "}
                        {ruleSummary.fail} 未通过
                      </span>
                      <span>
                        模型建议 {review?.modelIssues?.length ?? 0} 条
                      </span>
                      {confirmation ? <span>已人工确认</span> : null}
                    </div>
                  </div>
                  <div className="run-card-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openRun(run)}
                    >
                      打开
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(run)}
                      icon={<IconTrash size={14} />}
                      aria-label={`删除运行 ${run.title}`}
                    />
                  </div>
                </article>
              );
            })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="删除这条运行记录？"
        description="运行中的版本、审核、确认与导出记录都会一起删除，无法恢复。"
        confirmLabel="删除运行"
        onConfirm={() => {
          if (pendingDelete) {
            dispatch({ type: "DELETE_RUN", id: pendingDelete.id });
            toast("已删除运行记录。", "info");
          }
          setPendingDelete(null);
        }}
      >
        <p className="muted">{pendingDelete?.title}</p>
      </ConfirmModal>

      <ConfirmModal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="清空全部运行记录？"
        description="品牌和事实卡会保留，所有运行、审核、确认和评测记录会被删除。建议先导出全量数据。"
        confirmLabel="全部清空"
        onConfirm={() => {
          dispatch({ type: "CLEAR_HISTORY" });
          setClearOpen(false);
          toast("已清空运行与评测记录。", "info");
        }}
      />
    </section>
  );
}
