"use client";

import { useState } from "react";
import type { DocumentVersion } from "@/lib/domain/types";
import { charCount } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";

function parseTags(value: string): string[] {
  return value
    .split(/[\s,，、]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function ReviewEditor({
  version,
  onCancel,
  onSave,
}: {
  version: DocumentVersion;
  onCancel: () => void;
  onSave: (input: {
    title: string;
    body: string;
    tags: string[];
    imageSuggestion: string[];
  }) => void;
}) {
  const [title, setTitle] = useState(version.title);
  const [body, setBody] = useState(version.body);
  const [tagsText, setTagsText] = useState(version.tags.join(" "));
  const [imagesText, setImagesText] = useState(
    version.imageSuggestion.join("\n"),
  );
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      setError("标题不能为空。");
      return;
    }
    if (!body.trim()) {
      setError("正文不能为空。");
      return;
    }
    setError("");
    onSave({
      title: title.trim(),
      body: body.trim(),
      tags: parseTags(tagsText),
      imageSuggestion: imagesText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <section className="panel editor-panel">
      <header className="panel-head">
        <div>
          <span className="section-kicker">手动编辑</span>
          <h2>改完会保存为新版本</h2>
          <p>
            当前版本不会被覆盖。保存后自动重新运行规则检查，模型审核与人工确认需要重新进行。
          </p>
        </div>
        <Badge tone="amber">新版本</Badge>
      </header>

      <div className="editor-fields">
        <Field
          label="标题"
          htmlFor="edit-title"
          hint={`${charCount(title)} 字`}
          required
        >
          <TextInput
            id="edit-title"
            value={title}
            onChange={setTitle}
            maxLength={80}
          />
        </Field>

        <Field
          label="正文"
          htmlFor="edit-body"
          hint={`约 ${charCount(body)} 字；保留 [F-编号] 以继续引用事实卡`}
          required
        >
          <TextArea
            id="edit-body"
            value={body}
            onChange={setBody}
            rows={16}
            maxLength={8000}
          />
        </Field>

        <div className="form-grid">
          <Field
            label="话题标签"
            htmlFor="edit-tags"
            hint="空格或逗号分隔，建议 3–6 个"
          >
            <TextInput
              id="edit-tags"
              value={tagsText}
              onChange={setTagsText}
              placeholder="#长沙周末 #岳麓山夜游"
            />
          </Field>
          <Field
            label="配图建议"
            htmlFor="edit-images"
            hint="一行一条，建议 2–4 条"
          >
            <TextArea
              id="edit-images"
              value={imagesText}
              onChange={setImagesText}
              rows={4}
              placeholder="一条一个具体画面，写清人物动作和光线"
            />
          </Field>
        </div>
      </div>

      <Notice tone="info" compact>
        正文中的引用标记会被重新解析。新增了 [F-编号] 但没有原文摘录时，规则会提醒你补全；不会自动替你编造摘录。
      </Notice>

      {error ? <Notice tone="error" compact>{error}</Notice> : null}

      <footer className="panel-actions">
        <Button variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button variant="primary" onClick={handleSave}>
          保存为新版本
        </Button>
      </footer>
    </section>
  );
}
