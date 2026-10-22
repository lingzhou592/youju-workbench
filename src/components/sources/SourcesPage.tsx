"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppState } from "@/lib/domain/types";
import { demoFacts } from "@/lib/data/demoFacts";
import { exportStateJson, importStateJson } from "@/state/persistence";
import { useApp } from "@/state/AppStore";
import { downloadText } from "@/lib/download";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Notice } from "@/components/ui/Notice";
import {
  IconDownload,
  IconFileText,
  IconRefresh,
  IconUpload,
} from "@/components/ui/Icons";
import { BrandEditor } from "./BrandEditor";
import { FactLibrary } from "./FactLibrary";
import { RetrievalPreview } from "./RetrievalPreview";

export function SourcesPage() {
  const router = useRouter();
  const { state, dispatch, toast } = useApp();
  const [resetFactsOpen, setResetFactsOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [importError, setImportError] = useState("");

  const exportAll = () => {
    downloadText(
      exportStateJson(state),
      `有据_全量数据_${new Date().toISOString().slice(0, 10)}.json`,
      "application/json;charset=utf-8",
    );
    toast("已导出品牌、资料、运行与评测数据。", "success");
  };

  const handleImportAll = async (file: File | null) => {
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      const imported = importStateJson(text);
      setPendingImport(imported);
    } catch {
      setImportError("无法读取这个备份文件。请确认它是本工具导出的 JSON。");
      toast("备份文件格式不正确。", "error");
    }
  };

  return (
    <>
      <TopBar
        eyebrow="LIBRARY"
        title="品牌与资料"
        description="品牌约束越清楚，生成和校验越稳定。事实卡是文案唯一的依据来源，修改不会影响历史运行快照。"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/")}
            icon={<IconFileText size={15} />}
          >
            去工作台
          </Button>
        }
      />

      <div className="sources-page">
        <Notice
          tone="info"
          title="当前使用虚构演示品牌「麓行文旅」"
          action={<Badge tone="amber">模拟数据</Badge>}
        >
          所有价格、排期、用户反馈和服务承诺均为演示用途，不应作为真实业务信息使用。你可以替换成自己有权使用的真实资料；不要在公开仓库中提交敏感内容。
        </Notice>

        <BrandEditor
          brand={state.brand}
          demoBrand={state.settings.demoBrand}
          onSave={(brand) => {
            dispatch({ type: "UPDATE_BRAND", brand });
            toast("品牌约束已保存。新的生成会使用这份设定。", "success");
          }}
          onReset={() => {
            dispatch({ type: "RESET_BRAND" });
            toast("已恢复演示品牌设定。历史运行不受影响。", "info");
          }}
        />

        <div className="sources-lower">
          <FactLibrary />

          <aside className="sources-aside">
            <RetrievalPreview facts={state.facts} />

            <section className="panel aside-panel data-panel">
              <header className="aside-head">
                <span className="section-kicker">DATA</span>
                <h3>数据管理</h3>
                <p>
                  数据保存在本机浏览器。建议定期导出备份；导入备份会覆盖当前全部品牌、资料、运行和评测记录。
                </p>
              </header>
              <dl className="summary-list data-summary">
                <div>
                  <dt>品牌</dt>
                  <dd>{state.brand.name}</dd>
                </div>
                <div>
                  <dt>事实卡</dt>
                  <dd>{state.facts.length} 张</dd>
                </div>
                <div>
                  <dt>运行记录</dt>
                  <dd>{state.runs.length} 条</dd>
                </div>
                <div>
                  <dt>最近保存</dt>
                  <dd>{formatDate(state.updatedAt)}</dd>
                </div>
              </dl>
              <div className="aside-divider" />
              <div className="data-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  block
                  onClick={exportAll}
                  icon={<IconDownload size={14} />}
                >
                  导出全量数据
                </Button>
                <label className="btn btn-secondary btn-sm btn-block file-button">
                  <IconUpload size={14} />
                  导入全量数据
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                      void handleImportAll(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </label>
                {importError ? (
                  <p className="field-error">{importError}</p>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  block
                  onClick={() => setResetFactsOpen(true)}
                  icon={<IconRefresh size={14} />}
                >
                  恢复演示事实卡
                </Button>
              </div>
              <p className="aside-footnote">
                重新导入备份后，页面会自动切换到备份中的工作台状态。
              </p>
            </section>
          </aside>
        </div>
      </div>

      <ConfirmModal
        open={resetFactsOpen}
        onClose={() => setResetFactsOpen(false)}
        title="恢复演示事实卡？"
        description="会覆盖当前事实资料库。历史运行保留原快照，但当前工作台已选资料可能需要重新选择。"
        confirmLabel="恢复演示资料"
        tone="primary"
        onConfirm={() => {
          dispatch({ type: "REPLACE_FACTS", facts: demoFacts });
          setResetFactsOpen(false);
          toast("已恢复演示事实卡。", "info");
        }}
      >
        <p className="muted">
          当前 {state.facts.length} 张资料，将替换为演示资料库中的{" "}
          {demoFacts.length} 张。
        </p>
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title="用备份覆盖当前数据？"
        description="这会替换品牌、事实卡、运行记录、评测记录和工作台状态。建议先导出当前数据。"
        confirmLabel="确认覆盖"
        onConfirm={() => {
          if (pendingImport) {
            dispatch({ type: "REPLACE_STATE", state: pendingImport });
            toast("已导入备份数据。", "success");
          }
          setPendingImport(null);
        }}
      >
        {pendingImport ? (
          <dl className="summary-list">
            <div>
              <dt>品牌</dt>
              <dd>{pendingImport.brand.name}</dd>
            </div>
            <div>
              <dt>事实卡</dt>
              <dd>{pendingImport.facts.length} 张</dd>
            </div>
            <div>
              <dt>运行记录</dt>
              <dd>{pendingImport.runs.length} 条</dd>
            </div>
            <div>
              <dt>评测记录</dt>
              <dd>{pendingImport.evaluations.length} 条</dd>
            </div>
          </dl>
        ) : null}
      </ConfirmModal>
    </>
  );
}
