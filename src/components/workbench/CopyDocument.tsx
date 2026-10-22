import type { ReactNode } from "react";
import type { Citation, FactCard } from "@/lib/domain/types";
import { charCount } from "@/lib/format";
import { extractCitationIds } from "@/lib/review/citations";
import { CitationChip } from "./CitationChip";

function Paragraph({
  text,
  citations,
  facts,
}: {
  text: string;
  citations: Citation[];
  facts: FactCard[];
}) {
  const parts = text.split(/(\[F-\d{3}\])/g);
  return (
    <p className="copy-paragraph">
      {parts.map((part, index) => {
        const match = part.match(/^\[F-(\d{3})\]$/);
        if (!match) return <span key={index}>{part}</span>;
        const factId = `F-${match[1]}`;
        const fact = facts.find((item) => item.id === factId);
        const citation = citations.find((item) => item.factId === factId);
        return (
          <CitationChip
            key={`${factId}-${index}`}
            factId={factId}
            fact={fact}
            quote={citation?.quote}
          />
        );
      })}
    </p>
  );
}

export function CopyDocument({
  title,
  body,
  tags,
  imageSuggestion,
  citations,
  facts,
  actions,
  kicker = "小红书图文 · 文案预览",
  showCitationTable = true,
  className = "",
}: {
  title: string;
  body: string;
  tags: string[];
  imageSuggestion: string[];
  citations: Citation[];
  facts: FactCard[];
  actions?: ReactNode;
  kicker?: string;
  showCitationTable?: boolean;
  className?: string;
}) {
  const bodyCitationIds = extractCitationIds(body);
  const paragraphs = body.split(/\n{2,}/).filter((item) => item.trim());
  const citationMap = new Map(
    citations.map((citation) => [citation.factId, citation]),
  );

  return (
    <article className={`copy-doc ${className}`.trim()}>
      <header className="copy-doc-head">
        <div className="copy-doc-kicker-row">
          <span className="copy-doc-kicker">{kicker}</span>
          <span className="copy-doc-meta">
            {charCount(body)} 字 · {bodyCitationIds.length} 个引用
          </span>
        </div>
        <h2 className="copy-doc-title">{title}</h2>
        {actions ? <div className="copy-doc-actions">{actions}</div> : null}
      </header>

      <div className="copy-doc-body">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <Paragraph
              key={index}
              text={paragraph}
              citations={citations}
              facts={facts}
            />
          ))
        ) : (
          <p className="muted">还没有正文。</p>
        )}
      </div>

      {tags.length > 0 ? (
        <div className="copy-doc-tags" aria-label="话题标签">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`tag ${tag.startsWith("#") ? "" : "tag-invalid"}`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="copy-doc-empty-note">还没有话题标签。</p>
      )}

      {imageSuggestion.length > 0 ? (
        <div className="copy-doc-images">
          <h3>配图建议</h3>
          <ol>
            {imageSuggestion.map((item, index) => (
              <li key={`${item}-${index}`}>
                <span className="image-frame" aria-hidden="true">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {showCitationTable && bodyCitationIds.length > 0 ? (
        <details className="citation-details">
          <summary>
            查看引用映射（{bodyCitationIds.length}）
            <span className="summary-hint">
              引用可定位到本次运行的事实卡快照
            </span>
          </summary>
          <div className="table-wrap">
            <table className="data-table citation-table">
              <thead>
                <tr>
                  <th>编号</th>
                  <th>事实卡</th>
                  <th>原文摘录</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                {bodyCitationIds.map((factId) => {
                  const fact = facts.find((item) => item.id === factId);
                  const citation = citationMap.get(factId);
                  return (
                    <tr key={factId}>
                      <td>
                        <code>{factId}</code>
                      </td>
                      <td>{fact?.title ?? "未在快照中找到"}</td>
                      <td className="quote-cell">
                        {citation?.quote ? (
                          citation.quote
                        ) : (
                          <span className="text-warn">
                            未提供原文摘录，需要人工核对
                          </span>
                        )}
                      </td>
                      <td>{fact?.sourceName ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </article>
  );
}
