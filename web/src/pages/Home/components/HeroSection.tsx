type HeroSectionProps = {
  onGetStarted: () => void;
};

const PREVIEW_FILES = [
  {
    name: "dist/index.js",
    main: "41.2 KB",
    pr: "42.4 KB",
    diff: "+1.2 KB",
    pct: "+2.9%",
    up: true,
  },
  {
    name: "dist/vendor.js",
    main: "132.8 KB",
    pr: "128.7 KB",
    diff: "−4.1 KB",
    pct: "−3.1%",
    up: false,
  },
  { name: "dist/chunk-ui.js", main: "18.3 KB", pr: "18.3 KB", diff: null, pct: null, up: null },
  {
    name: "dist/chunk-react.js",
    main: "38.9 KB",
    pr: "39.1 KB",
    diff: "+0.2 KB",
    pct: "+0.5%",
    up: true,
  },
];

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section class="relative min-h-screen flex flex-col justify-center overflow-hidden bg-neutral-950">
      <div
        class="absolute inset-0 opacity-[0.035]"
        style="background-image: linear-gradient(rgba(249,115,22,1) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,1) 1px, transparent 1px); background-size: 52px 52px;"
      />
      <div
        class="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
        style="background: radial-gradient(ellipse at center, rgba(249,115,22,0.07) 0%, transparent 70%);"
      />

      <div class="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div
              class="anim-0 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-mono text-orange-400 mb-8 tracking-wide border border-orange-500/20"
              style="background: rgba(249,115,22,0.08);"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-orange-400 cursor-blink" />
              bundle sentinel active
            </div>

            <h1 class="anim-1 text-[clamp(3rem,6vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight text-white mb-6">
              Bundle sizes
              <br />
              <span style="color: #f97316;">under control.</span>
            </h1>

            <p class="anim-2 text-lg text-neutral-400 leading-relaxed mb-10 max-w-[42ch]">
              Boris watches your JavaScript bundle sizes across every pull request — so bloat is
              caught before it ships, not after.
            </p>

            <div class="anim-3 flex flex-wrap gap-3">
              <button
                onClick={onGetStarted}
                class="px-6 py-3 rounded-lg font-semibold leading-normal text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style="background: #f97316; box-shadow: 0 0 24px rgba(249,115,22,0.3);"
              >
                Start tracking free
              </button>
              <a
                href="#how-it-works"
                class="px-6 py-3 rounded-lg border leading-normal border-neutral-700 text-neutral-300 font-medium hover:border-neutral-500 hover:text-white transition-colors"
              >
                How it works ↓
              </a>
            </div>

            <div class="anim-4 flex items-center gap-6 mt-10 text-xs text-neutral-600 font-mono">
              <span>GitHub Action native</span>
              <span class="w-px h-3 bg-neutral-800" />
              <span>no credit card needed</span>
            </div>
          </div>

          <div class="anim-5">
            <BundleReportPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function BundleReportPreview() {
  return (
    <div
      class="rounded-2xl overflow-hidden border border-neutral-800"
      style="background: #111113; box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(249,115,22,0.06);"
    >
      <div
        class="flex items-center gap-2 px-4 py-3 border-b border-neutral-800/80"
        style="background: rgba(0,0,0,0.4);"
      >
        <div class="flex gap-1.5">
          <div class="w-3 h-3 rounded-full bg-neutral-700" />
          <div class="w-3 h-3 rounded-full bg-neutral-700" />
          <div class="w-3 h-3 rounded-full bg-neutral-700" />
        </div>
        <span class="ml-2 font-mono text-xs text-neutral-500 truncate">
          acme/my-app — PR #142 — bundle report
        </span>
        <span class="ml-auto font-mono text-xs text-orange-500/70 shrink-0">boris</span>
      </div>

      <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3 border-b border-neutral-800/50 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
        <span>file</span>
        <span class="text-right">main</span>
        <span class="text-right">pr</span>
        <span class="text-right">change</span>
      </div>

      <div class="divide-y divide-neutral-800/40">
        {PREVIEW_FILES.map((file) => (
          <div
            key={file.name}
            class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
          >
            <span class="font-mono text-xs text-neutral-400 truncate">{file.name}</span>
            <span class="font-mono text-xs text-neutral-600 text-right">{file.main}</span>
            <span class="font-mono text-xs text-neutral-300 text-right">{file.pr}</span>
            <span
              class={`font-mono text-xs text-right tabular-nums ${
                file.up === null ? "text-neutral-600" : file.up ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {file.diff ? `${file.diff} (${file.pct})` : "no change"}
            </span>
          </div>
        ))}
      </div>

      <div
        class="flex items-center justify-between px-5 py-3.5 border-t border-neutral-800/50"
        style="background: rgba(0,0,0,0.2);"
      >
        <span class="font-mono text-[10px] text-neutral-600">4 files · net −2.7 KB</span>
        <span class="font-mono text-[10px] text-orange-500/60">reported by boris ✓</span>
      </div>
    </div>
  );
}
