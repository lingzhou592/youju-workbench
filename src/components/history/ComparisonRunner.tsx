"use client";

import { useEffect, useRef, useState } from "react";
import type {
  EvaluationHumanScores,
  EvaluationRecord,
  TestCase,
} from "@/lib/domain/types";
import { formatDateTime, formatLatency } from "@/lib/format";
import { runComparisonCase } from "@/lib/evaluation/runComparison";
import { useApp } from "@/state/AppStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconCheck,
  IconDownload,
  IconPlay,
  IconRefresh,
  IconTrash,
} from "@/components/ui/Icons";
import { downloadText } from "@/lib/download";

function initialScores(record?: EvaluationRecord | null): EvaluationHumanScores {
  return (
    record?.human ?? {
      directFactual: null,
      workbenchFactual: null,
      directBrand: null,
      workbenchBrand: null,
      note: "",
    }
  );
}

function ScorePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="score-picker">
      <span>{label}</span>
      <div>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            className={value === score ? "score-active" : ""}
            onClick={() => onChange(score)}
            aria-label={`${label} ${score} 分`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function SideCard({
  kind,
  side,
}: {
  kind: "direct" | "workbench";
  side: EvaluationRecord["direct"];
}) {
  return (
    <article className={`panel comparison-side comparison-${kind}`}>
      <header className="comparison-side-head">
        <div>
          <span className="section-kicker">
            {kind === "direct" ? "BASELINE" : "WORKBENCH"}
          </span>
          <h3>
            {kind === "direct" ? "直接提示基线" : "工作台流程"}
          </h3>
        </div>
        <Badge tone={side.structureComplete ? "green" : "red"}>
          {side.structureComplete ? "结构完整" : "结构缺失"}
        </Badge>
      </header>

      <div className="comparison-metrics">
        <div>
          <span>规则</span>
          <strong>
            {side.passedRules}/{side.totalRules} 通过
          </strong>
        </div>
        <div>
          <span>引用有效</span>
          <strong>
            {side.citationValidRate === null
              ? "N/A"
              : `${Math.round(side.citationValidRate * 100)}%`}
          </strong>
        </div>
        <div>
          <span>无依据数字</span>
          <strong>{side.unsupportedNumberCount}</strong>
        </div>
        <div>
          <span>耗时</span>
          <strong>{formatLatency(side.latencyMs)}</strong>
        </div>
      </div>

      <div className="comparison-output">
        <span className="comparison-output-label">标题</span>
        <strong>{side.output.title || "（未解析到标题）"}</strong>
        <span className="comparison-output-label">正文摘录</span>
        <p>
          {side.output.body
            ? side.output.body.length > 260
              ? `${side.output.body.slice(0, 260)}…`
              : side.output.body
            : "（未解析到正文）"}
        </p>
        {side.output.tags.length > 0 ? (
          <div className="comparison-tags">
            {side.output.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
        {side.parseWarnings.length > 0 ? (
          <p className="comparison-warning">
            解析提示：{side.parseWarnings.join("；")}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function ComparisonRunner({
  comparisonCases,
  initialCaseId,
}: {
  comparisonCases: TestCase[];
  initialCaseId?: string;
}) {
  const { state, dispatch, health, toast } = useApp();
  const [caseId, setCaseId] = useState(
    initialCaseId ?? comparisonCases[0]?.id ?? "",
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EvaluationRecord | null>(null);
  const [scores, setScores] = useState<EvaluationHumanScores>(
    initialScores(null),
  );
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState("");
  const abortRef = useRef(false);

  useEffect(() => {
    if (!initialCaseId) return;
    setCaseId(initialCaseId);
    setResult(null);
    setError("");
    setScores(initialScores(null));
  }, [initialCaseId]);

  const handleCaseChange = (nextCaseId: string) => {
    setCaseId(nextCaseId);
    setResult(null);
    setError("");
    setScores(initialScores(null));
  };

  const selectedCase =
    comparisonCases.find((item) => item.id === caseId) ??
    comparisonCases[0];
  const configured = health?.configured === true;

  const runSingle = async () => {
    if (!selectedCase) return;
    setRunning(true);
    setError("");
    try {
      const record = await runComparisonCase({
        testCase: selectedCase,
        brand: state.brand,
        allFacts: state.facts,
      });
      dispatch({ type: "ADD_EVALUATION", evaluation: record });
      setResult(record);
      setScores(initialScores(record));
      toast("对照运行完成，已保存本次记录。", "success");
    } catch (runError) {
      const message =
        runError instanceof Error ? runError.message : "对照运行失败。";
      setError(message);
      toast(message, "error");
    } finally {
      setRunning(false);
    }
  };

  const runBatch = async () => {
    setBatchOpen(false);
    setBatchRunning(true);
    abortRef.current = false;
    setBatchDone(0);
    setError("");
    let completed = 0;

    for (const testCase of comparisonCases) {
      if (abortRef.current) break;
      setBatchCurrent(`${testCase.id} · ${testCase.title}`);
      try {
        const record = await runComparisonCase({
          testCase,
          brand: state.brand,
          allFacts: state.facts,
        });
        dispatch({ type: "ADD_EVALUATION", evaluation: record });
        completed += 1;
        setBatchDone(completed);
      } catch (runError) {
        const message =
          runError instanceof Error ? runError.message : "运行失败。";
        setError(`${testCase.id} 失败：${message}。已完成 ${completed} 条。`);
        break;
      }
    }

    setBatchRunning(false);
    setBatchCurrent("");
    toast(
      abortRef.current
        ? `已中止批量运行，完成 ${completed} 条。`
        : `批量运行结束，完成 ${completed} 条。`,
      abortRef.current ? "warning" : "success",
    );
  };

  const saveScores = () => {
    if (!result) return;
    const updated: EvaluationRecord = {
      ...result,
      human: {
        ...scores,
        note: scores.note.trim(),
      },
    };
    dispatch({ type: "UPDATE_EVALUATION", evaluation: updated });
    setResult(updated);
    toast("已保存人工评分与备注。", "success");
  };

  const loadRecord = (record: EvaluationRecord) => {
    setCaseId(record.testCaseId);
    setResult(record);
    setScores(initialScores(record));
    setError("");
  };

  const exportRecords = () => {
    downloadText(
      JSON.stringify(
        {
          schema: "youju.evaluations",
          exportedAt: new Date().toISOString(),
          model: state.evaluations[0]?.model ?? null,
          records: state.evaluations,
          note: "指标分开记录，不合成总分。Mock 结果不得作为模型质量证据。",
        },
        null,
        2,
      ),
      `有据_对照评测_${new Date().toISOString().slice(0, 10)}.json`,
      "application/json;charset=utf-8",
    );
    toast("已导出评测记录。", "success");
  };

  return (
    <section className="history-section comparison-layout">
      <div className="comparison-main">
        <div className="history-toolbar">
          <div>
            <h2>对照评测</h2>
            <p>
              同一个 Brief、同一批事实、同一模型与参数，对比“普通直接提示”和“完整工作台流程”。
              指标分开记录，不合成总分。
            </p>
          </div>
          <div className="history-toolbar-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBatchOpen(true)}
              disabled={!configured || batchRunning || running}
              icon={<IconPlay size={14} />}
            >
              批量运行 {comparisonCases.length} 条
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportRecords}
              disabled={state.evaluations.length === 0}
              icon={<IconDownload size={14} />}
            >
              导出记录
            </Button>
          </div>
        </div>

        {!configured ? (
          <Notice tone="warning" title="对照评测需要配置模型">
            <p>
              直接提示与工作台流程都会调用真实模型接口。没有密钥时，可以先在“规则演示”里查看离线规则引擎。
            </p>
            <pre className="code-block code-block-small">{`LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-你的密钥
LLM_MODEL=deepseek-chat`}</pre>
          </Notice>
        ) : null}

        <div className="comparison-case-picker">
          <label htmlFor="comparison-case">选择对照用例</label>
          <select
            id="comparison-case"
            value={caseId}
            onChange={(event) => handleCaseChange(event.target.value)}
            disabled={running || batchRunning}
          >
            {comparisonCases.map((testCase) => (
              <option key={testCase.id} value={testCase.id}>
                {testCase.id} · {testCase.title}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void runSingle()}
            loading={running}
            disabled={!configured || batchRunning}
            icon={<IconPlay size={14} />}
          >
            运行这条对照
          </Button>
        </div>

        {selectedCase ? (
          <div className="panel comparison-case-card">
            <div className="comparison-case-head">
              <div>
                <span className="section-kicker">{selectedCase.category}</span>
                <h3>{selectedCase.title}</h3>
                <p>{selectedCase.purpose}</p>
              </div>
              <div className="comparison-case-badges">
                <Badge tone={selectedCase.priority === "P0" ? "red" : "outline"}>
                  {selectedCase.priority}
                </Badge>
                <Badge tone="outline">
                  {selectedCase.factIds.length} 张事实卡
                </Badge>
              </div>
            </div>
            <div className="comparison-case-body">
              <div>
                <span>预期结果</span>
                <ul>
                  {selectedCase.expected.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {selectedCase.brief ? (
                <div>
                  <span>Brief</span>
                  <p>
                    {selectedCase.brief.campaignName} ·{" "}
                    {selectedCase.brief.product}
                  </p>
                  <p className="muted">
                    人群：{selectedCase.brief.audience}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {batchRunning ? (
          <div className="panel batch-progress">
            <div className="batch-progress-head">
              <strong>
                批量运行中 {batchDone}/{comparisonCases.length}
              </strong>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  abortRef.current = true;
                }}
              >
                中止
              </Button>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.round(
                    (batchDone / comparisonCases.length) * 100,
                  )}%`,
                }}
              />
            </div>
            <p className="muted">当前：{batchCurrent || "准备中…"}</p>
            <p className="aside-footnote">
              每条用例会调用两次模型（直接提示 + 工作台），请留意额度与耗时。
            </p>
          </div>
        ) : null}

        {error ? (
          <Notice tone="error" title="本次对照没有完成">
            {error}
          </Notice>
        ) : null}

        {result ? (
          <>
            <div className="comparison-grid">
              <SideCard kind="direct" side={result.direct} />
              <SideCard kind="workbench" side={result.workbench} />
            </div>

            <section className="panel comparison-score-panel">
              <header className="panel-head compact-head">
                <div>
                  <span className="section-kicker">HUMAN REVIEW</span>
                  <h2>人工判断</h2>
                  <p>
                    自动指标可复现，但不能判断“写得好不好”。请分别给事实支持与品牌适配打分，并写判断依据。
                  </p>
                </div>
                <Badge tone="outline">
                  {result.source === "mock" ? "本地 Mock" : "实时模型"} ·{" "}
                  {result.model}
                </Badge>
              </header>

              <div className="comparison-score-grid">
                <div>
                  <h3>直接提示基线</h3>
                  <ScorePicker
                    label="事实支持"
                    value={scores.directFactual}
                    onChange={(value) =>
                      setScores((current) => ({
                        ...current,
                        directFactual: value,
                      }))
                    }
                  />
                  <ScorePicker
                    label="品牌适配"
                    value={scores.directBrand}
                    onChange={(value) =>
                      setScores((current) => ({
                        ...current,
                        directBrand: value,
                      }))
                    }
                  />
                </div>
                <div>
                  <h3>工作台流程</h3>
                  <ScorePicker
                    label="事实支持"
                    value={scores.workbenchFactual}
                    onChange={(value) =>
                      setScores((current) => ({
                        ...current,
                        workbenchFactual: value,
                      }))
                    }
                  />
                  <ScorePicker
                    label="品牌适配"
                    value={scores.workbenchBrand}
                    onChange={(value) =>
                      setScores((current) => ({
                        ...current,
                        workbenchBrand: value,
                      }))
                    }
                  />
                </div>
              </div>

              <label className="rail-field comparison-note">
                <span>
                  判断备注 <small>记录评分依据与异常</small>
                </span>
                <textarea
                  value={scores.note}
                  onChange={(event) =>
                    setScores((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="例如：工作台版本引用齐全，但语气偏平；直接版本更自然，但编造了一个价格。"
                />
              </label>

              <footer className="panel-actions">
                <span className="autosave-note">
                  <IconAlert size={13} /> 人工评分只代表本次判断，不合成总分
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveScores}
                  icon={<IconCheck size={14} />}
                >
                  保存人工评分
                </Button>
              </footer>
            </section>
          </>
        ) : (
          <div className="panel comparison-placeholder">
            <IconRefresh size={22} />
            <strong>还没有本次运行结果</strong>
            <p>
              选择一条用例并点击“运行这条对照”。每次运行会同时调用直接提示与工作台流程，并把实际结果保存为评测记录。
            </p>
          </div>
        )}
      </div>

      <aside className="comparison-aside">
        <section className="panel aside-panel">
          <header className="aside-head">
            <span className="section-kicker">METHOD</span>
            <h3>评测口径</h3>
          </header>
          <ul className="compact-list">
            <li>同一 Brief、品牌、事实卡、模型与温度。</li>
            <li>直接提示也拿到完整资料，不故意写弱。</li>
            <li>结构、规则、引用、数字、耗时分别记录。</li>
            <li>事实支持与品牌适配由人工 1–5 分判断。</li>
            <li>不合成一个“总分”；单次结果不构成统计显著性。</li>
            <li>Mock 结果只用于联调，不作为模型质量证据。</li>
          </ul>
        </section>

        <section className="panel aside-panel">
          <header className="aside-head">
            <span className="section-kicker">RECORDS</span>
            <h3>已保存评测（{state.evaluations.length}）</h3>
            <p>点击任意记录可以重新查看两侧输出与人工评分。</p>
          </header>
          <div className="evaluation-record-list">
            {state.evaluations.length > 0 ? (
              state.evaluations.map((record) => (
                <div key={record.id} className="evaluation-record">
                  <div className="evaluation-record-top">
                    <code>{record.testCaseId}</code>
                    <Badge tone={record.source === "mock" ? "amber" : "green"}>
                      {record.source === "mock" ? "Mock" : "实时"}
                    </Badge>
                    <span>{formatDateTime(record.createdAt)}</span>
                  </div>
                  <strong>{record.testTitle}</strong>
                  <div className="evaluation-record-metrics">
                    <span>
                      规则 {record.direct.passedRules}/
                      {record.direct.totalRules} vs{" "}
                      {record.workbench.passedRules}/
                      {record.workbench.totalRules}
                    </span>
                    <span>
                      人工{" "}
                      {record.human.workbenchFactual ?? "—"}/
                      {record.human.workbenchBrand ?? "—"}
                    </span>
                  </div>
                  <div className="evaluation-record-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => loadRecord(record)}
                    >
                      查看
                    </button>
                    <button
                      type="button"
                      className="text-button text-muted"
                      onClick={() => {
                        dispatch({
                          type: "DELETE_EVALUATION",
                          id: record.id,
                        });
                        if (result?.id === record.id) setResult(null);
                        toast("已删除评测记录。", "info");
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="inline-empty">
                还没有评测记录。运行一次对照后，结果会保存在这里。
              </div>
            )}
          </div>
        </section>
      </aside>

      <ConfirmModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title={`批量运行 ${comparisonCases.length} 条对照？`}
        description="每条用例会调用两次模型（直接提示 + 工作台），共约 20 次调用。会消耗额度并需要数分钟；可以随时中止，已完成结果会保留。"
        confirmLabel="开始批量运行"
        tone="primary"
        onConfirm={() => void runBatch()}
      >
        <p className="muted">
          当前模型：{health?.model ?? "未配置"}。结果会标注为实时或 Mock，不合成总分。
        </p>
      </ConfirmModal>
    </section>
  );
}
