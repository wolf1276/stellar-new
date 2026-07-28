import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";

const variants: Record<Variant, string> = {
  default: "bg-foreground text-background hover:opacity-90",
  outline: "border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5",
  ghost: "hover:bg-black/5 dark:hover:bg-white/5",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
