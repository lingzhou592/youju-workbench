"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ApiError,
  ConfirmationRecord,
  DocumentVersion,
  ModelIssue,
  ReviewRecord,
  RuleCheck,
  Run,
} from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { canConfirm } from "@/state/selectors";
import { useApp } from "@/state/AppStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconCheck,
  IconInfo,
  IconRefresh,
  IconRobot,
  IconShield,
  IconUser,
} from "@/components/ui/Icons";

export type ReviewTab = "rules" | "model" | "human";

function severityTone(severity: ModelIssue["severity"]) {
  return severity === "error"
    ? ("red" as const)
    : severity === "warning"
      ? ("amber" as const)
      : ("blue" as const);
}

function severityLabel(severity: ModelIssue["severity"]) {
  return severity === "error" ? "严重" : severity === "warning" ? "提醒" : "建议";
}

function confidenceLabel(confidence: ModelIssue["confidence"]) {
  return confidence === "high"
    ? "自评置信度：高"
    : confidence === "low"
      ? "自评置信度：低"
      : "自评置信度：中";
}

function RuleIcon({ status }: { status: RuleCheck["status"] }) {
  if (status === "pass") return <IconCheck size={15} />;
  if (status === "warn") return <IconInfo size={15} />;
  return <IconAlert size={15} />;
}

function RuleRows({ checks }: { checks: RuleCheck[] }) {
  const order = { fail: 0, warn: 1, pass: 2 };
  const sorted = [...checks].sort(
    (a, b) => order[a.status] - order[b.status],
  );
  const visible = sorted.filter((check) => check.status !== "pass");
  const passed = sorted.filter((check) => check.status === "pass");

  return (
    <div className="rule-list">
      {visible.map((check) => (
        <div key={check.id} className={`rule-row rule-${check.status}`}>
          <span className="rule-icon">
            <RuleIcon status={check.status} />
          </span>
          <div className="rule-copy">
            <div className="rule-title-row">
              <strong>{check.label}</strong>
              <Badge
                tone={
                  check.status === "fail"
                    ? "red"
                    : check.status === "warn"
                      ? "amber"
                      : "green"
                }
              >
                {check.status === "fail"
                  ? "未通过"
                  : check.status === "warn"
                    ? "提醒"
                    : "通过"}
              </Badge>
            </div>
            <p>{check.detail}</p>
            {check.evidence ? (
              <pre className="rule-evidence">{check.evidence}</pre>
            ) : null}
          </div>
        </div>
      ))}
      {passed.length > 0 ? (
        <details className="passed-rules">
          <summary>
            已通过 {passed.length} 项
            <span className="summary-hint">点开查看明细</span>
          </summary>
          {passed.map((check) => (
            <div key={check.id} className="rule-row rule-pass">
              <span className="rule-icon">
                <RuleIcon status="pass" />
              </span>
              <div className="rule-copy">
                <div className="rule-title-row">
                  <strong>{check.label}</strong>
                  <Badge tone="green">通过</Badge>
                </div>
                <p>{check.detail}</p>
              </div>
            </div>
          ))}
        </details>
      ) : null}
    </div>
  );
}

