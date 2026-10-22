"use client";

import type {
  ApiError,
  DocumentVersion,
  Run,
  TitleCandidate,
} from "@/lib/domain/types";
import { charCount, formatDateTime } from "@/lib/format";
import { stripCitations } from "@/lib/review/citations";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconFileText,
  IconInfo,
  IconPlay,
  IconRefresh,
  IconSpark,
} from "@/components/ui/Icons";
import { CopyDocument } from "./CopyDocument";
import { ModelMetaLine } from "./ModelMetaLine";

function publishText(version: DocumentVersion): string {
  const lines = [
    version.title,
    "",
    stripCitations(version.body),
    "",
    version.tags.join(" "),
  ];
  if (version.imageSuggestion.length > 0) {
    lines.push("", "配图建议：");
    version.imageSuggestion.forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
  }
  return lines.join("\n").trim();
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: TitleCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`candidate-card ${selected ? "candidate-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="candidate-top">
        <span className={`candidate-badge candidate-${candidate.id.toLowerCase()}`}>
          {candidate.id}
        </span>
        <span className="candidate-angle">{candidate.angle}</span>
        {selected ? (
          <span className="candidate-selected-label">
            <IconCheck size={13} /> 当前版本
          </span>
        ) : (
          <span className="candidate-select-hint">选此标题</span>
        )}
      </span>
      <strong className="candidate-title">{candidate.title}</strong>
      <span className="candidate-meta">
        标题 {charCount(candidate.title)} 字
      </span>
      {candidate.rationale ? (
        <span className="candidate-reason">{candidate.rationale}</span>
      ) : null}
      {candidate.hypothesis ? (
        <span className="candidate-hypothesis">
          <span>待验证假设</span>
          {candidate.hypothesis}
        </span>
      ) : null}
    </button>
  );
}

export function GenerateStep({
  run,
  activeCandidate,
  activeVersion,
  onSwitchCandidate,
  onGenerate,
  generating,
  error,
  configured,
  healthLoading,
  onLoadSample,
  onNext,
  onBack,
  briefReady,
  factCount,
  campaignName,
  product,
}: {
  run: Run | null;
  activeCandidate: "A" | "B";
  activeVersion: DocumentVersion | null;
  onSwitchCandidate: (candidate: "A" | "B") => void;
  onGenerate: () => void;
  generating: boolean;
  error: ApiError | null;
  configured: boolean;
  healthLoading: boolean;
  onLoadSample: () => void;
  onNext: () => void;
  onBack: () => void;
  briefReady: boolean;
  factCount: number;
  campaignName: string;
  product: string;
}) {
  if (!run || !activeVersion) {
    return (
      <div className="step-grid">
        <section className="panel generate-empty-panel">
          <header className="panel-head">
            <div>
              <span className="section-kicker">STEP 03 · 生成</span>
              <h2>生成两个标题候选，共用一篇正文</h2>
              <p>
                模型会先用事实卡写出正文，再从“场景”和“人群需求”两个角度各写一个标题。两版正文、标签、配图建议保持一致，避免把变量混在一起。
              </p>
            </div>
            <Badge tone="outline">非 A/B 测试</Badge>
          </header>

          <div className="preflight-grid">
            <div className="preflight-item">
              <span className="preflight-icon">
                <IconFileText size={18} />
              </span>
              <div>
                <span>活动</span>
                <strong>{campaignName || "未填写活动名称"}</strong>
                <small>{product || "未填写推广对象"}</small>
              </div>
            </div>
            <div className="preflight-item">
              <span className="preflight-icon">
                <IconCheck size={18} />
              </span>
              <div>
                <span>事实依据</span>
                <strong>{factCount} 张事实卡</strong>
                <small>生成时会完整进入提示词</small>
              </div>
            </div>
            <div className="preflight-item">
              <span className="preflight-icon">
                <IconSpark size={18} />
              </span>
              <div>
                <span>模型连接</span>
                <strong>
                  {healthLoading
                    ? "检查中…"
                    : configured
                      ? "已配置"
                      : "未配置"}
                </strong>
                <small>密钥只从服务端读取</small>
              </div>
            </div>
          </div>

          {!healthLoading && !configured ? (
            <Notice tone="warning" title="还没有配置模型">
              <p>
                实时生成需要 <code>.env.local</code> 中的 <code>LLM_API_KEY</code>。
                你可以先加载内置示例运行，预览生成结果、规则检查和导出流程。
              </p>
              <pre className="code-block code-block-small">{`LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-你的密钥
LLM_MODEL=deepseek-chat`}</pre>
              <p className="muted">
                配置后重启 <code>npm run dev</code>，再刷新页面。
              </p>
            </Notice>
          ) : null}

          {error ? (
            <Notice tone="error" title={error.message}>
              {error.hint ? <p>{error.hint}</p> : null}
              <p className="muted">
                错误码：<code>{error.code}</code>
                {error.retryable ? " · 可以重试" : ""}
              </p>
              {error.raw ? (
                <details className="raw-details">
                  <summary>查看原始返回（用于排查）</summary>
                  <pre>{error.raw}</pre>
                </details>
              ) : null}
            </Notice>
          ) : null}

          <div className="generate-cta">
            <Button
              variant="primary"
              size="lg"
              onClick={onGenerate}
              loading={generating}
              disabled={!briefReady || factCount === 0 || healthLoading}
              icon={<IconPlay size={17} />}
            >
              {generating ? "正在生成…" : "生成两版标题候选"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={onLoadSample}
              icon={<IconFileText size={17} />}
            >
              加载内置示例运行
            </Button>
          </div>
          <p className="generate-note">
            <IconInfo size={14} />
            内置示例是人工编写的流程演示，会明确标注“非模型实时生成”；规则检查仍会真实运行。
          </p>

          <footer className="panel-actions">
            <Button
              variant="ghost"
              onClick={onBack}
              icon={<IconArrowLeft size={16} />}
            >
              返回选择依据
            </Button>
            <span className="autosave-note">
              {!briefReady
                ? "Brief 还有必填项未完成"
                : factCount === 0
                  ? "至少选择 1 张事实卡"
                  : "生成失败不会丢失当前输入"}
            </span>
          </footer>
        </section>

        <aside className="step-aside">
          <section className="panel aside-panel aside-sticky">
            <header className="aside-head">
              <span className="section-kicker">生成前检查</span>
              <h3>这条流程会做什么</h3>
            </header>
            <ol className="process-list">
              <li>
                <span className="process-index">1</span>
                <div>
                  <strong>写入品牌约束</strong>
                  <p>语气、必提关键词、禁用表达、写作规则。</p>
                </div>
              </li>
              <li>
                <span className="process-index">2</span>
                <div>
                  <strong>只给事实卡</strong>
                  <p>模型不得补充价格、日期、赠品或效果承诺。</p>
                </div>
              </li>
              <li>
                <span className="process-index">3</span>
                <div>
                  <strong>要求逐句引用</strong>
                  <p>正文事实后用 [F-编号] 标注，并给出原文摘录。</p>
                </div>
              </li>
              <li>
                <span className="process-index">4</span>
                <div>
                  <strong>自动跑规则</strong>
                  <p>生成完成后立即检查长度、必提、禁用、引用和数字依据。</p>
                </div>
              </li>
            </ol>
            <div className="aside-footnote-row">
              <IconInfo size={14} />
              <span>
                两版标题是候选素材，不预测点击率，也不声称做过线上 A/B 测试。
              </span>
            </div>
          </section>
        </aside>
      </div>
    );
  }

  const citations = activeVersion.citations;
  const generatedAt = run.generation.modelMeta?.at ?? run.createdAt;

  return (
    <div className="step-grid">
      <section className="panel generate-panel">
        <header className="panel-head generate-head">
          <div>
            <span className="section-kicker">STEP 03 · 生成结果</span>
            <h2>{run.input.brief.campaignName}</h2>
            <p>
              已生成两个标题候选，共用同一篇正文。点选标题即可切换当前版本；切换会产生新版本并需要重新审核。
            </p>
          </div>
          <div className="generate-head-actions">
            <ModelMetaLine
              meta={run.generation.modelMeta}
              sample={run.sample}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={onGenerate}
              loading={generating}
              icon={<IconRefresh size={15} />}
            >
              重新生成
            </Button>
          </div>
        </header>

        {run.sample ? (
          <Notice tone="warning" compact title="内置示例运行">
            这篇内容由项目内置的人工样例创建，不是本次模型实时生成。规则检查会照常运行；模型审核需要配置密钥后才可使用。
          </Notice>
        ) : null}

        {error ? (
          <Notice tone="error" title={error.message}>
            {error.hint ? <p>{error.hint}</p> : null}
            <p className="muted">错误码：{error.code}。已有运行没有被覆盖。</p>
          </Notice>
        ) : null}

        <div className="candidate-grid">
          {run.generation.titles.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              selected={candidate.id === activeCandidate}
              onSelect={() => onSwitchCandidate(candidate.id)}
            />
          ))}
        </div>

        <div className="candidate-explainer">
          <IconInfo size={15} />
          <span>
            两版只在标题角度上不同；正文、标签、配图建议和引用完全一致。这样可以先比较“说法”，而不是把多个变量混在一起。
          </span>
        </div>

        <CopyDocument
          title={activeVersion.title}
          body={activeVersion.body}
          tags={activeVersion.tags}
          imageSuggestion={activeVersion.imageSuggestion}
          citations={citations}
          facts={run.input.facts}
          actions={
            <CopyButton
              text={publishText(activeVersion)}
              label="复制发布文案"
              variant="ghost"
              size="sm"
            />
          }
        />

        {run.generation.selfCheck.length > 0 ? (
          <details className="self-check">
            <summary>
              模型自查说明（{run.generation.selfCheck.length} 条）
              <span className="summary-hint">模型自述，不等同于审核结论</span>
            </summary>
            <ul>
              {run.generation.selfCheck.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </details>
        ) : null}

        <footer className="panel-actions">
          <Button
            variant="ghost"
            onClick={onBack}
            icon={<IconArrowLeft size={16} />}
          >
            返回选择依据
          </Button>
          <div className="action-row">
            <span className="autosave-note">
              生成于 {formatDateTime(generatedAt)}
            </span>
            <Button
              variant="primary"
              onClick={onNext}
              trailingIcon={<IconArrowRight size={16} />}
            >
              进入校验与修订
            </Button>
          </div>
        </footer>
      </section>

      <aside className="step-aside">
        <section className="panel aside-panel aside-sticky">
          <header className="aside-head">
            <span className="section-kicker">本次生成</span>
            <h3>运行摘要</h3>
          </header>
          <dl className="summary-list">
            <div>
              <dt>候选</dt>
              <dd>
                候选 {activeCandidate} ·{" "}
                {run.generation.titles.find((item) => item.id === activeCandidate)
                  ?.angle ?? "未标注"}
              </dd>
            </div>
            <div>
              <dt>事实卡</dt>
              <dd>{run.input.facts.length} 张</dd>
            </div>
            <div>
              <dt>正文</dt>
              <dd>{charCount(activeVersion.body)} 字</dd>
            </div>
            <div>
              <dt>引用</dt>
              <dd>{citations.length} 条映射</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>v{run.versions.length}</dd>
            </div>
          </dl>
          <div className="aside-divider" />
          <p className="aside-help">
            “重新生成”会创建一条新的运行，不会覆盖当前这条。需要保留当前结果时，直接进入校验。
          </p>
          <Button
            variant="primary"
            block
            onClick={onNext}
            trailingIcon={<IconArrowRight size={16} />}
          >
            进入校验与修订
          </Button>
        </section>

        <section className="panel aside-panel aside-note">
          <span className="section-kicker">口径提醒</span>
          <p>
            {run.sample
              ? "这是内置示例，不能当作模型质量或真实投放结果。"
              : "引用可定位只表示能在事实卡快照中回查，不代表事实已在现实世界核实。"}
          </p>
        </section>
      </aside>
    </div>
  );
}
