"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ApiError,
  Brief,
  BriefTemplate,
  GenerateResponse,
  Run,
} from "@/lib/domain/types";
import { postJson } from "@/lib/api/client";
import { makeRun, switchCandidate } from "@/lib/domain/factories";
import { createSampleRun } from "@/lib/data/sampleRun";
import { demoBriefs } from "@/lib/data/demoBriefs";
import { rankFacts } from "@/lib/retrieval/rank";
import { getActiveVersion } from "@/state/selectors";
import { useApp } from "@/state/AppStore";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { IconArrowRight, IconFileText } from "@/components/ui/Icons";
import { TopBar } from "@/components/TopBar";
import { BriefStep } from "./BriefStep";
import { EvidenceStep } from "./EvidenceStep";
import { ExportStep } from "./ExportStep";
import { GenerateStep } from "./GenerateStep";
import { ReviewStep } from "./ReviewStep";
import { Stepper } from "./Stepper";

const REQUIRED_FIELDS: Array<{ key: keyof Brief; label: string }> = [
  { key: "campaignName", label: "活动名称" },
  { key: "product", label: "推广对象" },
  { key: "goal", label: "活动目标" },
  { key: "audience", label: "目标人群" },
  { key: "sellingPoints", label: "核心卖点" },
];

function validateBrief(brief: Brief): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of REQUIRED_FIELDS) {
    if (!brief[field.key]?.trim()) {
      errors[field.key] = `请填写${field.label}。`;
    }
  }
  return errors;
}

