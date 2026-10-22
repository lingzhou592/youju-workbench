"use client";

import type { ApiError, ModelIssue } from "@/lib/domain/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import {
  IconAlert,
  IconRobot,
  IconSpark,
} from "@/components/ui/Icons";

const QUICK_INSTRUCTIONS = [
  "更口语一点，像朋友发来的消息",
  "压缩到 500 字以内",
  "补上官方小程序报名信息",
  "减少形容词，多写具体动作",
  "把价格和包含项写清楚",
];

export function RevisionPanel({
  selectedIssues,
  instruction,
  onInstructionChange,
  onClearSelection,
  onRevise,
  revising,
  error,
  configured,
  modelReviewed,
}: {
  selectedIssues: ModelIssue[];
  instruction: string;
  onInstructionChange: (value: string) => void;
  onClearSelection: () => void;
  onRevise: () => void;
  revising: boolean;
  error: ApiError | null;
  configured: boolean;
  modelReviewed: boolean;
}) {
  const canRevise =
    configured &&
    !revising &&
    (selectedIssues.length > 0 || instruction.trim().length > 0);

  return (
    <section className="panel revision-panel">
      <header className="panel-head compact-head">
        <div>
          <span className="section-kicker">定向修订</span>
          <h2>带着问题改，而不是整篇重写</h2>
          <p>
            选中的模型建议会一起进入修订提示词；没有选中问题时，也可以只写一条修订指令。
          </p>
        </div>
        <Badge tone="purple">
          <IconSpark size={12} /> {selectedIssues.length} 条问题
        </Badge>
      </header>

      {selectedIssues.length > 0 ? (
        <div className="selected-issues">
          <div className="selected-issues-head">
            <span>本次带入修订</span>
            <button
              type="button"
              className="text-button text-muted"
              onClick={onClearSelection}
            >
              清空选择
            </button>
          </div>
          {selectedIssues.map((issue) => (
            <div key={issue.id} className="selected-issue">
              <Badge
                tone={
                  issue.severity === "error"
                    ? "red"
                    : issue.severity === "warning"
                      ? "amber"
                      : "blue"
                }
              >
                {issue.category}
              </Badge>
              <span>{issue.problem}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="revision-empty">
          还没有选中模型建议。可以在右侧“模型建议”里勾选，或直接写一条修订指令。
        </p>
      )}

      <div className="quick-instructions">
        {QUICK_INSTRUCTIONS.map((item) => (
          <button
            key={item}
            type="button"
            className="quick-chip"
            onClick={() => onInstructionChange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="rail-field">
        <span>
          修订指令 <small>可选，写清希望怎么改</small>
        </span>
        <textarea
          value={instruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          rows={3}
          placeholder="例如：保留所有引用，把开头改得更口语；不要新增价格或赠品。"
        />
      </label>

      {!configured ? (
        <Notice tone="warning" compact title="需要配置模型">
          定向修订需要调用模型。你仍然可以直接使用“编辑文案”手动修改；未配置模型时不会发起请求。
        </Notice>
      ) : null}

      {!modelReviewed && configured ? (
        <Notice tone="info" compact>
          这个版本还没有模型审核建议。你仍可以直接写修订指令；建议先运行一次模型审核，再勾选问题。
        </Notice>
      ) : null}

      {error ? (
        <Notice tone="error" compact title={error.message}>
          {error.hint ? <p>{error.hint}</p> : null}
          <p className="muted">错误码：{error.code}</p>
        </Notice>
      ) : null}

      <footer className="panel-actions">
        <span className="autosave-note">
          <IconRobot size={14} /> 修订不会新增事实，引用会被保留
        </span>
        <Button
          variant="primary"
          onClick={onRevise}
          disabled={!canRevise}
          loading={revising}
          icon={<IconAlert size={15} />}
        >
          {revising ? "正在修订…" : "开始定向修订"}
        </Button>
      </footer>
    </section>
  );
}
