"use client";

import type { WorkbenchStepId } from "@/lib/domain/types";
import { IconCheck } from "@/components/ui/Icons";

const STEPS: Array<{
  id: WorkbenchStepId;
  label: string;
  hint: string;
}> = [
  { id: "brief", label: "Brief", hint: "活动与人群" },
  { id: "evidence", label: "依据", hint: "选事实卡" },
  { id: "generate", label: "生成", hint: "两版标题" },
  { id: "review", label: "校验与修订", hint: "三层检查" },
  { id: "export", label: "导出", hint: "带记录交付" },
];

export function Stepper({
  current,
  onSelect,
  canVisit,
}: {
  current: WorkbenchStepId;
  onSelect: (step: WorkbenchStepId) => void;
  canVisit: (step: WorkbenchStepId) => boolean;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav className="stepper" aria-label="创作流程">
      <ol>
        {STEPS.map((step, index) => {
          const active = step.id === current;
          const done = index < currentIndex;
          const reachable = canVisit(step.id);
          return (
            <li
              key={step.id}
              className={`${active ? "step-active" : ""} ${
                done ? "step-done" : ""
              } ${!reachable ? "step-disabled" : ""}`.trim()}
            >
              <button
                type="button"
                onClick={() => reachable && onSelect(step.id)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
              >
                <span className="step-index">
                  {done ? <IconCheck size={14} /> : index + 1}
                </span>
                <span className="step-copy">
                  <strong>{step.label}</strong>
                  <small>{step.hint}</small>
                </span>
              </button>
              {index < STEPS.length - 1 ? (
                <span className="step-line" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
