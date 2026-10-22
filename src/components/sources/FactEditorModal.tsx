"use client";

import { useEffect, useState } from "react";
import {
  FACT_CATEGORIES,
  type FactCard,
  type FactCategory,
  type FactSourceType,
} from "@/lib/domain/types";
import { nextFactId } from "@/lib/domain/factImport";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";

const SOURCE_TYPES: FactSourceType[] = [
  "模拟资料",
  "官方资料",
  "内部文档",
  "公开资料",
];

type Draft = {
  id: string;
  title: string;
  category: FactCategory;
  content: string;
  sourceName: string;
  sourceType: FactSourceType;
  tags: string;
  status: "active" | "archived";
};

function makeDraft(fact: FactCard | null, facts: FactCard[]): Draft {
  if (fact) {
    return {
      id: fact.id,
      title: fact.title,
      category: fact.category,
      content: fact.content,
      sourceName: fact.sourceName,
      sourceType: fact.sourceType,
      tags: fact.tags.join(", "),
      status: fact.status,
    };
  }
  return {
    id: nextFactId(facts),
    title: "",
    category: "产品信息",
    content: "",
    sourceName: "",
    sourceType: "模拟资料",
    tags: "",
    status: "active",
  };
}

export function FactEditorModal({
  open,
  fact,
  facts,
  onClose,
  onSave,
}: {
  open: boolean;
  fact: FactCard | null;
  facts: FactCard[];
  onClose: () => void;
  onSave: (fact: FactCard) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => makeDraft(fact, facts));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDraft(makeDraft(fact, facts));
    setErrors({});
  }, [open, fact, facts]);

  const update = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!/^F-\d{3}$/.test(draft.id.trim().toUpperCase())) {
      next.id = "编号格式应为 F-101。";
    } else if (
      facts.some(
        (item) =>
          item.id === draft.id.trim().toUpperCase() && item.id !== fact?.id,
      )
    ) {
      next.id = "该编号已被占用。";
    }
    if (!draft.title.trim()) next.title = "请填写事实卡标题。";
    if (!draft.content.trim()) next.content = "请填写可核对的原文。";
    if (!draft.sourceName.trim()) next.sourceName = "请填写资料来源。";
    if (draft.content.trim().length > 3000) {
      next.content = "原文最多 3000 字。";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: draft.id.trim().toUpperCase(),
      title: draft.title.trim(),
      category: draft.category,
      content: draft.content.trim(),
      sourceName: draft.sourceName.trim(),
      sourceType: draft.sourceType,
      tags: draft.tags
        .split(/[,，、;；]/)
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean),
      status: draft.status,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fact ? `编辑 ${fact.id}` : "新增事实卡"}
      description="事实卡是本次项目内可回查的资料单元，不代表已在现实世界核实。"
      size="lg"
      footer={
        <div className="modal-footer-row">
          <Button variant="secondary" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            {fact ? "保存修改" : "添加到资料库"}
          </Button>
        </div>
      }
    >
      <div className="form-grid">
        <Field
          label="事实卡编号"
          htmlFor="fact-id"
          required
          error={errors.id}
          hint={fact ? "编号用于引用，创建后不可修改" : "格式 F-101"}
        >
          <TextInput
            id="fact-id"
            value={draft.id}
            onChange={(value) => update({ id: value.toUpperCase() })}
            maxLength={5}
            disabled={Boolean(fact)}
            invalid={Boolean(errors.id)}
          />
        </Field>

        <Field label="分类" htmlFor="fact-category" required>
          <Select
            id="fact-category"
            value={draft.category}
            onChange={(value) =>
              update({ category: value as FactCategory })
            }
          >
            {FACT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          className="field-span-2"
          label="标题"
          htmlFor="fact-title"
          required
          error={errors.title}
        >
          <TextInput
            id="fact-title"
            value={draft.title}
            onChange={(value) => update({ title: value })}
            placeholder="例如：大学生价格"
            maxLength={80}
            invalid={Boolean(errors.title)}
          />
        </Field>

        <Field
          className="field-span-2"
          label="事实原文"
          htmlFor="fact-content"
          required
          error={errors.content}
          hint={`${draft.content.length}/3000`}
        >
          <TextArea
            id="fact-content"
            value={draft.content}
            onChange={(value) => update({ content: value })}
            rows={8}
            maxLength={3000}
            placeholder="写清楚可核对的事实。价格、时间、人数、服务承诺尽量逐条写。"
            invalid={Boolean(errors.content)}
          />
        </Field>

        <Field
          label="来源名称"
          htmlFor="fact-source"
          required
          error={errors.sourceName}
          hint="例如：价格表 v2.1"
        >
          <TextInput
            id="fact-source"
            value={draft.sourceName}
            onChange={(value) => update({ sourceName: value })}
            maxLength={80}
            invalid={Boolean(errors.sourceName)}
          />
        </Field>

        <Field label="来源类型" htmlFor="fact-source-type">
          <Select
            id="fact-source-type"
            value={draft.sourceType}
            onChange={(value) =>
              update({ sourceType: value as FactSourceType })
            }
          >
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          className="field-span-2"
          label="标签"
          htmlFor="fact-tags"
          hint="逗号分隔，用于检索与人工筛选"
        >
          <TextInput
            id="fact-tags"
            value={draft.tags}
            onChange={(value) => update({ tags: value })}
            placeholder="例如：价格, 学生价, 39元"
            maxLength={300}
          />
        </Field>

        <Field label="状态" htmlFor="fact-status">
          <Select
            id="fact-status"
            value={draft.status}
            onChange={(value) =>
              update({ status: value === "archived" ? "archived" : "active" })
            }
          >
            <option value="active">启用</option>
            <option value="archived">归档（仍可检索，但会降权并提示）</option>
          </Select>
        </Field>

        <div className="field-span-2">
          <Notice tone="info" compact>
            编号会出现在生成文案的引用标记中。已有运行保存的是事实卡快照，修改资料库不会改写历史记录。
          </Notice>
        </div>
      </div>
    </Modal>
  );
}
