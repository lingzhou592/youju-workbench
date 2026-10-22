"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TestCase } from "@/lib/domain/types";
import { useApp } from "@/state/AppStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import {
  IconArrowRight,
  IconFileText,
  IconInfo,
} from "@/components/ui/Icons";

const CATEGORIES = [
  "全部",
  "正常生成",
  "受众差异",
  "必填缺失",
  "资料不足",
  "资料冲突",
  "诱导编造",
  "必提/禁用",
  "引用缺失",
  "人工编辑后重检",
  "API 异常",
];

export function TestCaseList({
  testCases,
  onCompare,
}: {
  testCases: TestCase[];
  onCompare: (testCaseId: string) => void;
}) {
  const router = useRouter();
  const { dispatch, toast } = useApp();
  const [category, setCategory] = useState("全部");
  const [priority, setPriority] = useState("all");

  const filtered = useMemo(
    () =>
      testCases.filter((test) => {
        if (category !== "全部" && test.category !== category) return false;
        if (priority !== "all" && test.priority !== priority) return false;
        return true;
      }),
    [testCases, category, priority],
  );

  const loadCase = (test: TestCase) => {
    if (!test.brief) {
      toast("这条用例是手动异常测试，请按说明操作。", "info");
      return;
    }
    dispatch({ type: "SET_ACTIVE_RUN", id: null });
    dispatch({ type: "SET_BRIEF", brief: { ...test.brief } });
    dispatch({ type: "SET_SELECTED_FACTS", ids: [...test.factIds] });
    dispatch({ type: "SET_STEP", step: "brief" });
    router.push("/");
    toast(
      `已载入 ${test.id} 的 Brief 与 ${test.factIds.length} 张事实卡；不会自动调用模型。`,
      "success",
    );
  };

  return (
    <section className="history-section">
      <div className="history-toolbar">
        <div>
          <h2>测试用例</h2>
          <p>
            20 条用例覆盖正常生成、受众差异、缺失与冲突、诱导编造、引用与异常。
            “载入工作台”只会填充 Brief 与事实卡，不会自动生成。
          </p>
        </div>
        <div className="history-toolbar-actions">
          <label className="select-wrap">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="按类别筛选测试用例"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              aria-label="按优先级筛选测试用例"
            >
              <option value="all">全部优先级</option>
              <option value="P0">仅 P0</option>
              <option value="P1">仅 P1</option>
            </select>
          </label>
        </div>
      </div>

      <div className="history-stats">
        <span>
          <strong>{testCases.length}</strong> 条用例
        </span>
        <span>
          <i className="dot-fail" />{" "}
          {testCases.filter((test) => test.priority === "P0").length} 条 P0
        </span>
        <span>
          <i className="dot-pass" />{" "}
          {testCases.filter((test) => test.comparison).length} 条可用于对照评测
        </span>
        <span>当前显示 {filtered.length} 条</span>
      </div>

      <div className="case-grid">
        {filtered.map((test) => (
          <article key={test.id} className="panel case-card">
            <div className="case-top">
              <code>{test.id}</code>
              <Badge tone="neutral">{test.category}</Badge>
              <Badge tone={test.priority === "P0" ? "red" : "outline"}>
                {test.priority}
              </Badge>
              {test.comparison ? (
                <Badge tone="green">可对照</Badge>
              ) : null}
            </div>
            <h3>{test.title}</h3>
            <p className="case-purpose">{test.purpose}</p>

            <div className="case-expected">
              <span>预期结果</span>
              <ul>
                {test.expected.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {test.setup ? (
              <Notice tone="info" compact title="准备条件">
                {test.setup}
              </Notice>
            ) : null}

            {test.manual ? (
              <details className="case-manual">
                <summary>
                  <IconInfo size={13} /> 手动执行说明
                </summary>
                <p>{test.manual}</p>
              </details>
            ) : null}

            <div className="case-facts">
              <span>
                <IconFileText size={13} />
                {test.brief
                  ? `${test.brief.campaignName} · ${test.factIds.length} 张事实卡`
                  : "无关联 Brief"}
              </span>
            </div>

            <footer className="case-actions">
              {test.brief ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => loadCase(test)}
                  trailingIcon={<IconArrowRight size={14} />}
                >
                  载入工作台
                </Button>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  手动执行
                </Button>
              )}
              {test.comparison ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCompare(test.id)}
                >
                  去对照评测
                </Button>
              ) : null}
            </footer>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <div className="inline-empty">没有符合筛选条件的测试用例。</div>
        </div>
      ) : null}
    </section>
  );
}
