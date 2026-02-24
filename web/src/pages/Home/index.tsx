import { useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";

export function Home() {
  const { route } = useLocation();

  return (
    <>
      <Hero onGetStarted={() => route("/dashboard")} />
      <Features />
      <HowItWorks />
      <Pricing onGetStarted={() => route("/dashboard")} />
      <FAQ />
    </>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section class="relative min-h-screen flex flex-col justify-center overflow-hidden bg-neutral-950">
      {/* Warm grid */}
      <div
        class="absolute inset-0 opacity-[0.035]"
        style="background-image: linear-gradient(rgba(249,115,22,1) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,1) 1px, transparent 1px); background-size: 52px 52px;"
      />
      {/* Glow blob */}
      <div
        class="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
        style="background: radial-gradient(ellipse at center, rgba(249,115,22,0.07) 0%, transparent 70%);"
      />

      <div class="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left */}
          <div>
            <div class="anim-0 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-mono text-orange-400 mb-8 tracking-wide border border-orange-500/20" style="background: rgba(249,115,22,0.08);">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-400 cursor-blink" />
              bundle sentinel active
            </div>

            <h1 class="anim-1 text-[clamp(3rem,6vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight text-white mb-6">
              Bundle sizes
              <br />
              <span style="color: #f97316;">under control.</span>
            </h1>

            <p class="anim-2 text-lg text-neutral-400 leading-relaxed mb-10 max-w-[42ch]">
              Boris watches your JavaScript bundle sizes across every pull
              request — so bloat is caught before it ships, not after.
            </p>

            <div class="anim-3 flex flex-wrap gap-3">
              <button
                onClick={onGetStarted}
                class="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style="background: #f97316; box-shadow: 0 0 24px rgba(249,115,22,0.3);"
              >
                Start tracking free
              </button>
              <a
                href="#how-it-works"
                class="px-6 py-3 rounded-lg border border-neutral-700 text-neutral-300 font-medium hover:border-neutral-500 hover:text-white transition-colors"
              >
                How it works ↓
              </a>
            </div>

            <div class="anim-4 flex items-center gap-6 mt-10 text-xs text-neutral-600 font-mono">
              <span>3 repos free</span>
              <span class="w-px h-3 bg-neutral-800" />
              <span>no credit card needed</span>
              <span class="w-px h-3 bg-neutral-800" />
              <span>GitHub Action native</span>
            </div>
          </div>

          {/* Right — PR report preview */}
          <div class="anim-5">
            <BundleReportPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function BundleReportPreview() {
  const files = [
    { name: "dist/index.js", main: "41.2 KB", pr: "42.4 KB", diff: "+1.2 KB", pct: "+2.9%", up: true },
    { name: "dist/vendor.js", main: "132.8 KB", pr: "128.7 KB", diff: "−4.1 KB", pct: "−3.1%", up: false },
    { name: "dist/chunk-ui.js", main: "18.3 KB", pr: "18.3 KB", diff: null, pct: null, up: null },
    { name: "dist/chunk-react.js", main: "38.9 KB", pr: "39.1 KB", diff: "+0.2 KB", pct: "+0.5%", up: true },
  ];

  return (
    <div
      class="rounded-2xl overflow-hidden border border-neutral-800"
      style="background: #111113; box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(249,115,22,0.06);"
    >
      {/* Title bar */}
      <div class="flex items-center gap-2 px-4 py-3 border-b border-neutral-800/80" style="background: rgba(0,0,0,0.4);">
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

      {/* Header row */}
      <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3 border-b border-neutral-800/50 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
        <span>file</span>
        <span class="text-right">main</span>
        <span class="text-right">pr</span>
        <span class="text-right">change</span>
      </div>

      {/* Rows */}
      <div class="divide-y divide-neutral-800/40">
        {files.map((f) => (
          <div key={f.name} class="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
            <span class="font-mono text-xs text-neutral-400 truncate">{f.name}</span>
            <span class="font-mono text-xs text-neutral-600 text-right">{f.main}</span>
            <span class="font-mono text-xs text-neutral-300 text-right">{f.pr}</span>
            <span
              class={`font-mono text-xs text-right tabular-nums ${
                f.up === null
                  ? "text-neutral-600"
                  : f.up
                  ? "text-red-400"
                  : "text-emerald-400"
              }`}
            >
              {f.diff ? `${f.diff} (${f.pct})` : "no change"}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div class="flex items-center justify-between px-5 py-3.5 border-t border-neutral-800/50" style="background: rgba(0,0,0,0.2);">
        <span class="font-mono text-[10px] text-neutral-600">4 files · net −2.7 KB</span>
        <span class="font-mono text-[10px] text-orange-500/60">reported by boris ✓</span>
      </div>
    </div>
  );
}

function Features() {
  const items = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      title: "Per-PR bundle reports",
      desc: "Every pull request gets a precise size breakdown. Know immediately if a dependency change ballooned your bundle.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Historical evolution",
      desc: "Track bundle trends across months and see which PRs introduced growth. Spot regressions, not just symptoms.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      title: "GitHub Action native",
      desc: "One workflow step. Drop the action into your existing CI and Boris handles the rest — no servers to manage.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
      title: "Package-level granularity",
      desc: "Monorepo? No problem. Track each package independently and understand exactly where size growth originates.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      ),
      title: "Scoped API keys",
      desc: "Generate repository-scoped keys for your CI pipeline. SHA-256 hashed at rest, revocable any time.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Free to start",
      desc: "Track three repositories at no cost, no credit card. Upgrade to Pro only when your team outgrows it.",
    },
  ];

  return (
    <section id="features" class="py-28 px-6 bg-neutral-950">
      <div class="max-w-6xl mx-auto">
        <div class="mb-16">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-3">Capabilities</p>
          <h2 class="text-4xl md:text-5xl font-bold text-white leading-tight">
            Everything you need
            <br />
            to stay lean.
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-neutral-800" style="background: #1a1a1a;">
          {items.map((item) => (
            <div
              key={item.title}
              class="bg-neutral-950 p-7 hover:bg-neutral-900/60 transition-colors group"
            >
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center mb-5 text-orange-400 transition-colors group-hover:text-orange-300"
                style="background: rgba(249,115,22,0.1);"
              >
                {item.icon}
              </div>
              <h3 class="text-base font-semibold text-white mb-2">{item.title}</h3>
              <p class="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Link your repository",
      desc: "Connect any GitHub repository from your Boris dashboard. Free plan includes up to 3 repos.",
      detail: "Dashboard → Add repository → owner/repo",
    },
    {
      num: "02",
      title: "Add the GitHub Action",
      desc: "Drop one step into your pull-request workflow. Boris builds, measures, and reports sizes automatically.",
      detail: "uses: JoviDeCroock/boris-the-bundle-tracker/action@main",
    },
    {
      num: "03",
      title: "Boris reports on every PR",
      desc: "Every pull request gets a full size breakdown. Historical data builds up over time so you can spot trends.",
      detail: "dist/index.js  42.3 KB  +1.2 KB (+2.9%)",
    },
  ];

  return (
    <section id="how-it-works" class="py-28 px-6" style="background: #0d0c0b;">
      <div class="max-w-6xl mx-auto">
        <div class="mb-16">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-3">Workflow</p>
          <h2 class="text-4xl md:text-5xl font-bold text-white leading-tight">
            Up and running
            <br />
            in minutes.
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-neutral-800">
          {steps.map((step) => (
            <div key={step.num} class="py-8 md:px-10 first:pl-0 last:pr-0">
              <div class="font-mono text-5xl font-bold text-neutral-800 mb-6 leading-none">
                {step.num}
              </div>
              <h3 class="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p class="text-sm text-neutral-500 leading-relaxed mb-5">{step.desc}</p>
              <div
                class="font-mono text-xs text-orange-400/70 px-3 py-2 rounded-md border border-orange-500/10 truncate"
                style="background: rgba(249,115,22,0.04);"
              >
                {step.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section id="pricing" class="py-28 px-6 bg-neutral-950">
      <div class="max-w-6xl mx-auto">
        <div class="mb-16">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-3">Pricing</p>
          <h2 class="text-4xl md:text-5xl font-bold text-white leading-tight">
            Simple, honest
            <br />
            pricing.
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {/* Free */}
          <div class="rounded-2xl border border-neutral-800 p-8 flex flex-col" style="background: #111113;">
            <div class="mb-6">
              <h3 class="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-3">Free</h3>
              <p class="text-5xl font-bold text-white">
                $0<span class="text-lg font-normal text-neutral-600">/mo</span>
              </p>
            </div>
            <ul class="space-y-3 mb-8 flex-1">
              {["3 repositories", "2 API keys per repo", "30 days of history", "GitHub Action support", "Community support"].map((f) => (
                <li key={f} class="flex items-center gap-2.5 text-sm text-neutral-400">
                  <svg class="w-4 h-4 text-neutral-600 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 6.237l-4 4.5a.75.75 0 01-1.105.026l-2-2a.75.75 0 111.06-1.06l1.44 1.44 3.47-3.908a.75.75 0 011.135.982z" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={onGetStarted}
              class="w-full py-3 rounded-lg border border-neutral-700 text-neutral-300 font-medium hover:border-neutral-500 hover:text-white transition-colors text-sm"
            >
              Get started free
            </button>
          </div>

          {/* Pro */}
          <div
            class="rounded-2xl p-8 flex flex-col relative"
            style="background: #111113; border: 1px solid rgba(249,115,22,0.3); box-shadow: 0 0 40px rgba(249,115,22,0.06);"
          >
            <div
              class="absolute -top-3 left-6 font-mono text-xs px-3 py-1 rounded-full font-semibold"
              style="background: #f97316; color: #431407;"
            >
              Pro
            </div>
            <div class="mb-6">
              <h3 class="text-xs font-mono text-orange-500/70 uppercase tracking-widest mb-3">Pro</h3>
              <p class="text-5xl font-bold text-white">
                $10<span class="text-lg font-normal text-neutral-600">/mo</span>
              </p>
            </div>
            <ul class="space-y-3 mb-8 flex-1">
              {["50 repositories", "10 API keys per repo", "365 days of history", "GitHub Action support", "Priority support"].map((f) => (
                <li key={f} class="flex items-center gap-2.5 text-sm text-neutral-300">
                  <svg class="w-4 h-4 text-orange-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 6.237l-4 4.5a.75.75 0 01-1.105.026l-2-2a.75.75 0 111.06-1.06l1.44 1.44 3.47-3.908a.75.75 0 011.135.982z" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={onGetStarted}
              class="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
              style="background: #f97316; box-shadow: 0 0 20px rgba(249,115,22,0.25);"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "How does Boris integrate with my CI pipeline?",
      a: "Boris provides a GitHub Action you add to your pull-request workflow. It builds your project, measures output sizes, and sends the report to Boris using a repository-scoped API key you create in the dashboard.",
    },
    {
      q: "Does Boris store my source code?",
      a: "No. Boris only receives the file names and byte sizes you report via the action. Your code never leaves your CI environment.",
    },
    {
      q: "What counts as a \"package\"?",
      a: "A package maps to one entry in your build (e.g. a directory in a monorepo). You can track multiple packages per repository — each gets its own evolution history.",
    },
    {
      q: "How does billing work?",
      a: "Billing is handled through Polar. You can upgrade, downgrade, or cancel at any time from the billing page. Upgrades take effect immediately.",
    },
    {
      q: "Can I use Boris with non-GitHub repos?",
      a: "The dashboard and API are Git-host agnostic, but the official action is built for GitHub Actions. GitLab CI / Bitbucket Pipelines support is on the roadmap.",
    },
    {
      q: "What does 'history' mean in the plan limits?",
      a: "History is the number of days Boris retains your PR evolution data. Free plan keeps 30 days; Pro keeps a full year, so you can see seasonal trends and long-term drift.",
    },
  ];

  return (
    <section class="py-28 px-6" style="background: #0d0c0b;">
      <div class="max-w-3xl mx-auto">
        <div class="mb-14">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-3">FAQ</p>
          <h2 class="text-4xl font-bold text-white">Common questions.</h2>
        </div>
        <div class="space-y-2">
          {items.map((item) => (
            <FAQItem key={item.q} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const open = useSignal(false);

  return (
    <div
      class="rounded-xl overflow-hidden border transition-colors"
      style={open.value ? "border-color: rgba(249,115,22,0.2); background: rgba(249,115,22,0.02);" : "border-color: rgba(255,255,255,0.06);"}
    >
      <button
        class="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
        onClick={() => (open.value = !open.value)}
      >
        <span class="font-medium text-sm text-white">{question}</span>
        <svg
          class={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${open.value ? "rotate-45" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width={2}
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {open.value && (
        <div class="px-6 pb-5 text-sm text-neutral-500 leading-relaxed">{answer}</div>
      )}
    </div>
  );
}
