import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeTone = "success" | "warning" | "sky" | "danger" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  success: "badge-success",
  warning: "badge-warning",
  sky: "badge-sky",
  danger: "badge-danger",
  neutral: "bg-slate-100 text-slate-700",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return <span className={cn("badge", toneClasses[tone], className)} {...props} />;
}
