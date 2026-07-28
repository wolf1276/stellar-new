import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5 shadow-sm",
        className
      )}
      {...props}
    />
  );
}
