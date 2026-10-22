"use client";

import { useEffect, useMemo, useState } from "react";
import type { BrandConfig, MandatoryPoint } from "@/lib/domain/types";
import { brandBlock } from "@/lib/prompts/shared";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import {
  IconCheck,
  IconInfo,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from "@/components/ui/Icons";

function normalizeTag(value: string): string {
  return value.trim().replace(/^#/, "").replace(/\s+/g, " ");
}

function TagInput({
  id,
  values,
  onChange,
  placeholder,
  max = 30,
}: {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = normalizeTag(draft);
    if (!value) return;
    if (values.includes(value)) {
      setDraft("");
      return;
    }
    if (values.length >= max) return;
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="tag-input" id={id}>
      <div className="tag-input-values">
        {values.map((value) => (
          <span key={value} className="tag-input-chip">
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              aria-label={`移除 ${value}`}
            >
              <IconX size={12} />
            </button>
          </span>
        ))}
        {values.length === 0 ? (
          <span className="tag-input-empty">还没有添加</span>
        ) : null}
      </div>
      <div className="tag-input-row">
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
            if (event.key === "Backspace" && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={add}
          disabled={!draft.trim() || values.length >= max}
        >
          添加
        </Button>
      </div>
    </div>
  );
}

function emptyPoint(index: number): MandatoryPoint {
  return {
    id: `M-${Date.now().toString(36)}-${index}`,
    text: "",
    keywords: [],
    match: "all",
  };
}

export function BrandEditor({
  brand,
  demoBrand,
  onSave,
  onReset,
  onDirtyChange,
}: {
  brand: BrandConfig;
  demoBrand: boolean;
  onSave: (brand: BrandConfig) => void;
  onReset: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<BrandConfig>(() =>
    JSON.parse(JSON.stringify(brand)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [keywordDrafts, setKeywordDrafts] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(brand)));
    setErrors({});
    setKeywordDrafts({});
    onDirtyChange?.(false);
    // 只在外部保存/恢复导致 updatedAt 变化时同步，避免覆盖正在编辑的草稿。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.updatedAt]);

  const update = (patch: Partial<BrandConfig>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDirtyChange?.(
      JSON.stringify({ ...next, updatedAt: "" }) !==
        JSON.stringify({ ...brand, updatedAt: "" }),
    );
  };

  const dirty =
    JSON.stringify({ ...draft, updatedAt: "" }) !==
    JSON.stringify({ ...brand, updatedAt: "" });

  const preview = useMemo(() => {
    try {
      return brandBlock(draft);
    } catch {
      return "填写品牌信息后，这里会显示将发送给模型的约束文本。";
    }
  }, [draft]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = "请填写品牌名称。";
    if (!draft.tagline.trim()) next.tagline = "请填写一句话定位。";
    if (!draft.audience.trim()) next.audience = "请填写目标人群。";
    if (draft.toneKeywords.length === 0) {
      next.toneKeywords = "至少添加一个语气关键词。";
    }
    draft.mandatoryPoints.forEach((point, index) => {
      if (!point.text.trim()) {
        next[`point-${point.id}`] = `第 ${index + 1} 条必提信息缺少说明。`;
      }
      if (point.keywords.length === 0) {
        next[`point-keywords-${point.id}`] =
          `第 ${index + 1} 条必提信息缺少匹配关键词。`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const normalized: BrandConfig = {
      ...draft,
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      audience: draft.audience.trim(),
      toneNote: draft.toneNote.trim(),
      toneKeywords: draft.toneKeywords.map(normalizeTag).filter(Boolean),
      bannedPhrases: draft.bannedPhrases.map(normalizeTag).filter(Boolean),
      writingRules: draft.writingRules
        .map((rule) => rule.trim())
        .filter(Boolean),
      mandatoryPoints: draft.mandatoryPoints.map((point) => ({
        ...point,
        text: point.text.trim(),
        keywords: point.keywords.map(normalizeTag).filter(Boolean),
      })),
      updatedAt: new Date().toISOString(),
    };
    setDraft(normalized);
    onSave(normalized);
    setErrors({});
    onDirtyChange?.(false);
  };

  const updatePoint = (id: string, patch: Partial<MandatoryPoint>) => {
    update({
      mandatoryPoints: draft.mandatoryPoints.map((point) =>
        point.id === id ? { ...point, ...patch } : point,
      ),
    });
  };

  const addKeyword = (point: MandatoryPoint) => {
    const raw = keywordDrafts[point.id] ?? "";
    const value = normalizeTag(raw);
    if (!value) return;
    if (point.keywords.includes(value)) {
      setKeywordDrafts((current) => ({ ...current, [point.id]: "" }));
      return;
    }
    updatePoint(point.id, { keywords: [...point.keywords, value] });
    setKeywordDrafts((current) => ({ ...current, [point.id]: "" }));
  };

  return (
    <div className="sources-grid">
      <section className="panel brand-editor-panel">
        <header className="panel-head">
          <div>
            <span className="section-kicker">BRAND SYSTEM</span>
            <h2>品牌约束</h2>
            <p>
              约束会随每次生成一起发送给模型，并成为规则检查的依据。修改只影响之后的新运行，不会改写已有运行快照。
            </p>
          </div>
          <div className="action-row">
            {demoBrand ? <Badge tone="outline">演示品牌</Badge> : null}
            <Badge tone={dirty ? "amber" : "green"} dot>
              {dirty ? "有未保存修改" : "已保存"}
            </Badge>
          </div>
        </header>

        <div className="form-grid brand-form-grid">
          <Field label="品牌名称" htmlFor="brand-name" required error={errors.name}>
            <TextInput
              id="brand-name"
              value={draft.name}
              onChange={(value) => update({ name: value })}
              placeholder="例如：麓行文旅"
              maxLength={40}
              invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            label="一句话定位"
            htmlFor="brand-tagline"
            required
            error={errors.tagline}
          >
            <TextInput
              id="brand-tagline"
              value={draft.tagline}
              onChange={(value) => update({ tagline: value })}
              placeholder="例如：长沙周边的周末短途旅行：小团、慢走、有讲解。"
              maxLength={120}
              invalid={Boolean(errors.tagline)}
            />
          </Field>

          <Field
            className="field-span-2"
            label="目标人群"
            htmlFor="brand-audience"
            required
            error={errors.audience}
          >
            <TextInput
              id="brand-audience"
              value={draft.audience}
              onChange={(value) => update({ audience: value })}
              placeholder="例如：20–35 岁城市年轻人，以及有 5–12 岁孩子的亲子家庭"
              maxLength={200}
              invalid={Boolean(errors.audience)}
            />
          </Field>

          <Field
            className="field-span-2"
            label="语气关键词"
            required
            error={errors.toneKeywords}
            hint="回车或逗号添加"
          >
            <TagInput
              values={draft.toneKeywords}
              onChange={(values) => update({ toneKeywords: values })}
              placeholder="例如：克制、具体、有画面感"
            />
          </Field>

          <Field
            className="field-span-2"
            label="语气说明"
            htmlFor="brand-tone-note"
            hint="写清楚像谁在说话、不要什么"
          >
            <TextArea
              id="brand-tone-note"
              value={draft.toneNote}
              onChange={(value) => update({ toneNote: value })}
              rows={3}
              maxLength={600}
              placeholder="例如：像一位熟悉本地的朋友发来的周末邀约，先说清楚时间地点，再给一点画面。不喊口号。"
            />
          </Field>
        </div>

        <div className="brand-subsection">
          <div className="subsection-head">
            <div>
              <h3>必提信息</h3>
              <p>
                每条必提信息都需要一组关键词。规则检查会确认关键词是否出现在标题、正文或标签中。
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<IconPlus size={15} />}
              onClick={() =>
                update({
                  mandatoryPoints: [
                    ...draft.mandatoryPoints,
                    emptyPoint(draft.mandatoryPoints.length),
                  ],
                })
              }
            >
              添加一条
            </Button>
          </div>
          {errors.mandatoryPoints ? (
            <p className="field-error">{errors.mandatoryPoints}</p>
          ) : null}
          <div className="mandatory-list">
            {draft.mandatoryPoints.map((point, index) => (
              <div key={point.id} className="mandatory-row">
                <div className="mandatory-index">{index + 1}</div>
                <div className="mandatory-fields">
                  <TextInput
                    value={point.text}
                    onChange={(value) => updatePoint(point.id, { text: value })}
                    placeholder="必须说清楚的信息，例如：活动余量与报名以官方小程序为准"
                    maxLength={120}
                    invalid={Boolean(errors[`point-${point.id}`])}
                  />
                  <div className="keyword-row">
                    <div className="keyword-chips">
                      {point.keywords.map((keyword) => (
                        <span key={keyword} className="keyword-chip">
                          {keyword}
                          <button
                            type="button"
                            onClick={() =>
                              updatePoint(point.id, {
                                keywords: point.keywords.filter(
                                  (item) => item !== keyword,
                                ),
                              })
                            }
                            aria-label={`移除关键词 ${keyword}`}
                          >
                            <IconX size={11} />
                          </button>
                        </span>
                      ))}
                      <input
                        value={keywordDrafts[point.id] ?? ""}
                        onChange={(event) =>
                          setKeywordDrafts((current) => ({
                            ...current,
                            [point.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === ",") {
                            event.preventDefault();
                            addKeyword(point);
                          }
                        }}
                        onBlur={() => addKeyword(point)}
                        placeholder="添加关键词，回车确认"
                        aria-label="添加必提关键词"
                      />
                    </div>
                    <select
                      className="select select-compact"
                      value={point.match}
                      onChange={(event) =>
                        updatePoint(point.id, {
                          match: event.target.value === "any" ? "any" : "all",
                        })
                      }
                      aria-label="关键词匹配方式"
                    >
                      <option value="all">全部出现</option>
                      <option value="any">任一出现</option>
                    </select>
                  </div>
                  {errors[`point-keywords-${point.id}`] ? (
                    <p className="field-error">
                      {errors[`point-keywords-${point.id}`]}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="icon-button danger-icon"
                  onClick={() =>
                    update({
                      mandatoryPoints: draft.mandatoryPoints.filter(
                        (item) => item.id !== point.id,
                      ),
                    })
                  }
                  aria-label={`删除第 ${index + 1} 条必提信息`}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
            {draft.mandatoryPoints.length === 0 ? (
              <div className="inline-empty">
                还没有必提信息。至少添加一条，规则检查才有可执行的标准。
              </div>
            ) : null}
          </div>
        </div>

        <div className="brand-subsection">
          <div className="subsection-head">
            <div>
              <h3>禁用表达</h3>
              <p>命中任一表达时，规则检查直接标为未通过。</p>
            </div>
          </div>
          <Field label="禁用表达" error={errors.bannedPhrases}>
            <TagInput
              values={draft.bannedPhrases}
              onChange={(values) => update({ bannedPhrases: values })}
              placeholder="例如：全网最低、必去、治愈"
              max={80}
            />
          </Field>
        </div>

        <div className="brand-subsection">
          <div className="subsection-head">
            <div>
              <h3>写作约束</h3>
              <p>一行一条，会进入生成与审核的提示词。</p>
            </div>
            {errors.writingRules ? (
              <p className="field-error">{errors.writingRules}</p>
            ) : null}
          </div>
          <TextArea
            value={draft.writingRules.join("\n")}
            onChange={(value) =>
              update({ writingRules: value.split(/\r?\n/) })
            }
            rows={6}
            maxLength={3000}
            placeholder={"标题不超过 20 字\n正文用具体时间、地点或动作开头\n不编造价格、日期、赠品"}
          />
        </div>

        <footer className="panel-actions">
          <div className="action-row">
            <Button
              variant="ghost"
              icon={<IconRefresh size={15} />}
              onClick={() => setResetOpen(true)}
            >
              恢复演示品牌
            </Button>
            <span className="autosave-note">
              最后保存：{formatDateTime(brand.updatedAt)}
            </span>
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            icon={<IconCheck size={16} />}
            disabled={!dirty}
          >
            保存品牌约束
          </Button>
        </footer>
      </section>

      <aside className="step-aside">
        <section className="panel aside-panel aside-sticky">
          <header className="aside-head">
            <span className="section-kicker">提示词预览</span>
            <h3>模型会看到什么</h3>
            <p>
              下面是当前草稿会生成的品牌约束文本。保存后，新运行会使用这份内容。
            </p>
          </header>
          <pre className="prompt-preview">{preview}</pre>
        </section>

        <section className="panel aside-panel aside-note">
          <span className="section-kicker">写作口径</span>
          <p>
            <IconInfo size={14} /> 禁用表达是硬约束；必提信息是覆盖要求；语气说明是软约束，最终仍需人工判断。
          </p>
          <p>
            <IconInfo size={14} /> 品牌配置不是“越多越好”。关键词太泛会让规则检查失去区分度。
          </p>
        </section>
      </aside>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="恢复演示品牌？"
        description="当前品牌约束会被内置的虚构演示品牌覆盖；已有运行快照不受影响。"
        size="sm"
        footer={
          <div className="modal-footer-row">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setResetOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onReset();
                setResetOpen(false);
              }}
            >
              恢复演示品牌
            </Button>
          </div>
        }
      >
        <Notice tone="warning" compact>
          恢复后，品牌名称、语气、必提信息、禁用表达与写作规则都会回到初始状态。
        </Notice>
      </Modal>
    </div>
  );
}
