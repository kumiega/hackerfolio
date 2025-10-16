import { cn } from "@/lib/utils";

const Callout = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <p className={cn("callout text-sm sm:text-base text-primary", className)}>{children}</p>;
};

export { Callout };
