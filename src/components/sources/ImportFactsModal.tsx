"use client";

import { useMemo, useRef, useState } from "react";
import type { FactCard } from "@/lib/domain/types";
import {
  FACT_IMPORT_TEMPLATE,
  parseFactInput,
  type FactParseResult,
} from "@/lib/domain/factImport";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { IconDownload, IconUpload } from "@/components/ui/Icons";

const MAX_BYTES = 512 * 1024;

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ImportFactsModal({
  open,
  existingFacts,
  onClose,
  onImport,
}: {
  open: boolean;
  existingFacts: FactCard[];
  onClose: () => void;
  onImport: (facts: FactCard[]) => void;
}) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<FactParseResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingIds = useMemo(
    () => new Set(existingFacts.map((fact) => fact.id)),
    [existingFacts],
  );
  const conflicts = useMemo(
    () => preview?.facts.filter((fact) => existingIds.has(fact.id)) ?? [],
    [preview, existingIds],
  );

  const reset = () => {
    setRaw("");
    setPreview(null);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    setFileError(null);
    setPreview(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFileError("文件超过 512 KB，请拆分后再导入。");
      return;
    }
    const text = await file.text();
    setRaw(text);
    setPreview(parseFactInput(text));
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="导入事实资料"
      description="支持 JSON 数组，或按模板编写的 Markdown / 纯文本。导入前会先解析预览。"
      size="lg"
      footer={
        <div className="modal-footer-row">
          <Button variant="secondary" size="sm" onClick={close}>
            取消
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconUpload size={15} />}
            onClick={() => setPreview(parseFactInput(raw))}
            disabled={!raw.trim()}
          >
            解析预览
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={
              !preview ||
              preview.facts.length === 0 ||
              preview.errors.length > 0
            }
            onClick={() => {
              if (!preview) return;
              onImport(preview.facts);
              reset();
            }}
          >
            确认导入 {preview?.facts.length ? `${preview.facts.length} 张` : ""}
          </Button>
        </div>
      }
    >
      <div className="import-grid">
        <div className="import-main">
          <div className="import-toolbar">
            <Button
              variant="secondary"
              size="sm"
              icon={<IconUpload size={15} />}
              onClick={() => fileRef.current?.click()}
            >
              选择文件
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.txt,.md,text/plain,application/json"
              className="visually-hidden"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<IconDownload size={15} />}
              onClick={() =>
                downloadText(FACT_IMPORT_TEMPLATE, "事实卡导入模板.txt")
              }
            >
              下载模板
            </Button>
            <span className="import-limit">最大 512 KB</span>
          </div>

          {fileError ? (
            <Notice tone="error" compact>
              {fileError}
            </Notice>
          ) : null}

          <label className="import-label" htmlFor="facts-import-text">
            粘贴内容
          </label>
          <textarea
            id="facts-import-text"
            className="textarea import-textarea"
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value);
              setPreview(null);
            }}
            placeholder={FACT_IMPORT_TEMPLATE}
            rows={14}
          />

          <details className="import-help">
            <summary>文本格式说明</summary>
            <ul>
              <li>每张事实卡以「[F-编号] 标题」开头。</li>
              <li>支持字段：分类、来源、来源类型、标签、状态、原文。</li>
              <li>「原文」之后、下一张卡之前的内容都会作为原文。</li>
              <li>多张卡片之间用单独一行 <code>---</code> 分隔。</li>
              <li>也可以直接粘贴事实卡 JSON 数组，或包含 facts 数组的对象。</li>
            </ul>
          </details>
        </div>

        <aside className="import-preview">
          <h3>解析结果</h3>
          {!preview ? (
            <div className="inline-empty">
              粘贴内容或选择文件后，点击“解析预览”。
            </div>
          ) : (
            <>
              <div className="import-stats">
                <div>
                  <span>可导入</span>
                  <strong>{preview.facts.length}</strong>
                </div>
                <div>
                  <span>覆盖同编号</span>
                  <strong>{conflicts.length}</strong>
                </div>
                <div>
                  <span>错误</span>
                  <strong>{preview.errors.length}</strong>
                </div>
              </div>

              {preview.errors.length > 0 ? (
                <Notice tone="error" compact title="需要先修正">
                  <ul className="compact-list">
                    {preview.errors.slice(0, 8).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                  {preview.errors.length > 8 ? (
                    <p className="muted">
                      还有 {preview.errors.length - 8} 条错误未显示。
                    </p>
                  ) : null}
                </Notice>
              ) : null}

              {preview.warnings.length > 0 ? (
                <Notice tone="warning" compact>
                  <ul className="compact-list">
                    {preview.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </Notice>
              ) : null}

              {conflicts.length > 0 ? (
                <Notice tone="warning" compact title="同编号会覆盖现有资料">
                  {conflicts.map((fact) => fact.id).join("、")}
                </Notice>
              ) : null}

              <div className="import-fact-list">
                {preview.facts.slice(0, 8).map((fact) => (
                  <div key={fact.id} className="import-fact">
                    <div>
                      <code>{fact.id}</code>
                      <strong>{fact.title}</strong>
                      {fact.status === "archived" ? (
                        <span className="text-warn">归档</span>
                      ) : null}
                    </div>
                    <p>{fact.content}</p>
                    <small>
                      {fact.category} · {fact.sourceName}
                    </small>
                  </div>
                ))}
                {preview.facts.length > 8 ? (
                  <p className="muted">
                    还有 {preview.facts.length - 8} 张未显示。
                  </p>
                ) : null}
              </div>
            </>
          )}
        </aside>
      </div>
    </Modal>
  );
}
