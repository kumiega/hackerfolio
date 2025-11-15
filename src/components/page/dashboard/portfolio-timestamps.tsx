interface PortfolioTimestampsProps {
  lastPublishedAt: string | null;
  lastSavedAt: string | null;
  formatTimestamp: (timestamp: string | null) => string | null;
}

export function PortfolioTimestamps({ lastPublishedAt, lastSavedAt, formatTimestamp }: PortfolioTimestampsProps) {
  return (
    <div className="text-[12px] font-mono mt-4 space-y-1 lg:flex flex-wrap gap-8 justify-between">
      {lastPublishedAt && <div className="text-primary">Last published: {formatTimestamp(lastPublishedAt)}</div>}

      <div className="text-muted-foreground ms-auto">Last saved: {formatTimestamp(lastSavedAt)}</div>
    </div>
  );
}
