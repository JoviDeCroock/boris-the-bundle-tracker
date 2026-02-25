import { useMemo } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { PackageEvolution, ExportSizes } from "../../../lib/api";
import { formatBytes } from "./sizeUtils";

// ── Layout ──────────────────────────────────────────────────────────────────

interface LayoutItem {
  name: string;
  value: number;
  mainValue: number | null;
  prValue: number | null;
}

interface LayoutRect extends LayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Binary-split treemap layout.
 * Items must be pre-sorted descending by value.
 */
function layoutTreeMap(items: LayoutItem[], x: number, y: number, w: number, h: number): LayoutRect[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, i) => s + i.value, 0);

  // Find the split index where cumulative value crosses the half-way point
  let cumulative = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    cumulative += items[i].value;
    splitIdx = i + 1;
    if (cumulative >= total / 2) break;
  }

  const firstGroup = items.slice(0, splitIdx);
  const secondGroup = items.slice(splitIdx);
  const firstValue = firstGroup.reduce((s, i) => s + i.value, 0);
  const fraction = firstValue / total;

  if (w >= h) {
    return [
      ...layoutTreeMap(firstGroup, x, y, w * fraction, h),
      ...layoutTreeMap(secondGroup, x + w * fraction, y, w * (1 - fraction), h),
    ];
  }
  return [
    ...layoutTreeMap(firstGroup, x, y, w, h * fraction),
    ...layoutTreeMap(secondGroup, x, y + h * fraction, w, h * (1 - fraction)),
  ];
}

// ── Color helpers ────────────────────────────────────────────────────────────

function cellColor(mainValue: number | null, prValue: number | null): string {
  if (mainValue == null && prValue != null) return "#0d9488"; // teal: new export
  if (prValue == null && mainValue != null) return "#374151"; // dimmed: removed
  if (mainValue == null || prValue == null) return "#374151";

  const diff = prValue - mainValue;
  if (diff === 0) return "#1f2937"; // neutral dark

  const pct = Math.abs(diff) / mainValue;
  const intensity = Math.min(pct * 4, 1); // caps at 25% change → full saturation

  if (diff > 0) {
    // Grew → red
    const r = Math.round(127 + 128 * intensity);
    const g = Math.round(20 * (1 - intensity));
    return `rgb(${r},${g},20)`;
  }
  // Shrunk → green
  const g = Math.round(100 + 155 * intensity);
  return `rgb(20,${g},60)`;
}

function textColor(mainValue: number | null, prValue: number | null): string {
  if (prValue == null) return "#6b7280"; // gray for removed
  return "#e5e7eb";
}

// ── Data helpers ─────────────────────────────────────────────────────────────

function parseExportSizes(raw: string | null): ExportSizes | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExportSizes;
  } catch {
    return null;
  }
}

/**
 * Build a unified list of named exports from one evolution entry, merging
 * main-branch and PR-branch export size maps.
 */
