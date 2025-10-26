import { cn } from "@/lib/utils";

function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono bg-neutral-200 text-muted-foreground px-1 py-0.5 text-sm", className)}>
      {children}
    </span>
  );
}

export { Code };
