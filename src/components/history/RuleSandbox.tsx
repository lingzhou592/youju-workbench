"use client";

import { useMemo, useState } from "react";
import { createSampleRun } from "@/lib/data/sampleRun";
import { runRuleChecks, summarizeRuleChecks } from "@/lib/review/rules";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconCheck,
  IconInfo,
  IconShield,
} from "@/components/ui/Icons";

type Sample = {
  id: string;
  label: string;
  description: string;
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations: ReturnType<typeof createSampleRun>["generation"]["citations"];
};

export function RuleSandbox() {
  const [activeId, setActiveId] = useState("good");
  const sampleRun = useMemo(() => createSampleRun(), []);
  const base = sampleRun.generation;

  const samples = useMemo<Sample[]>(() => {
    const goodBody = `${base.body.replace(
      "\n\n周五下班后，给自己留两个小时，去山里走一走。",
      "",
    )}\n\n活动安排以现场实际情况为准。`;
    return [
      {
        id: "good",
        label: "基本合格",
        description:
          "补齐了全部必提信息，引用、数字和长度都在建议范围内；仍然需要人工判断事实与语气。",
        title: base.titles[0].title,
        body: goodBody,
        tags: base.tags,
        imageSuggestion: base.imageSuggestion,
        citations: base.citations,
      },
      {
        id: "banned",
        label: "含禁用表达",
        description:
          "标题使用“必去”“治愈”，会触发品牌禁用表达检查；其他结构仍然完整。",
        title: "周末必去！岳麓山夜游治愈你",
        body: `${base.body}\n\n这趟夜路真的很治愈，周末必去。`,
        tags: base.tags,
        imageSuggestion: base.imageSuggestion,
        citations: base.citations,
      },
      {
        id: "fabricated",
        label: "虚构价格",
        description:
          "把有依据的 39 元改成 29 元，并加入“原价 199、现价 99”，数字依据与引用检查会直接标出。",
        title: base.titles[0].title,
        body: base.body
          .replace("39 元/人", "29 元/人")
          .replace(
            "不含餐饮。",
            "不含餐饮。原价 199，现价 99，限时优惠。",
          ),
        tags: base.tags,
        imageSuggestion: base.imageSuggestion,
        citations: base.citations,
      },
    ];
  }, [base]);

  const active = samples.find((sample) => sample.id === activeId) ?? samples[0];

  const checks = useMemo(
    () =>
      runRuleChecks({
        version: {
          title: active.title,
          body: active.body,
          tags: active.tags,
          imageSuggestion: active.imageSuggestion,
          citations: active.citations,
        },
        brand: sampleRun.input.brand,
        brief: sampleRun.input.brief,
        facts: sampleRun.input.facts,
      }),
    [active, sampleRun],
  );
  const summary = summarizeRuleChecks(checks);
  const notable = checks.filter((check) => check.status !== "pass");

  return (
    <section className="history-section">
      <div className="history-toolbar">
        <div>
          <h2>规则演示</h2>
          <p>
            无需模型即可运行。三个内置样例分别展示“基本合格”“含禁用表达”“虚构价格”会如何被规则引擎检查。
          </p>
        </div>
        <Badge tone="outline">离线 · 非模型生成</Badge>
      </div>

      <Notice tone="info" compact title="这是规则引擎演示，不是模型输出">
        样例由项目内置文本构造，只用于验证检查逻辑。它们不代表模型质量，也不应作为真实业务内容使用。
      </Notice>

      <div className="sandbox-tabs">
        {samples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className={sample.id === activeId ? "sandbox-tab-active" : ""}
            onClick={() => setActiveId(sample.id)}
            aria-pressed={sample.id === activeId}
          >
            <strong>{sample.label}</strong>
            <span>{sample.description}</span>
          </button>
        ))}
      </div>

      <div className="sandbox-layout">
        <div className="panel sandbox-preview">
          <header className="panel-head compact-head">
            <div>
              <span className="section-kicker">SAMPLE</span>
              <h2>{active.title}</h2>
              <p>{active.description}</p>
            </div>
            <Badge
              tone={
                summary.blocking
                  ? "red"
                  : summary.warn > 0
                    ? "amber"
                    : "green"
              }
              dot
            >
              {summary.fail} 未通过 · {summary.warn} 提醒 · {summary.pass} 通过
            </Badge>
          </header>
          <div className="sandbox-body">{active.body}</div>
          <div className="sandbox-tags">
            {active.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>

        <section className="panel sandbox-results">
          <header className="rail-head">
            <div>
              <span className="section-kicker">RULE ENGINE</span>
              <h2>检查结果</h2>
            </div>
            <IconShield size={20} />
          </header>
          <div className="rule-summary-bar">
            <span
              className="rule-summary-fail"
              style={{ flex: Math.max(summary.fail, 0) }}
            />
            <span
              className="rule-summary-warn"
              style={{ flex: Math.max(summary.warn, 0) }}
            />
            <span
              className="rule-summary-pass"
              style={{ flex: Math.max(summary.pass, 0) }}
            />
          </div>
          <div className="sandbox-rule-list">
            {notable.length > 0 ? (
              notable.map((check) => (
                <div
                  key={check.id}
                  className={`sandbox-rule sandbox-rule-${check.status}`}
                >
                  <span className="sandbox-rule-icon">
                    {check.status === "fail" ? (
                      <IconAlert size={16} />
                    ) : (
                      <IconInfo size={16} />
                    )}
                  </span>
                  <div>
                    <div className="sandbox-rule-top">
                      <strong>{check.label}</strong>
                      <Badge
                        tone={check.status === "fail" ? "red" : "amber"}
                      >
                        {check.status === "fail" ? "未通过" : "提醒"}
                      </Badge>
                    </div>
                    <p>{check.detail}</p>
                    {check.evidence ? (
                      <pre>{check.evidence}</pre>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="sandbox-pass">
                <IconCheck size={22} />
                <strong>所有规则均通过</strong>
                <p>
                  规则全部通过不等于内容一定可以发布；事实是否成立、语气是否合适，仍需要人工判断。
                </p>
              </div>
            )}
          </div>
          <p className="rail-footnote">
            规则只检查长度、关键词、引用编号、数字字符串等可确定项。语气与事实成立性不在规则能力范围内。
          </p>
        </section>
      </div>
    </section>
  );
}