function buildTreeMapItems(exportSizes: ExportSizes): LayoutItem[] {
  const allNames = new Set<string>([
    ...Object.keys(exportSizes.main ?? {}),
    ...Object.keys(exportSizes.pr ?? {}),
  ]);

  return [...allNames].map((name) => {
    const mainValue = exportSizes.main?.[name] ?? null;
    const prValue = exportSizes.pr?.[name] ?? null;
    const value = prValue ?? mainValue ?? 0;
    return { name, value, mainValue, prValue };
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

const PAD = 1.5; // gap between cells (px)

interface TreeMapCellProps {
  rect: LayoutRect;
  isHovered: boolean;
  onHover: (name: string | null) => void;
}

function TreeMapCell({ rect, isHovered, onHover }: TreeMapCellProps) {
  const { x, y, w, h, name, mainValue, prValue } = rect;
  const fill = cellColor(mainValue, prValue);
  const color = textColor(mainValue, prValue);
  const innerW = w - PAD * 2;
  const innerH = h - PAD * 2;
  const showLabel = innerW > 30 && innerH > 16;
  const showSize = innerW > 55 && innerH > 30;

  const displaySize = prValue ?? mainValue;

  return (
    <g
      onMouseEnter={() => onHover(name)}
      onMouseLeave={() => onHover(null)}
      style="cursor: default;"
    >
      <rect
        x={x + PAD}
        y={y + PAD}
        width={Math.max(0, innerW)}
        height={Math.max(0, innerH)}
        fill={fill}
        rx={3}
        opacity={isHovered ? 0.85 : 1}
        stroke={isHovered ? "#f97316" : "transparent"}
        stroke-width={isHovered ? 1.5 : 0}
      />
      {showLabel && (
        <text
          x={x + PAD + Math.min(8, innerW * 0.15)}
          y={y + PAD + Math.min(14, innerH * 0.45)}
          fill={color}
          font-size={Math.min(11, innerW * 0.18, innerH * 0.35)}
          font-family="monospace"
          dominant-baseline="auto"
          style="pointer-events: none; user-select: none;"
        >
          {name}
        </text>
      )}
      {showSize && displaySize != null && (
        <text
          x={x + PAD + Math.min(8, innerW * 0.15)}
          y={y + PAD + Math.min(26, innerH * 0.72)}
          fill={color}
          font-size={Math.min(9, innerW * 0.14, innerH * 0.28)}
          font-family="monospace"
          opacity={0.65}
          dominant-baseline="auto"
          style="pointer-events: none; user-select: none;"
        >
          {formatBytes(displaySize)}
        </text>
      )}
    </g>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipProps {
  item: LayoutItem | null;
}

function Tooltip({ item }: TooltipProps) {
  if (!item) return null;

  const diff =
    item.prValue != null && item.mainValue != null ? item.prValue - item.mainValue : null;
  const pct =
    diff != null && item.mainValue != null && item.mainValue > 0
      ? (diff / item.mainValue) * 100
      : null;

  return (
    <div class="rounded border border-neutral-700 bg-neutral-950/95 px-3 py-2 shadow-xl text-left min-w-[160px] pointer-events-none">
      <p class="font-mono text-xs text-white font-medium mb-1">{item.name}</p>
      {item.mainValue != null && (
        <p class="font-mono text-[11px] text-neutral-400">
          main: <span class="text-neutral-200">{formatBytes(item.mainValue)}</span>
        </p>
      )}
      {item.prValue != null && (
        <p class="font-mono text-[11px] text-neutral-400">
          pr: <span class="text-neutral-200">{formatBytes(item.prValue)}</span>
        </p>
      )}
      {diff != null && (
        <p
          class={`font-mono text-[11px] mt-1 ${
            diff === 0
              ? "text-neutral-600"
              : diff > 0
                ? "text-red-400"
                : "text-emerald-400"
          }`}
        >
          {diff > 0 ? "+" : diff < 0 ? "−" : ""}
          {formatBytes(Math.abs(diff))}
          {pct != null && ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`}
        </p>
      )}
      {item.prValue == null && item.mainValue != null && (
        <p class="font-mono text-[11px] text-neutral-500 mt-1">removed in PR</p>
      )}
      {item.mainValue == null && item.prValue != null && (
        <p class="font-mono text-[11px] text-teal-400 mt-1">new in PR</p>
      )}
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div class="flex flex-wrap gap-3 font-mono text-[10px] text-neutral-500">
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded-sm" style="background:#16a34a;" />
        shrunk
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded-sm" style="background:#b91c1c;" />
        grew
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded-sm" style="background:#0d9488;" />
        new
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded-sm" style="background:#374151;" />
        removed
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type ExportTreeMapProps = {
  evolutions: PackageEvolution[];
};

export function ExportTreeMap({ evolutions }: ExportTreeMapProps) {
  const WIDTH = 680;
  const HEIGHT = 280;

  // Group evolutions by PR, pick latest per (exportPath, fileName) key
  const prMap = useMemo(() => {
    const grouped = new Map<number, Map<string, PackageEvolution>>();
    for (const ev of evolutions) {
      const key = `${ev.exportPath}::${ev.fileName}`;
      const files = grouped.get(ev.prNumber) ?? new Map<string, PackageEvolution>();
      const existing = files.get(key);
      if (!existing || new Date(ev.reportedAt) > new Date(existing.reportedAt)) {
        files.set(key, ev);
      }
      grouped.set(ev.prNumber, files);
    }
    return grouped;
  }, [evolutions]);

  const prNumbers = useMemo(
    () => [...prMap.keys()].sort((a, b) => b - a),
    [prMap],
  );

  const selectedPr = useSignal<number | null>(prNumbers[0] ?? null);
  const hoveredName = useSignal<string | null>(null);
  const hoveredItem = useSignal<LayoutItem | null>(null);

  const { items, rects } = useMemo(() => {
    const pr = selectedPr.value;
    if (pr == null) return { items: [], rects: [] };

    const files = prMap.get(pr);
    if (!files) return { items: [], rects: [] };

    // Collect exportSizes from all files for this PR, merging by export name
    const mainAgg: Record<string, number> = {};
    const prAgg: Record<string, number> = {};

    for (const ev of files.values()) {
      const parsed = parseExportSizes(ev.exportSizes);
      if (!parsed) continue;
      if (parsed.main) {
        for (const [name, size] of Object.entries(parsed.main)) {
          mainAgg[name] = (mainAgg[name] ?? 0) + size;
        }
      }
      if (parsed.pr) {
        for (const [name, size] of Object.entries(parsed.pr)) {
          prAgg[name] = (prAgg[name] ?? 0) + size;
        }
      }
    }

    const mergedSizes: ExportSizes = {
      main: Object.keys(mainAgg).length ? mainAgg : null,
      pr: Object.keys(prAgg).length ? prAgg : null,
    };

    if (!mergedSizes.main && !mergedSizes.pr) return { items: [], rects: [] };

    const allItems = buildTreeMapItems(mergedSizes).sort((a, b) => b.value - a.value);
    const layouted = layoutTreeMap(allItems, 0, 0, WIDTH, HEIGHT);

    return { items: allItems, rects: layouted };
  }, [selectedPr.value, prMap]);

  if (prNumbers.length === 0) {
    return (
      <p class="font-mono text-xs text-neutral-700 py-4 text-center">
        No PR data available.
      </p>
    );
  }

  const hasData = items.length > 0;

  return (
    <div class="space-y-3">
      {/* PR selector */}
      <div class="flex items-center gap-3">
        <label class="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">PR</label>
        <select
          class="font-mono text-xs bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-300 focus:outline-none focus:border-neutral-500"
          value={selectedPr.value ?? ""}
          onChange={(e) => {
            const val = Number((e.target as HTMLSelectElement).value);
            selectedPr.value = val || null;
            hoveredName.value = null;
            hoveredItem.value = null;
          }}
        >
          {prNumbers.map((pr) => (
            <option key={pr} value={pr}>
              #{pr}
            </option>
          ))}
        </select>
        {!hasData && (() => {
          const prFiles = selectedPr.value != null ? prMap.get(selectedPr.value) : undefined;
          const statuses = prFiles ? [...prFiles.values()].map((ev) => ev.analysisStatus) : [];
          const allPending = statuses.length > 0 && statuses.every((s) => s === "pending");
          const anyFailed = statuses.some((s) => s === "failed");
          return (
            <span class="font-mono text-[11px] text-neutral-600">
              {allPending
                ? "⏳ Analysis queued — results will appear after server-side processing."
                : anyFailed
                  ? "Export analysis failed for this PR."
                  : "No export data for this PR — re-run the action to collect it."}
            </span>
          );
        })()}
      </div>

      {hasData && (
        <>
          {/* Tree-map SVG */}
          <div class="relative">
            <svg
              width={WIDTH}
              height={HEIGHT}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              style="max-width: 100%; display: block; border-radius: 6px; overflow: hidden;"
            >
              <rect width={WIDTH} height={HEIGHT} fill="#111113" rx={6} />
              {rects.map((rect) => (
                <TreeMapCell
                  key={rect.name}
                  rect={rect}
                  isHovered={hoveredName.value === rect.name}
                  onHover={(name) => {
                    hoveredName.value = name;
                    hoveredItem.value = name
                      ? (items.find((i) => i.name === name) ?? null)
                      : null;
                  }}
                />
              ))}
            </svg>

            {/* Tooltip — positioned bottom-left, always visible */}
            {hoveredItem.value && (
              <div class="absolute bottom-2 left-2">
                <Tooltip item={hoveredItem.value} />
              </div>
            )}
          </div>

          <Legend />
        </>
      )}
    </div>
  );
}
