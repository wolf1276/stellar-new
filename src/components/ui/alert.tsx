import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "destructive" | "success";

const variants: Record<Variant, string> = {
  default: "border-[var(--color-divider)] text-[var(--color-text)]",
  destructive: "border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  success: "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)]",
};

export function Alert({
  className,
  variant = "default",
  role,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      role={role ?? (variant === "destructive" ? "alert" : "status")}
      className={cn("border px-3 py-2 text-sm", variants[variant], className)}
      {...props}
    />
  );
}
