import { useSignal } from "@preact/signals";
import type { PackageEvolution } from "../lib/api";

type CompressionMode = "raw" | "gzip" | "brotli";

interface TooltipState {
  x: number;
  y: number;
  prNumber: number;
  prTitle: string | null;
  fileName: string;
  size: number;
}

interface Props {
  evolutions: PackageEvolution[];
}

const COLORS = [
  "#f97316",
  "#10b981",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#fbbf24",
  "#34d399",
  "#e879f9",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getSize(ev: PackageEvolution, mode: CompressionMode): number | null {
  if (mode === "gzip") return ev.gzipPrSize;
  if (mode === "brotli") return ev.brotliPrSize;
  return ev.prSize;
}

function niceAxisMax(rawMax: number): number {
  if (rawMax === 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalised = rawMax / magnitude;
  const nice =
    normalised <= 1.5 ? 1.5 : normalised <= 2 ? 2 : normalised <= 3 ? 3 : normalised <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function BundleSizeChart({ evolutions }: Props) {
  const mode = useSignal<CompressionMode>("gzip");
  const tooltip = useSignal<TooltipState | null>(null);

  // Only show merged PRs, deduplicated to latest measurement per (prNumber, file key)
  const mergedLatest = new Map<string, PackageEvolution>();
  for (const ev of evolutions) {
    if (!ev.prMerged) continue;
    const k = `${ev.prNumber}::${ev.exportPath}::${ev.fileName}`;
    const existing = mergedLatest.get(k);
    if (!existing || ev.reportedAt > existing.reportedAt) {
      mergedLatest.set(k, ev);
    }
  }

  // Group by file key (exportPath + fileName)
  const fileMap = new Map<string, PackageEvolution[]>();
  for (const ev of mergedLatest.values()) {
    const fileKey = `${ev.exportPath}::${ev.fileName}`;
    const arr = fileMap.get(fileKey) ?? [];
    arr.push(ev);
    fileMap.set(fileKey, arr);
  }
  for (const arr of fileMap.values()) {
    arr.sort((a, b) => a.prNumber - b.prNumber);
  }

  const fileKeys = Array.from(fileMap.keys());

  // Check mode availability
  const hasModeData = fileKeys.some((fk) =>
    fileMap.get(fk)!.some((ev) => getSize(ev, mode.value) != null),
  );

  // Effective mode: fall back to raw if no data for selected mode
  const effectiveMode: CompressionMode = hasModeData ? mode.value : "raw";

  if (fileKeys.length === 0) return null;

  // Chart layout constants
  const W = 760;
  const H = 260;
  const PAD_L = 64;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 56;
  const PW = W - PAD_L - PAD_R;
  const PH = H - PAD_T - PAD_B;

  // Collect all unique PR numbers across files, sorted
  const allPrNums = Array.from(new Set([...mergedLatest.values()].map((ev) => ev.prNumber))).sort(
    (a, b) => a - b,
  );

  const xOf = (prNum: number): number => {
    const i = allPrNums.indexOf(prNum);
    if (allPrNums.length <= 1) return PAD_L + PW / 2;
    return PAD_L + (i / (allPrNums.length - 1)) * PW;
  };

  // Y domain
  const allSizes: number[] = [];
  for (const evs of fileMap.values()) {
    for (const ev of evs) {
      const s = getSize(ev, effectiveMode);
      if (s != null) allSizes.push(s);
    }
  }
  const yMax = niceAxisMax(Math.max(...allSizes));
  const yOf = (v: number): number => PAD_T + PH - (v / yMax) * PH;

  // Y-axis ticks (6 levels)
  const TICK_COUNT = 5;
  const yTicks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (i / TICK_COUNT) * yMax);

  // X-axis label density (avoid overcrowding)
  const xLabelEvery = Math.ceil(allPrNums.length / 10);

  return (
    <div class="space-y-3">
      {/* Header row: title + mode toggle */}
      <div class="flex items-center justify-between gap-3">
        <span class="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
          Bundle size evolution · merged PRs
        </span>
        <div class="flex gap-1">
          {(["raw", "gzip", "brotli"] as CompressionMode[]).map((m) => (
            <button
              key={m}
              onClick={() => (mode.value = m)}
              class={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                mode.value === m
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  : "text-neutral-700 hover:text-neutral-400 border border-transparent"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Fallback notice */}
      {!hasModeData && mode.value !== "raw" && (
        <p class="font-mono text-[10px] text-neutral-700">
          No {mode.value} data available — showing raw sizes.
        </p>
      )}

      {/* SVG chart */}
      <div
        class="overflow-x-auto rounded-lg border border-neutral-800/60"
        style="background: rgba(0,0,0,0.25);"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style="min-width: 420px; display: block;"
          class="select-none"
        >
          {/* Y grid lines + labels */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_L}
                y1={yOf(tick)}
                x2={PAD_L + PW}
                y2={yOf(tick)}
                stroke="rgba(255,255,255,0.04)"
                stroke-width="1"
              />
              <text
                x={PAD_L - 8}
                y={yOf(tick)}
                text-anchor="end"
                dominant-baseline="middle"
                fill="#404040"
                font-family="ui-monospace,monospace"
                font-size="10"
              >
                {formatBytes(tick)}
              </text>
            </g>
          ))}

          {/* X axis baseline */}
          <line
            x1={PAD_L}
            y1={PAD_T + PH}
            x2={PAD_L + PW}
            y2={PAD_T + PH}
            stroke="rgba(255,255,255,0.08)"
            stroke-width="1"
          />

          {/* Y axis */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + PH}
            stroke="rgba(255,255,255,0.08)"
            stroke-width="1"
          />

          {/* X-axis labels */}
          {allPrNums.map((pr, i) => {
            if (i % xLabelEvery !== 0 && i !== allPrNums.length - 1) return null;
            return (
              <text
                key={pr}
                x={xOf(pr)}
                y={PAD_T + PH + 18}
                text-anchor="middle"
                fill="#404040"
                font-family="ui-monospace,monospace"
                font-size="10"
              >
                #{pr}
              </text>
            );
          })}

          {/* Lines and dots per file */}
          {fileKeys.map((fileKey, fi) => {
            const evs = fileMap.get(fileKey)!;
            const color = COLORS[fi % COLORS.length];

            const points = evs
              .map((ev) => {
                const size = getSize(ev, effectiveMode);
                if (size == null) return null;
                return { x: xOf(ev.prNumber), y: yOf(size), ev, size };
              })
              .filter(Boolean) as { x: number; y: number; ev: PackageEvolution; size: number }[];

            if (points.length === 0) return null;

            const pathD = points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(" ");

            return (
              <g key={fileKey}>
                {/* Area fill under line */}
                <path
                  d={`${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(PAD_T + PH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD_T + PH).toFixed(1)} Z`}
                  fill={color}
                  fill-opacity="0.05"
                />
                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                {/* Dots */}
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill={color}
                    stroke="#111113"
                    stroke-width="1.5"
                    style="cursor: pointer;"
                    onMouseEnter={() =>
                      tooltip.value = {
                        x: p.x,
                        y: p.y,
                        prNumber: p.ev.prNumber,
                        prTitle: p.ev.prTitle,
                        fileName: p.ev.fileName,
                        size: p.size,
                      }
                    }
                    onMouseLeave={() => (tooltip.value = null)}
                  />
                ))}
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip &&
            (() => {
              const TW = 180;
              const TH = tooltip.value.prTitle ? 44 : 30;
              const tx = Math.min(tooltip.value.x + 10, W - TW - 4);
              const ty = Math.max(tooltip.value.y - TH - 8, 4);
              return (
                <g style="pointer-events: none;">
                  <rect
                    x={tx}
                    y={ty}
                    width={TW}
                    height={TH}
                    rx="4"
                    fill="#1c1c1e"
                    stroke="rgba(255,255,255,0.1)"
                    stroke-width="0.5"
                  />
                  <text
                    x={tx + 8}
                    y={ty + 13}
                    fill="#d4d4d4"
                    font-family="ui-monospace,monospace"
                    font-size="10"
                    font-weight="600"
                  >
                    #{tooltip.value.prNumber} · {formatBytes(tooltip.value.size)}
                  </text>
                  {tooltip.value.prTitle && (
                    <text
                      x={tx + 8}
                      y={ty + 29}
                      fill="#737373"
                      font-family="ui-monospace,monospace"
                      font-size="9"
                    >
                      {tooltip.value.prTitle.length > 22
                        ? tooltip.value.prTitle.slice(0, 22) + "…"
                        : tooltip.value.prTitle}
                    </text>
                  )}
                </g>
              );
            })()}
        </svg>
      </div>

      {/* Legend */}
      {fileKeys.length > 1 && (
        <div class="flex flex-wrap gap-x-4 gap-y-1.5">
          {fileKeys.map((fileKey, fi) => {
            const [exportPath, fileName] = fileKey.split("::");
            const label = exportPath === "." ? fileName : `${exportPath}/${fileName}`;
            return (
              <div key={fileKey} class="flex items-center gap-1.5">
                <svg width="16" height="2" class="shrink-0" style="overflow: visible;">
                  <line
                    x1="0"
                    y1="1"
                    x2="16"
                    y2="1"
                    stroke={COLORS[fi % COLORS.length]}
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                <span class="font-mono text-[10px] text-neutral-600">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
