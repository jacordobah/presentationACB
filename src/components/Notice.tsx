import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type NoticeTone = "info" | "success" | "warning" | "error";

const ICONS = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === "error" ? "alert" : undefined}
    >
      <Icon size={22} aria-hidden="true" />
      <div className="notice__body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