export function ReviewRail({
  run,
  version,
  review,
  ruleChecks,
  ruleSummary,
  confirmation,
  activeTab,
  onTabChange,
  selectedIssueIds,
  onToggleIssue,
  onSelectAllOpen,
  onRunReview,
  reviewing,
  reviewError,
  onDismissIssue,
  onResolveIssue,
  onConfirm,
  onGoExport,
}: {
  run: Run;
  version: DocumentVersion;
  review?: ReviewRecord;
  ruleChecks: RuleCheck[];
  ruleSummary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
    blocking: boolean;
    status: "pass" | "warn" | "fail";
  };
  confirmation?: ConfirmationRecord;
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  selectedIssueIds: string[];
  onToggleIssue: (id: string) => void;
  onSelectAllOpen: () => void;
  onRunReview: () => void;
  reviewing: boolean;
  reviewError: ApiError | null;
  onDismissIssue: (issueId: string, reason: string) => void;
  onResolveIssue: (issueId: string) => void;
  onConfirm: (
    checklist: {
      factsAccurate: boolean;
      toneFits: boolean;
      informationComplete: boolean;
      readyToPublish: boolean;
      modelAcknowledged?: boolean;
    },
    note: string,
    overrideReason: string,
  ) => void;
  onGoExport: () => void;
}) {
  const { health } = useApp();
  const [checklist, setChecklist] = useState({
    factsAccurate: false,
    toneFits: false,
    informationComplete: false,
    readyToPublish: false,
    modelAcknowledged: false,
  });
  const [note, setNote] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [dismissIssue, setDismissIssue] = useState<ModelIssue | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [confirmAttempted, setConfirmAttempted] = useState(false);

  useEffect(() => {
    setChecklist({
      factsAccurate: false,
      toneFits: false,
      informationComplete: false,
      readyToPublish: false,
      modelAcknowledged: false,
    });
    setNote("");
    setOverrideReason("");
    setConfirmAttempted(false);
    setDismissIssue(null);
  }, [version.id, version.contentHash]);

  const modelIssues = review?.modelIssues ?? [];
  const openIssues = modelIssues.filter((issue) => issue.status === "open");
  const modelReviewed =
    review?.modelIssues !== null && review?.modelIssues !== undefined;
  const modelError = review?.modelError ?? null;
  const modelTabCount = !review
    ? "未运行"
    : review.modelIssues === null
      ? review.modelError
        ? "运行失败"
        : "未运行"
      : `${openIssues.length} 待处理`;
  const confirmState = useMemo(
    () =>
      canConfirm({
        checklist,
        note,
        ruleSummary,
        overrideReason,
        modelReviewed,
      }),
    [checklist, note, ruleSummary, overrideReason, modelReviewed],
  );

  const setCheck = (key: keyof typeof checklist, value: boolean) => {
    setChecklist((current) => ({ ...current, [key]: value }));
  };

  const handleConfirm = () => {
    setConfirmAttempted(true);
    if (!confirmState.ok) return;
    onConfirm(
      checklist,
      note.trim(),
      ruleSummary.blocking ? overrideReason.trim() : "",
    );
  };

  const tabs: Array<{
    id: ReviewTab;
    label: string;
    count: string;
    icon: typeof IconShield;
  }> = [
    {
      id: "rules",
      label: "规则",
      count: `${ruleSummary.fail} 未通过`,
      icon: IconShield,
    },
    {
      id: "model",
      label: "模型建议",
      count: modelTabCount,
      icon: IconRobot,
    },
    {
      id: "human",
      label: "人工确认",
      count: confirmation ? "已确认" : "待确认",
      icon: IconUser,
    },
  ];

  return (
    <section className="panel review-rail" aria-label="校验与确认">
      <header className="rail-head">
        <div>
          <span className="section-kicker">REVIEW</span>
          <h2>校验与确认</h2>
        </div>
        <Badge
          tone={
            confirmation
              ? "green"
              : ruleSummary.blocking
                ? "red"
                : ruleSummary.warn > 0
                  ? "amber"
                  : "green"
          }
          dot
        >
          {confirmation
            ? "已确认"
            : ruleSummary.blocking
              ? "有未通过项"
              : ruleSummary.warn > 0
                ? "有提醒"
                : "规则通过"}
        </Badge>
      </header>

      <div className="rule-summary-bar" aria-label="规则检查汇总">
        <span
          className="rule-summary-fail"
          style={{ flex: Math.max(ruleSummary.fail, 0) }}
        />
        <span
          className="rule-summary-warn"
          style={{ flex: Math.max(ruleSummary.warn, 0) }}
        />
        <span
          className="rule-summary-pass"
          style={{ flex: Math.max(ruleSummary.pass, 0) }}
        />
      </div>
      <div className="rule-summary-labels">
        <span>
          <i className="dot-fail" /> {ruleSummary.fail} 未通过
        </span>
        <span>
          <i className="dot-warn" /> {ruleSummary.warn} 提醒
        </span>
        <span>
          <i className="dot-pass" /> {ruleSummary.pass} 通过
        </span>
      </div>

      <nav className="rail-tabs" aria-label="校验分类">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "rail-tab-active" : ""}
              onClick={() => onTabChange(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <small>{tab.count}</small>
            </button>
          );
        })}
      </nav>

      <div className="rail-body">
        {activeTab === "rules" ? (
          <div className="rail-section">
            <div className="rail-section-head">
              <div>
                <h3>程序规则检查</h3>
                <p>
                  自动运行，结果确定、可复现。编辑或修订后会重新检查。
                </p>
              </div>
              <Badge tone="outline">v{RULE_VERSION_SHORT}</Badge>
            </div>
            <RuleRows checks={ruleChecks} />
            <p className="rail-footnote">
              规则只覆盖长度、关键词、引用编号、数字字符串等可确定项；不判断事实是否在现实中成立。
            </p>
          </div>
        ) : null}

        {activeTab === "model" ? (
          <div className="rail-section">
            <div className="rail-section-head">
              <div>
                <h3>模型辅助审核</h3>
                <p>
                  指出语气、人群匹配、事实支撑等问题，作为人工判断的线索，不是平台审核结论。
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onRunReview}
                loading={reviewing}
                icon={<IconRefresh size={14} />}
              >
                {modelReviewed ? "重新审核" : "运行审核"}
              </Button>
            </div>

            {!health?.configured ? (
              <Notice tone="info" compact>
                未配置模型密钥时无法运行模型审核。你仍然可以人工确认，但需要勾选“已知晓模型审核未完成”。
              </Notice>
            ) : null}

            {reviewError ? (
              <Notice tone="error" title={reviewError.message}>
                {reviewError.hint ? <p>{reviewError.hint}</p> : null}
                <p className="muted">错误码：{reviewError.code}</p>
              </Notice>
            ) : null}

            {!reviewError && modelError ? (
              <Notice tone="error" title={modelError.message}>
                {modelError.hint ? <p>{modelError.hint}</p> : null}
                <p className="muted">错误码：{modelError.code}</p>
              </Notice>
            ) : null}

            {!modelReviewed && !reviewing && !modelError ? (
              <div className="rail-empty">
                <IconRobot size={22} />
                <strong>这个版本还没有模型审核</strong>
                <p>
                  规则检查已经完成。运行模型审核后，可以勾选问题做定向修订。
                </p>
              </div>
            ) : null}

            {modelReviewed && modelIssues.length === 0 ? (
              <Notice tone="success" compact title="模型没有提出待处理问题">
                这只代表本次模型未发现问题，不等于内容一定准确。请继续人工确认。
              </Notice>
            ) : null}

            {openIssues.length > 0 ? (
              <>
                <div className="issue-toolbar">
                  <span>{openIssues.length} 条待处理</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={onSelectAllOpen}
                  >
                    全选待处理
                  </button>
                </div>
                <div className="issue-list">
                  {modelIssues.map((issue) => {
                    const selected = selectedIssueIds.includes(issue.id);
                    const isOpen = issue.status === "open";
                    return (
                      <article
                        key={issue.id}
                        className={`issue-card ${
                          selected ? "issue-selected" : ""
                        } ${!isOpen ? "issue-closed" : ""}`}
                      >
                        <div className="issue-top">
                          {isOpen ? (
                            <label className="issue-check">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => onToggleIssue(issue.id)}
                              />
                              <span>选入修订</span>
                            </label>
                          ) : (
                            <Badge
                              tone={issue.status === "resolved" ? "green" : "neutral"}
                            >
                              {issue.status === "resolved" ? "已处理" : "已忽略"}
                            </Badge>
                          )}
                          <Badge tone={severityTone(issue.severity)}>
                            {severityLabel(issue.severity)}
                          </Badge>
                          <Badge tone="outline">{issue.category}</Badge>
                          <span className="issue-confidence">
                            {confidenceLabel(issue.confidence)}
                          </span>
                        </div>
                        {issue.quote ? (
                          <blockquote className="issue-quote">
                            {issue.quote}
                          </blockquote>
                        ) : null}
                        <p className="issue-problem">{issue.problem}</p>
                        {issue.suggestion ? (
                          <p className="issue-suggestion">
                            <span>建议</span>
                            {issue.suggestion}
                          </p>
                        ) : null}
                        {issue.evidenceFactIds.length > 0 ? (
                          <div className="issue-evidence">
                            <span>依据</span>
                            {issue.evidenceFactIds.map((id) => (
                              <code key={id}>{id}</code>
                            ))}
                          </div>
                        ) : null}
                        {isOpen ? (
                          <div className="issue-actions">
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => onResolveIssue(issue.id)}
                            >
                              标记已处理
                            </button>
                            <button
                              type="button"
                              className="text-button text-muted"
                              onClick={() => {
                                setDismissIssue(issue);
                                setDismissReason("");
                              }}
                            >
                              忽略
                            </button>
                          </div>
                        ) : issue.dismissReason ? (
                          <p className="issue-dismiss-reason">
                            忽略原因：{issue.dismissReason}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}

            <p className="rail-footnote">
              置信度是模型自评，未校准；模型可能漏判或误判，最终由人工负责。
            </p>
          </div>
        ) : null}

        {activeTab === "human" ? (
          <div className="rail-section">
            {confirmation ? (
              <div className="confirmation-card">
                <div className="confirmation-head">
                  <span className="confirmation-icon">
                    <IconCheck size={20} />
                  </span>
                  <div>
                    <h3>已人工确认</h3>
                    <p>{formatDateTime(confirmation.createdAt)}</p>
                  </div>
                </div>
                <ul className="confirmation-list">
                  <li>事实准确：{confirmation.checklist.factsAccurate ? "是" : "否"}</li>
                  <li>语气符合品牌：{confirmation.checklist.toneFits ? "是" : "否"}</li>
                  <li>
                    信息完整：{confirmation.checklist.informationComplete ? "是" : "否"}
                  </li>
                  <li>
                    适合实际发布：{confirmation.checklist.readyToPublish ? "是" : "否"}
                  </li>
                </ul>
                <div className="confirmation-note">
                  <span>备注</span>
                  <p>{confirmation.note}</p>
                </div>
                {confirmation.overrideReason ? (
                  <div className="confirmation-note">
                    <span>规则未通过仍确认的原因</span>
                    <p>{confirmation.overrideReason}</p>
                  </div>
                ) : null}
                <div className="confirmation-hash">
                  版本 {version.candidate} · 内容指纹{" "}
                  {version.contentHash.slice(0, 8)}
                </div>
                <Button
                  variant="primary"
                  block
                  onClick={onGoExport}
                  icon={<IconCheck size={16} />}
                >
                  去导出
                </Button>
                <p className="rail-footnote">
                  修改文案或切换候选会创建新版本，旧确认不会继承。
                </p>
              </div>
            ) : (
              <>
                <div className="rail-section-head">
                  <div>
                    <h3>人工确认</h3>
                    <p>
                      确认会绑定当前版本与内容指纹。你需要对事实、语气和发布判断负责。
                    </p>
                  </div>
                </div>

                <div className="confirm-checklist">
                  {[
                    ["factsAccurate", "我已核对价格、时间、地点、人数等事实。"],
                    ["toneFits", "文案语气符合品牌调性，没有夸张或口号化。"],
                    ["informationComplete", "必提信息、标签和配图建议完整。"],
                    ["readyToPublish", "这篇内容适合实际发布，不需要再大改。"],
                  ].map(([key, label]) => (
                    <label key={key} className="confirm-check">
                      <input
                        type="checkbox"
                        checked={checklist[key as keyof typeof checklist]}
                        onChange={(event) =>
                          setCheck(
                            key as keyof typeof checklist,
                            event.target.checked,
                          )
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  {!modelReviewed ? (
                    <label className="confirm-check confirm-check-warning">
                      <input
                        type="checkbox"
                        checked={checklist.modelAcknowledged}
                        onChange={(event) =>
                          setCheck("modelAcknowledged", event.target.checked)
                        }
                      />
                      <span>
                        已知晓模型审核未完成，仍由人工承担判断责任。
                      </span>
                    </label>
                  ) : null}
                </div>

                <label className="rail-field">
                  <span>
                    确认备注 <small>至少 10 字</small>
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder="例如：已核对 39 元学生价与 10 月 24/25 日场次；语气符合朋友邀约的设定。"
                  />
                </label>

                {ruleSummary.blocking ? (
                  <Notice tone="warning" compact title="仍有规则未通过">
                    <p>
                      你可以基于人工判断继续确认，但必须写清楚为什么这些未通过项可以接受。
                    </p>
                    <label className="rail-field">
                      <span>确认理由</span>
                      <textarea
                        value={overrideReason}
                        onChange={(event) =>
                          setOverrideReason(event.target.value)
                        }
                        rows={3}
                        placeholder="例如：缺失的“实际”一词已通过人工核对，正文中的“以现场为准”表达了同一含义。"
                      />
                    </label>
                  </Notice>
                ) : null}

                {confirmAttempted && !confirmState.ok ? (
                  <Notice tone="error" compact title="还不能确认">
                    <ul className="compact-list">
                      {confirmState.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </Notice>
                ) : null}

                <Button
                  variant="primary"
                  block
                  onClick={handleConfirm}
                  icon={<IconShield size={16} />}
                >
                  确认当前版本
                </Button>
                <p className="rail-footnote">
                  当前版本：候选 {version.candidate} ·{" "}
                  {version.contentHash.slice(0, 8)}；确认后修改会重新走审核。
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(dismissIssue)}
        onClose={() => setDismissIssue(null)}
        title="忽略这条模型建议"
        description="忽略会保留记录，之后仍可在历史中看到。请写清楚判断依据。"
        size="sm"
        footer={
          <div className="modal-footer-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissIssue(null)}
            >
              取消
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={dismissReason.trim().length < 4}
              onClick={() => {
                if (!dismissIssue) return;
                onDismissIssue(dismissIssue.id, dismissReason.trim());
                setDismissIssue(null);
              }}
            >
              确认忽略
            </Button>
          </div>
        }
      >
        <label className="rail-field">
          <span>
            忽略原因 <small>至少 4 字</small>
          </span>
          <textarea
            value={dismissReason}
            onChange={(event) => setDismissReason(event.target.value)}
            rows={4}
            placeholder="例如：这句话是品牌固定说法，已由运营负责人确认。"
          />
        </label>
      </Modal>
    </section>
  );
}

const RULE_VERSION_SHORT = "1.0";
