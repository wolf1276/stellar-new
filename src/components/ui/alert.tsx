import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "destructive" | "success";

const variants: Record<Variant, string> = {
  default: "border-black/10 dark:border-white/10 text-foreground",
  destructive: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  success: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
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
      className={cn("rounded-lg border px-3 py-2 text-sm", variants[variant], className)}
      {...props}
    />
  );
}
