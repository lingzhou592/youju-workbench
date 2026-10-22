"use client";

import { useMemo, useState } from "react";
import type { Run } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { buildPublishText, runToMarkdown } from "@/lib/export/markdown";
import { runToJson } from "@/lib/export/json";
import { buildFilename } from "@/lib/export/filename";
import { stripCitations } from "@/lib/review/citations";
import {
  getActiveVersion,
  getCurrentConfirmation,
  getCurrentReview,
  getModelReviewState,
  getVersionLabel,
} from "@/state/selectors";
import { summarizeRuleChecks } from "@/lib/review/rules";
import { useApp } from "@/state/AppStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconFileText,
  IconShield,
} from "@/components/ui/Icons";
import { CopyDocument } from "./CopyDocument";
import { ModelMetaLine } from "./ModelMetaLine";

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ExportStep({
  run,
  onBack,
  onGoReview,
}: {
  run: Run;
  onBack: () => void;
  onGoReview: () => void;
}) {
  const { toast } = useApp();
  const [tab, setTab] = useState<"publish" | "markdown" | "json">("publish");

  const version = getActiveVersion(run);
  const review = getCurrentReview(run, version);
  const confirmation = getCurrentConfirmation(run, version);
  const modelState = getModelReviewState(run, version);
  const ruleSummary = summarizeRuleChecks(review?.ruleChecks ?? []);
  const markdown = useMemo(
    () => runToMarkdown(run, version, review, confirmation),
    [run, version, review, confirmation],
  );
  const json = useMemo(
    () => JSON.stringify(runToJson(run, version, review, confirmation), null, 2),
    [run, version, review, confirmation],
  );
  const publishText = buildPublishText(version);
  const final = Boolean(confirmation);

  const handleDownloadMarkdown = () => {
    downloadFile(
      markdown,
      buildFilename(run, version, "md"),
      "text/markdown;charset=utf-8",
    );
    toast("已下载 Markdown 记录。", "success");
  };

  const handleDownloadJson = () => {
    downloadFile(
      json,
      buildFilename(run, version, "json"),
      "application/json;charset=utf-8",
    );
    toast("已下载 JSON 记录。", "success");
  };

  return (
    <div className="step-grid">
      <div className="export-main">
        <section className="panel export-header">
          <div>
            <span className="section-kicker">STEP 05 · 导出</span>
            <h2>把文案和判断一起交付</h2>
            <p>
              发布文案会去掉引用标记；完整记录保留引用、规则、模型建议、人工确认和修订历史，方便复核。
            </p>
          </div>
          <div className="export-header-status">
            <Badge tone={final ? "green" : "amber"} dot>
              {final ? "定稿" : "草稿"}
            </Badge>
            <span>{getVersionLabel(run, version)}</span>
          </div>
        </section>

        {!final ? (
          <Notice
            tone="warning"
            title="当前是未确认草稿"
            action={
              <Button variant="secondary" size="sm" onClick={onGoReview}>
                去人工确认
              </Button>
            }
          >
            仍可导出，但文件里会明确标注“未经人工确认”，不应直接发布。
          </Notice>
        ) : (
          <Notice tone="success" title="已完成人工确认">
            由当前版本的人工确认记录绑定；内容指纹{" "}
            {confirmation?.contentHash.slice(0, 8)}。如果之后修改文案，需要重新确认。
          </Notice>
        )}

        {run.sample ? (
          <Notice tone="warning" compact title="内置示例运行">
            本记录来自项目内置的人工样例，不是模型实时生成。导出物会保留此标记，不能作为模型质量证据。
          </Notice>
        ) : null}

        <section className="panel export-panel">
          <div className="export-toolbar">
            <div className="segmented-control">
              <button
                type="button"
                className={tab === "publish" ? "segment-active" : ""}
                onClick={() => setTab("publish")}
              >
                发布文案
              </button>
              <button
                type="button"
                className={tab === "markdown" ? "segment-active" : ""}
                onClick={() => setTab("markdown")}
              >
                Markdown 记录
              </button>
              <button
                type="button"
                className={tab === "json" ? "segment-active" : ""}
                onClick={() => setTab("json")}
              >
                JSON 数据
              </button>
            </div>
            <div className="export-toolbar-actions">
              <CopyButton
                text={publishText}
                label="复制发布文案"
                variant="ghost"
                size="sm"
              />
              <CopyButton
                text={markdown}
                label="复制完整记录"
                variant="ghost"
                size="sm"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadMarkdown}
                icon={<IconDownload size={15} />}
              >
                下载 .md
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadJson}
                icon={<IconDownload size={15} />}
              >
                下载 .json
              </Button>
            </div>
          </div>

          {tab === "publish" ? (
            <div className="export-preview-pane">
              <CopyDocument
                title={version.title}
                body={stripCitations(version.body)}
                tags={version.tags}
                imageSuggestion={version.imageSuggestion}
                citations={[]}
                facts={[]}
                kicker="发布用文案 · 已去除引用标记"
                showCitationTable={false}
              />
            </div>
          ) : null}

          {tab === "markdown" ? (
            <div className="export-preview-pane">
              <pre className="export-pre">{markdown}</pre>
            </div>
          ) : null}

          {tab === "json" ? (
            <div className="export-preview-pane">
              <pre className="export-pre export-pre-json">{json}</pre>
            </div>
          ) : null}
        </section>

        <section className="panel export-check-panel">
          <header className="panel-head compact-head">
            <div>
              <span className="section-kicker">导出前检查</span>
              <h2>这份记录包含了什么</h2>
            </div>
          </header>
          <div className="export-check-grid">
            <div className="export-check-item">
              <span className={`export-check-icon ${ruleSummary.blocking ? "icon-warn" : "icon-ok"}`}>
                {ruleSummary.blocking ? (
                  <IconAlert size={18} />
                ) : (
                  <IconCheck size={18} />
                )}
              </span>
              <div>
                <strong>规则检查</strong>
                <p>
                  {ruleSummary.pass} 通过 / {ruleSummary.warn} 提醒 /{" "}
                  {ruleSummary.fail} 未通过
                </p>
              </div>
            </div>
            <div className="export-check-item">
              <span
                className={`export-check-icon ${
                  modelState === "ok" ? "icon-ok" : "icon-warn"
                }`}
              >
                {modelState === "ok" ? (
                  <IconCheck size={18} />
                ) : (
                  <IconAlert size={18} />
                )}
              </span>
              <div>
                <strong>模型审核</strong>
                <p>
                  {modelState === "ok"
                    ? review?.modelIssues?.length
                      ? `已运行，${review.modelIssues.length} 条建议`
                      : "已运行，未提出待处理问题"
                    : modelState === "error"
                      ? "运行失败，记录已保留"
                      : "未运行"}
                </p>
              </div>
            </div>
            <div className="export-check-item">
              <span
                className={`export-check-icon ${
                  confirmation ? "icon-ok" : "icon-warn"
                }`}
              >
                {confirmation ? (
                  <IconShield size={18} />
                ) : (
                  <IconAlert size={18} />
                )}
              </span>
              <div>
                <strong>人工确认</strong>
                <p>
                  {confirmation
                    ? `${formatDateTime(confirmation.createdAt)} · 已确认`
                    : "尚未确认，导出物会标注草稿"}
                </p>
              </div>
            </div>
            <div className="export-check-item">
              <span className="export-check-icon icon-ok">
                <IconFileText size={18} />
              </span>
              <div>
                <strong>事实快照</strong>
                <p>{run.input.facts.length} 张事实卡，随运行冻结</p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel export-check-panel">
          <header className="panel-head compact-head">
            <div>
              <span className="section-kicker">引用清单</span>
              <h2>发布前可回查的事实</h2>
            </div>
            <Badge tone="outline">{version.citations.length} 条映射</Badge>
          </header>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>编号</th>
                  <th>事实卡</th>
                  <th>原文摘录</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                {version.citations.length > 0 ? (
                  version.citations.map((citation) => {
                    const fact = run.input.facts.find(
                      (item) => item.id === citation.factId,
                    );
                    return (
                      <tr key={citation.factId}>
                        <td>
                          <code>{citation.factId}</code>
                        </td>
                        <td>{fact?.title ?? "未在快照中找到"}</td>
                        <td className="quote-cell">
                          {citation.quote || (
                            <span className="text-warn">
                              未填写原文摘录
                            </span>
                          )}
                        </td>
                        <td>{fact?.sourceName ?? "—"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      这个版本还没有引用映射。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="panel review-footer">
          <Button
            variant="ghost"
            onClick={onBack}
            icon={<IconArrowLeft size={16} />}
          >
            返回校验
          </Button>
          <div className="action-row">
            {!final ? (
              <Button variant="secondary" onClick={onGoReview}>
                去人工确认
              </Button>
            ) : null}
            <Button
              variant="primary"
              onClick={handleDownloadMarkdown}
              icon={<IconDownload size={16} />}
            >
              下载完整记录
            </Button>
          </div>
        </footer>
      </div>

      <aside className="step-aside">
        <section className="panel aside-panel aside-sticky">
          <header className="aside-head">
            <span className="section-kicker">交付摘要</span>
            <h3>{run.input.brief.campaignName}</h3>
            <p>{run.input.brief.product}</p>
          </header>
          <dl className="summary-list">
            <div>
              <dt>状态</dt>
              <dd>{final ? "已人工确认定稿" : "未确认草稿"}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{getVersionLabel(run, version)}</dd>
            </div>
            <div>
              <dt>正文</dt>
              <dd>{version.body.replace(/\[F-\d{3}\]/g, "").length} 字</dd>
            </div>
            <div>
              <dt>引用</dt>
              <dd>{version.citations.length} 条</dd>
            </div>
            <div>
              <dt>模型</dt>
              <dd>
                {run.sample ? (
                  "内置示例"
                ) : (
                  <ModelMetaLine
                    meta={run.generation.modelMeta}
                    compact
                  />
                )}
              </dd>
            </div>
          </dl>
          <div className="aside-divider" />
          <ul className="export-manifest">
            <li>
              <IconCheck size={14} /> 发布文案（去引用）
            </li>
            <li>
              <IconCheck size={14} /> 完整正文与引用脚注
            </li>
            <li>
              <IconCheck size={14} /> 规则检查与模型建议
            </li>
            <li>
              <IconCheck size={14} /> 人工确认与修订历史
            </li>
            <li>
              <IconCheck size={14} /> Brief / 品牌 / 事实快照
            </li>
          </ul>
          <div className="aside-divider" />
          <Button
            variant="primary"
            block
            onClick={handleDownloadMarkdown}
            icon={<IconDownload size={16} />}
          >
            下载 Markdown 记录
          </Button>
          <Button
            variant="secondary"
            block
            onClick={handleDownloadJson}
            icon={<IconDownload size={16} />}
          >
            下载 JSON 数据
          </Button>
          <p className="aside-footnote">
            导出物中的事实卡为演示用模拟资料；“引用可定位”只表示能在本次运行的快照中回查。
          </p>
        </section>

        <section className="panel aside-panel aside-note">
          <span className="section-kicker">发布提醒</span>
          <p>
            发布到平台前，请使用“复制发布文案”或“发布文案”预览；完整记录用于内部审核和归档，不要把引用标记直接发到小红书。
          </p>
        </section>
      </aside>
    </div>
  );
}
