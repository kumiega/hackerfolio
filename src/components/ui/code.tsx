import { cn } from "@/lib/utils";
import * as React from "react";

interface CodeProps {
  children: React.ReactNode;
  className?: string;
}

function Code({ children, className }: CodeProps) {
  return (
    <span className={cn("font-mono bg-neutral-200 text-muted-foreground px-1 py-0.5 text-sm", className)}>
      {children}
    </span>
  );
}

export { Code };
