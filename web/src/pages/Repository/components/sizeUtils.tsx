export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function diffBadge(mainSize: number, prSize: number) {
  const diff = prSize - mainSize;
  const pct = mainSize === 0 ? 0 : (diff / mainSize) * 100;
  const label = diff >= 0 ? `+${formatBytes(diff)}` : `−${formatBytes(Math.abs(diff))}`;
  const pctLabel = `(${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;

  if (diff === 0) {
    return <span class="font-mono text-xs text-neutral-600">no change</span>;
  }
  if (diff > 0) {
    return (
      <span class="font-mono text-xs text-red-400 tabular-nums">
        {label} {pctLabel}
      </span>
    );
  }
  return (
    <span class="font-mono text-xs text-emerald-400 tabular-nums">
      {label} {pctLabel}
    </span>
  );
}

type SizeCellProps = {
  raw: number;
  gzip: number | null;
  brotli: number | null;
};

export function SizeCell({ raw, gzip, brotli }: SizeCellProps) {
  return (
    <div class="font-mono text-xs space-y-0.5 text-right tabular-nums">
      <div class="text-neutral-300">{formatBytes(raw)}</div>
      {gzip != null && (
        <div class="text-neutral-500">
          {formatBytes(gzip)} <span class="text-neutral-600">gz</span>
        </div>
      )}
      {brotli != null && (
        <div class="text-neutral-500">
          {formatBytes(brotli)} <span class="text-neutral-600">br</span>
        </div>
      )}
    </div>
  );
}
