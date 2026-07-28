import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";

const variants: Record<Variant, string> = {
  default: "btn-primary",
  outline: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-danger",
};

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={cn("btn", variants[variant], className)} {...props} />
  );
}