export function Workbench() {
  const router = useRouter();
  const { state, dispatch, activeRun, health, healthLoading, toast } =
    useApp();
  const { workbench, brand, facts } = state;
  const [briefErrors, setBriefErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<ApiError | null>(null);

  const brief = workbench.brief;
  const step = workbench.step;
  const selectedFacts = useMemo(
    () =>
      facts.filter((fact) => workbench.selectedFactIds.includes(fact.id)),
    [facts, workbench.selectedFactIds],
  );
  const ranked = useMemo(() => rankFacts(facts, brief), [facts, brief]);
  const activeVersion = activeRun ? getActiveVersion(activeRun) : null;
  const briefReady = Object.keys(validateBrief(brief)).length === 0;
  const activeTemplateId =
    demoBriefs.find(
      (template) => template.brief.campaignName === brief.campaignName,
    )?.id ?? null;

  useEffect(() => {
    if ((step === "review" || step === "export") && !activeRun) {
      dispatch({ type: "SET_STEP", step: "brief" });
    }
  }, [step, activeRun, dispatch]);

  const canVisit = (target: string) => {
    if (target === "brief" || target === "evidence") return true;
    if (target === "generate") return selectedFacts.length > 0;
    if (target === "review" || target === "export") return Boolean(activeRun);
    return false;
  };

  const goStep = (target: typeof step) => {
    if (!canVisit(target)) {
      toast(
        target === "generate"
          ? "请先选择至少 1 张事实卡。"
          : "请先生成一份可校验的文案。",
        "warning",
      );
      return;
    }
    dispatch({ type: "SET_STEP", step: target });
  };

  const updateBrief = (patch: Partial<Brief>) => {
    dispatch({ type: "SET_BRIEF", brief: { ...brief, ...patch } });
    setBriefErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  const loadTemplate = (template: BriefTemplate) => {
    dispatch({ type: "SET_ACTIVE_RUN", id: null });
    dispatch({ type: "SET_BRIEF", brief: { ...template.brief } });
    dispatch({
      type: "SET_SELECTED_FACTS",
      ids: [...template.recommendedFactIds],
    });
    dispatch({ type: "SET_STEP", step: "brief" });
    setBriefErrors({});
    setGenerateError(null);
    toast(
      `已载入示例「${template.label}」，并选好 ${template.recommendedFactIds.length} 张推荐事实卡。`,
      "success",
    );
  };

  const handleBriefNext = () => {
    const errors = validateBrief(brief);
    setBriefErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast("还有必填项没有完成，请先补充。", "warning");
      return;
    }
    goStep("evidence");
  };

  const handleEvidenceNext = () => {
    if (selectedFacts.length === 0) {
      toast("至少选择 1 张事实卡作为依据。", "warning");
      return;
    }
    goStep("generate");
  };

  const handleGenerate = async () => {
    const errors = validateBrief(brief);
    setBriefErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast("Brief 还有必填项没有完成。", "warning");
      dispatch({ type: "SET_STEP", step: "brief" });
      return;
    }
    if (selectedFacts.length === 0) {
      toast("至少选择 1 张事实卡。", "warning");
      dispatch({ type: "SET_STEP", step: "evidence" });
      return;
    }

    setGenerating(true);
    setGenerateError(null);
    const response = await postJson<GenerateResponse>("/api/generate", {
      brief,
      brand,
      facts: selectedFacts,
    });
    setGenerating(false);

    if (!response.ok) {
      setGenerateError(response.error);
      toast(response.error.message, "error");
      return;
    }

    const run: Run = makeRun({
      brief,
      brand,
      facts: selectedFacts,
      generation: response.data.generation,
      candidate: workbench.activeCandidate,
    });
    dispatch({ type: "ADD_RUN", run });
    dispatch({ type: "SET_STEP", step: "generate" });
    toast(
      `已生成两个标题候选，并完成 ${response.data.ruleChecks.length} 项规则检查。`,
      "success",
    );
  };

  const handleLoadSample = () => {
    const run = createSampleRun();
    dispatch({ type: "ADD_RUN", run });
    dispatch({ type: "SET_STEP", step: "review" });
    toast(
      "已加载内置示例运行（非模型实时生成），规则检查已真实运行。",
      "info",
    );
  };

  const handleRunChange = (nextRun: Run) => {
    dispatch({ type: "UPDATE_RUN", run: nextRun });
  };

  const renderStep = () => {
    if (step === "brief") {
      return (
        <BriefStep
          brief={brief}
          onChange={updateBrief}
          errors={briefErrors}
          templates={demoBriefs}
          activeTemplateId={activeTemplateId}
          onLoadTemplate={loadTemplate}
          onNext={handleBriefNext}
          selectedFactCount={selectedFacts.length}
          hasRun={Boolean(activeRun)}
        />
      );
    }

    if (step === "evidence") {
      return (
        <EvidenceStep
          brief={brief}
          ranked={ranked}
          selectedIds={workbench.selectedFactIds}
          onToggle={(id) => {
            const current = workbench.selectedFactIds;
            dispatch({
              type: "SET_SELECTED_FACTS",
              ids: current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
            });
          }}
          onSetSelection={(ids) =>
            dispatch({ type: "SET_SELECTED_FACTS", ids })
          }
          onBack={() => goStep("brief")}
          onNext={handleEvidenceNext}
          onOpenSources={() => router.push("/sources")}
        />
      );
    }

    if (step === "generate") {
      return (
        <GenerateStep
          run={activeRun}
          activeCandidate={
            activeVersion?.candidate ?? workbench.activeCandidate
          }
          activeVersion={activeVersion}
          onSwitchCandidate={(candidate) => {
            if (!activeRun) {
              dispatch({ type: "SET_ACTIVE_CANDIDATE", candidate });
              return;
            }
            if (activeVersion?.candidate === candidate) return;
            const result = switchCandidate(activeRun, candidate);
            if (result.changed) {
              dispatch({ type: "UPDATE_RUN", run: result.run });
              toast(
                `已切换到候选 ${candidate}，并创建新版本；需要重新审核。`,
                "info",
              );
            }
          }}
          onGenerate={() => void handleGenerate()}
          generating={generating}
          error={generateError}
          configured={health?.configured === true}
          healthLoading={healthLoading}
          onLoadSample={handleLoadSample}
          onNext={() => goStep("review")}
          onBack={() => goStep("evidence")}
          briefReady={briefReady}
          factCount={selectedFacts.length}
          campaignName={brief.campaignName}
          product={brief.product}
        />
      );
    }

    if (step === "review") {
      if (!activeRun) {
        return (
          <section className="panel missing-run">
            <h2>还没有可校验的文案</h2>
            <p>先完成 Brief、选择依据并生成，或者加载内置示例运行。</p>
            <div className="action-row">
              <Button
                variant="primary"
                onClick={() => goStep("brief")}
                trailingIcon={<IconArrowRight size={16} />}
              >
                回到 Brief
              </Button>
              <Button
                variant="secondary"
                onClick={handleLoadSample}
                icon={<IconFileText size={16} />}
              >
                加载内置示例
              </Button>
            </div>
          </section>
        );
      }
      return (
        <ReviewStep
          run={activeRun}
          onRunChange={handleRunChange}
          onNext={() => goStep("export")}
          onBack={() => goStep("generate")}
        />
      );
    }

    if (!activeRun) {
      return (
        <section className="panel missing-run">
          <h2>还没有可导出的记录</h2>
          <p>先完成一次生成与人工确认，或者加载内置示例运行。</p>
          <Button variant="primary" onClick={() => goStep("brief")}>
            回到 Brief
          </Button>
        </section>
      );
    }

    return (
      <ExportStep
        run={activeRun}
        onBack={() => goStep("review")}
        onGoReview={() => goStep("review")}
      />
    );
  };

  return (
    <>
      <TopBar
        eyebrow="WORKBENCH"
        title="创作工作台"
        description="从一句 Brief 到可交付文案，每一步都留下依据、判断和版本。"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/history")}
            icon={<IconFileText size={15} />}
          >
            历史记录
          </Button>
        }
      />

      <div className="workbench-content">
        <Stepper current={step} onSelect={goStep} canVisit={canVisit} />

        {activeRun && (step === "brief" || step === "evidence") ? (
          <Notice
            tone="info"
            compact
            title={`当前有一份已生成的运行：${activeRun.title}`}
          >
            这里的修改只用于下一次生成，不会改变已有运行的 Brief、事实卡或审核记录。
            <button
              type="button"
              className="text-button"
              onClick={() => goStep("review")}
            >
              查看当前运行
            </button>
          </Notice>
        ) : null}

        {renderStep()}
      </div>
    </>
  );
}
