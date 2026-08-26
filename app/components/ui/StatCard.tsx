import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "blue" | "amber" | "green" | "slate";
}

const toneClasses = {
  blue: "bg-blue-50 text-blue-800",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
};

export function StatCard({ label, value, icon: Icon, tone = "slate" }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4 p-5">
      {Icon && (
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", toneClasses[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
