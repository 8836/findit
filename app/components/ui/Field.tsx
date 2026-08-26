import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

function Label({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={id}
      className="mb-2 block text-sm font-semibold uppercase tracking-[0.14em] text-slate-600"
    >
      {children}
    </label>
  );
}

export function TextField({
  label,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <Label id={id}>{label}</Label>
      <input id={id} className={cn(className)} {...props} />
    </div>
  );
}

export function TextAreaField({
  label,
  id,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div>
      <Label id={id}>{label}</Label>
      <textarea id={id} className={cn("min-h-28 resize-y", className)} {...props} />
    </div>
  );
}

export function SelectField({
  label,
  id,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div>
      <Label id={id}>{label}</Label>
      <select id={id} className={cn(className)} {...props}>
        {children}
      </select>
    </div>
  );
}
