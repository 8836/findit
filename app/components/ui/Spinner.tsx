import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-slate-500", className)} role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label && <span>{label}</span>}
      <span className="sr-only">Loading...</span>
    </span>
  );
}
