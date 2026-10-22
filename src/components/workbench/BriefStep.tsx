"use client";

import type { Brief, BriefTemplate } from "@/lib/domain/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import {
  IconArrowRight,
  IconCheck,
  IconFileText,
  IconTag,
} from "@/components/ui/Icons";

const REQUIRED_FIELDS: Array<{ key: keyof Brief; label: string }> = [
  { key: "campaignName", label: "活动名称" },
  { key: "product", label: "推广对象" },
  { key: "goal", label: "活动目标" },
  { key: "audience", label: "目标人群" },
  { key: "sellingPoints", label: "核心卖点" },
];

export function BriefStep({
  brief,
  onChange,
  errors,
  templates,
  activeTemplateId,
  onLoadTemplate,
  onNext,
  selectedFactCount,
  hasRun,
}: {
  brief: Brief;
  onChange: (patch: Partial<Brief>) => void;
  errors: Record<string, string>;
  templates: BriefTemplate[];
  activeTemplateId: string | null;
  onLoadTemplate: (template: BriefTemplate) => void;
  onNext: () => void;
  selectedFactCount: number;
  hasRun: boolean;
}) {
  const completed = REQUIRED_FIELDS.filter(
    (field) => brief[field.key]?.trim().length > 0,
  ).length;
  const progress = Math.round((completed / REQUIRED_FIELDS.length) * 100);

  return (
    <div className="step-grid">
      <section className="panel form-panel">
        <header className="panel-head">
          <div>
            <span className="section-kicker">STEP 01 · BRIEF</span>
            <h2>先把这次活动说清楚</h2>
            <p>
              这里写的是“这次要推什么、给谁看、希望读者做什么”。生成后它会冻结为运行快照，不随后续品牌资料修改而变化。
            </p>
          </div>
          <Badge tone="outline">V1 聚焦小红书图文</Badge>
        </header>

        <div className="form-grid">
          <Field
            label="活动名称"
            htmlFor="campaignName"
            required
            error={errors.campaignName}
            hint={`${brief.campaignName.length}/60`}
          >
            <TextInput
              id="campaignName"
              value={brief.campaignName}
              onChange={(value) => onChange({ campaignName: value })}
              placeholder="例如：桂花季夜行·岳麓山夜游"
              maxLength={60}
              invalid={Boolean(errors.campaignName)}
            />
          </Field>

          <Field
            label="推广对象"
            htmlFor="product"
            required
            error={errors.product}
            hint="具体产品/线路，不要只写品牌名"
          >
            <TextInput
              id="product"
              value={brief.product}
              onChange={(value) => onChange({ product: value })}
              placeholder="例如：岳麓山夜游·大学城散步线"
              maxLength={80}
              invalid={Boolean(errors.product)}
            />
          </Field>

          <Field
            label="活动目标"
            htmlFor="goal"
            required
            error={errors.goal}
            hint="内容种草 / 报名转化 / 认知"
          >
            <TextInput
              id="goal"
              value={brief.goal}
              onChange={(value) => onChange({ goal: value })}
              placeholder="例如：内容种草 + 周末场次报名"
              maxLength={120}
              invalid={Boolean(errors.goal)}
            />
          </Field>

          <Field
            label="目标人群"
            htmlFor="audience"
            required
            error={errors.audience}
            hint="年龄、身份、周末场景"
          >
            <TextInput
              id="audience"
              value={brief.audience}
              onChange={(value) => onChange({ audience: value })}
              placeholder="例如：长沙高校大学生，18–24 岁，周末想找一件不用出远门的小事"
              maxLength={160}
              invalid={Boolean(errors.audience)}
            />
          </Field>

          <Field
            className="field-span-2"
            label="核心卖点"
            htmlFor="sellingPoints"
            required
            error={errors.sellingPoints}
            hint="一行一个，生成时会作为重点，但仍须有事实卡支持"
          >
            <TextArea
              id="sellingPoints"
              value={brief.sellingPoints}
              onChange={(value) => onChange({ sellingPoints: value })}
              placeholder={
                "周五/周六 18:30 出发，2 小时左右的轻散步\n12 人以内小团，有领队和讲解\n爱晚亭停留 15 分钟，听 3 个夜行故事"
              }
              rows={5}
              maxLength={1200}
              invalid={Boolean(errors.sellingPoints)}
            />
          </Field>

          <Field
            label="语气补充"
            htmlFor="toneOverride"
            hint="可选，覆盖或补充品牌语气"
          >
            <TextArea
              id="toneOverride"
              value={brief.toneOverride}
              onChange={(value) => onChange({ toneOverride: value })}
              placeholder="例如：像朋友发来的周末邀约，轻松但不吵闹"
              rows={3}
              maxLength={300}
            />
          </Field>

          <Field
            label="内容限制"
            htmlFor="constraints"
            hint="可选，写清楚不能说什么"
          >
            <TextArea
              id="constraints"
              value={brief.constraints}
              onChange={(value) => onChange({ constraints: value })}
              placeholder="例如：必须提到官方小程序；不要写“必去”“治愈”；不要编造优惠"
              rows={3}
              maxLength={600}
            />
          </Field>

          <div className="channel-lock field-span-2">
            <span className="channel-lock-icon">
              <IconTag size={17} />
            </span>
            <div>
              <strong>发布渠道：小红书图文</strong>
              <p>
                V1 只生成标题、正文、话题标签和配图建议；不做图片生成、多平台适配或自动发布。
              </p>
            </div>
          </div>
        </div>

        <footer className="panel-actions">
          <span className="autosave-note">
            <IconCheck size={14} /> 修改会自动保存在本机浏览器
          </span>
          <Button
            variant="primary"
            onClick={onNext}
            trailingIcon={<IconArrowRight size={16} />}
          >
            下一步：选择事实依据
          </Button>
        </footer>
      </section>

      <aside className="step-aside">
        <section className="panel aside-panel">
          <header className="aside-head">
            <span className="section-kicker">示例 BRIEF</span>
            <h3>从一个真实场景开始</h3>
            <p>载入后会同时选好一组推荐事实卡，你仍可逐张调整。</p>
          </header>
          <div className="template-list">
            {templates.map((template) => {
              const active = template.id === activeTemplateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`template-card ${active ? "template-active" : ""}`}
                  onClick={() => onLoadTemplate(template)}
                  aria-pressed={active}
                >
                  <span className="template-icon">
                    <IconFileText size={17} />
                  </span>
                  <span className="template-copy">
                    <strong>{template.label}</strong>
                    <small>{template.description}</small>
                  </span>
                  {active ? (
                    <span className="template-check">
                      <IconCheck size={14} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {hasRun ? (
            <p className="aside-footnote">
              载入示例会切换到新的 Brief 草稿；已生成的运行仍保留在历史记录中。
            </p>
          ) : null}
        </section>

        <section className="panel aside-panel">
          <header className="aside-head">
            <span className="section-kicker">填写检查</span>
            <h3>
              {completed} / {REQUIRED_FIELDS.length} 个必填项
            </h3>
          </header>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ul className="check-list">
            {REQUIRED_FIELDS.map((field) => {
              const done = brief[field.key]?.trim().length > 0;
              return (
                <li key={field.key} className={done ? "check-done" : ""}>
                  <span className="check-mark">
                    {done ? <IconCheck size={13} /> : null}
                  </span>
                  {field.label}
                </li>
              );
            })}
          </ul>
          <div className="aside-stat-row">
            <span>已选事实卡</span>
            <strong>{selectedFactCount} 张</strong>
          </div>
        </section>

        <section className="panel aside-panel aside-note">
          <span className="section-kicker">写作口径</span>
          <p>
            卖点是“希望强调什么”，不是“允许编什么”。价格、时间、人数、承诺仍然只能来自事实卡。
          </p>
        </section>
      </aside>
    </div>
  );
}
