import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "purple"
  | "outline";

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`badge badge-${tone} ${className}`.trim()}>
      {dot ? <span className="badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: "pass" | "warn" | "fail";
}) {
  const tone: BadgeTone =
    status === "pass" ? "green" : status === "warn" ? "amber" : "red";
  return (
    <Badge tone={tone} dot>
      {status === "pass" ? "通过" : status === "warn" ? "提醒" : "未通过"}
    </Badge>
  );
}
