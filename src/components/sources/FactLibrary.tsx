"use client";

import { useMemo, useState } from "react";
import {
  FACT_CATEGORIES,
  type FactCard,
  type FactCategory,
} from "@/lib/domain/types";
import { formatDate, truncate } from "@/lib/format";
import { useApp } from "@/state/AppStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import {
  IconArchive,
  IconDownload,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from "@/components/ui/Icons";
import { FactEditorModal } from "./FactEditorModal";
import { ImportFactsModal } from "./ImportFactsModal";

type StatusFilter = "all" | "active" | "archived";
type SortMode = "id" | "updated";

function downloadFacts(facts: FactCard[]) {
  const payload = {
    schema: "youju.facts",
    exportedAt: new Date().toISOString(),
    facts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `有据-事实资料-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function FactLibrary() {
  const { state, dispatch, toast } = useApp();
  const facts = state.facts;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FactCategory | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("id");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FactCard | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FactCard | null>(null);

  const stats = useMemo(() => {
    const active = facts.filter((fact) => fact.status === "active").length;
    const archived = facts.length - active;
    const categories = new Set(facts.map((fact) => fact.category)).size;
    const latest = facts
      .map((fact) => fact.updatedAt)
      .sort((a, b) => b.localeCompare(a))[0];
    return { total: facts.length, active, archived, categories, latest };
  }, [facts]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return facts
      .filter((fact) => {
        if (category !== "all" && fact.category !== category) return false;
        if (status !== "all" && fact.status !== status) return false;
        if (!normalized) return true;
        const haystack = [
          fact.id,
          fact.title,
          fact.content,
          fact.sourceName,
          fact.category,
          fact.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .sort((a, b) =>
        sort === "id"
          ? a.id.localeCompare(b.id)
          : b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [facts, query, category, status, sort]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (fact: FactCard) => {
    setEditing(fact);
    setEditorOpen(true);
  };

  const handleSave = (fact: FactCard) => {
    const exists = facts.some((item) => item.id === fact.id);
    dispatch({ type: "ADD_FACT", fact });
    setEditorOpen(false);
    setEditing(null);
    toast(exists ? `已更新 ${fact.id}。` : `已添加 ${fact.id}。`, "success");
  };

  const handleImport = (imported: FactCard[]) => {
    dispatch({ type: "IMPORT_FACTS", facts: imported });
    setImportOpen(false);
    toast(`已导入 ${imported.length} 张事实卡。`, "success");
  };

  return (
    <section className="panel fact-library-panel">
      <header className="panel-head">
        <div>
          <span className="section-kicker">FACT LIBRARY</span>
          <h2>事实资料</h2>
          <p>
            每张事实卡是一段可核对、可引用的原文。生成时只会看到本次选中的卡片，并在运行中冻结为快照。
          </p>
        </div>
        <div className="action-row">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconUpload size={15} />}
            onClick={() => setImportOpen(true)}
          >
            导入
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconDownload size={15} />}
            onClick={() => {
              downloadFacts(facts);
              toast("已导出事实资料 JSON。", "success");
            }}
            disabled={facts.length === 0}
          >
            导出
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<IconPlus size={15} />}
            onClick={openCreate}
          >
            新增事实卡
          </Button>
        </div>
      </header>

      <div className="source-stats">
        <div>
          <span>全部资料</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>启用</span>
          <strong>{stats.active}</strong>
        </div>
        <div>
          <span>归档</span>
          <strong>{stats.archived}</strong>
        </div>
        <div>
          <span>覆盖分类</span>
          <strong>{stats.categories}</strong>
        </div>
        <div>
          <span>最近更新</span>
          <strong className="source-stat-date">
            {stats.latest ? formatDate(stats.latest) : "—"}
          </strong>
        </div>
      </div>

      <Notice tone="info" compact>
        事实卡用于“本项目内可回查”，不等于已在现实世界核实。价格、排期和服务承诺发生变化时，请归档旧卡并新增现行卡。
      </Notice>

      <div className="source-toolbar">
        <div className="search-wrap source-search">
          <IconSearch size={16} />
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索编号、标题、原文、来源或标签"
            aria-label="搜索事实卡"
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery("")}
              aria-label="清空搜索"
            >
              <IconX size={14} />
            </button>
          ) : null}
        </div>

        <select
          className="select select-compact"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as FactCategory | "all")
          }
          aria-label="按分类筛选"
        >
          <option value="all">全部分类</option>
          {FACT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          className="select select-compact"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          aria-label="按状态筛选"
        >
          <option value="all">全部状态</option>
          <option value="active">仅启用</option>
          <option value="archived">仅归档</option>
        </select>

        <select
          className="select select-compact"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortMode)}
          aria-label="排序方式"
        >
          <option value="id">按编号排序</option>
          <option value="updated">按更新时间排序</option>
        </select>
      </div>

      <div className="evidence-list-head">
        <span>
          显示 {filtered.length} / {facts.length} 张
        </span>
        <span className="muted">
          归档资料在依据检索中会降权，并在生成前提示。
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state source-empty">
          <span className="empty-icon">
            <IconSearch size={22} />
          </span>
          <h3>{facts.length === 0 ? "资料库还是空的" : "没有符合条件的资料"}</h3>
          <p>
            {facts.length === 0
              ? "先添加一张价格、时间或服务说明，生成才有可引用的依据。"
              : "可以清空搜索或放宽筛选条件。"}
          </p>
          {facts.length === 0 ? (
            <Button
              variant="primary"
              size="sm"
              icon={<IconPlus size={15} />}
              onClick={openCreate}
            >
              新增第一张事实卡
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table sources-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>事实卡</th>
                <th>分类</th>
                <th>来源</th>
                <th>标签</th>
                <th>状态</th>
                <th>更新时间</th>
                <th className="table-actions-head">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fact) => (
                <tr
                  key={fact.id}
                  className={fact.status === "archived" ? "row-archived" : ""}
                >
                  <td>
                    <code className="fact-id">{fact.id}</code>
                  </td>
                  <td>
                    <div className="table-fact-main">
                      <strong>{fact.title}</strong>
                      <p title={fact.content}>{truncate(fact.content, 96)}</p>
                    </div>
                  </td>
                  <td>
                    <Badge tone="neutral">{fact.category}</Badge>
                  </td>
                  <td>
                    <div className="table-source">
                      <span>{fact.sourceName}</span>
                      <small>{fact.sourceType}</small>
                    </div>
                  </td>
                  <td>
                    <div className="table-tags">
                      {fact.tags.slice(0, 3).map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                      {fact.tags.length > 3 ? (
                        <span className="muted">
                          +{fact.tags.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <Badge
                      tone={fact.status === "active" ? "green" : "amber"}
                      dot
                    >
                      {fact.status === "active" ? "启用" : "归档"}
                    </Badge>
                  </td>
                  <td className="cell-nowrap">{formatDate(fact.updatedAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => openEdit(fact)}
                        title="编辑"
                        aria-label={`编辑 ${fact.id}`}
                      >
                        <IconEdit size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => {
                          dispatch({
                            type: "SET_FACT_STATUS",
                            id: fact.id,
                            status:
                              fact.status === "active" ? "archived" : "active",
                          });
                          toast(
                            fact.status === "active"
                              ? `已归档 ${fact.id}。`
                              : `已恢复 ${fact.id}。`,
                            "info",
                          );
                        }}
                        title={fact.status === "active" ? "归档" : "恢复"}
                        aria-label={
                          fact.status === "active"
                            ? `归档 ${fact.id}`
                            : `恢复 ${fact.id}`
                        }
                      >
                        <IconArchive size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button danger-icon"
                        onClick={() => setDeleteTarget(fact)}
                        title="删除"
                        aria-label={`删除 ${fact.id}`}
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FactEditorModal
        open={editorOpen}
        fact={editing}
        facts={facts}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <ImportFactsModal
        open={importOpen}
        existingFacts={facts}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`删除 ${deleteTarget?.id ?? ""}？`}
        description="删除只影响资料库；已有运行使用的是当时的事实快照，不会被改写。"
        size="sm"
        footer={
          <div className="modal-footer-row">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (!deleteTarget) return;
                dispatch({ type: "DELETE_FACT", id: deleteTarget.id });
                toast(`已删除 ${deleteTarget.id}。`, "info");
                setDeleteTarget(null);
              }}
            >
              确认删除
            </Button>
          </div>
        }
      >
        <Notice tone="warning" compact>
          如果这张卡仍被草稿或示例引用，删除后相关引用会在下次检查时显示为“不在资料快照中”。
        </Notice>
      </Modal>
    </section>
  );
}
