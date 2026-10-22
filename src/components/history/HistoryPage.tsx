"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { comparisonCases, testCases } from "@/lib/data/testCases";
import { useApp } from "@/state/AppStore";
import { TopBar } from "@/components/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconArrowLeft, IconClock, IconFileText, IconShield } from "@/components/ui/Icons";
import { ComparisonRunner } from "./ComparisonRunner";
import { RuleSandbox } from "./RuleSandbox";
import { RunList } from "./RunList";
import { TestCaseList } from "./TestCaseList";

type Tab = "runs" | "cases" | "comparison" | "sandbox";

export function HistoryPage() {
  const router = useRouter();
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>("runs");
  const [compareCaseId, setCompareCaseId] = useState<string | undefined>();

  const goCompare = (testCaseId: string) => {
    setCompareCaseId(testCaseId);
    setTab("comparison");
  };

  const tabs: Array<{
    id: Tab;
    label: string;
    hint: string;
    count?: number;
  }> = [
    {
      id: "runs",
      label: "运行记录",
      hint: "生成、审核与确认",
      count: state.runs.length,
    },
    {
      id: "cases",
      label: "测试用例",
      hint: "20 条覆盖清单",
      count: testCases.length,
    },
    {
      id: "comparison",
      label: "对照评测",
      hint: "直接提示 vs 工作台",
      count: state.evaluations.length,
    },
    {
      id: "sandbox",
      label: "规则演示",
      hint: "离线检查样例",
    },
  ];

  return (
    <>
      <TopBar
        eyebrow="HISTORY & EVALUATION"
        title="历史与评测"
        description="回看每次运行留下的证据，或者用同一批资料对照“直接提示”和“工作台流程”。所有指标分开记录，不合成总分。"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/")}
            icon={<IconArrowLeft size={15} />}
          >
            去工作台
          </Button>
        }
      />

      <div className="history-content">
        <nav className="history-tabs" aria-label="历史与评测分类">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "history-tab-active" : ""}
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
            >
              <span className="history-tab-icon">
                {item.id === "runs" ? (
                  <IconClock size={16} />
                ) : item.id === "comparison" ? (
                  <IconShield size={16} />
                ) : (
                  <IconFileText size={16} />
                )}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              {typeof item.count === "number" ? (
                <Badge tone="outline">{item.count}</Badge>
              ) : null}
            </button>
          ))}
        </nav>

        {tab === "runs" ? <RunList /> : null}
        {tab === "cases" ? (
          <TestCaseList testCases={testCases} onCompare={goCompare} />
        ) : null}
        {tab === "comparison" ? (
          <ComparisonRunner
            comparisonCases={comparisonCases}
            initialCaseId={compareCaseId}
          />
        ) : null}
        {tab === "sandbox" ? <RuleSandbox /> : null}
      </div>
    </>
  );
}
