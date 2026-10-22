import type { ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo } from "./Icons";

export type NoticeTone = "info" | "success" | "warning" | "error";

export function Notice({
  tone = "info",
  title,
  children,
  action,
  compact = false,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  const Icon =
    tone === "success" ? IconCheck : tone === "info" ? IconInfo : IconAlert;
  return (
    <div
      className={`notice notice-${tone} ${compact ? "notice-compact" : ""}`.trim()}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
    >
      <span className="notice-icon">
        <Icon size={17} />
      </span>
      <div className="notice-body">
        {title ? <p className="notice-title">{title}</p> : null}
        {children ? <div className="notice-content">{children}</div> : null}
      </div>
      {action ? <div className="notice-action">{action}</div> : null}
    </div>
  );
}
