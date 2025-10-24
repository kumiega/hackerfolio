function Code({ children }: { children: React.ReactNode }) {
  return <span className="font-mono bg-muted text-muted-foreground px-2 py-1 text-sm">{children}</span>;
}

export { Code };
