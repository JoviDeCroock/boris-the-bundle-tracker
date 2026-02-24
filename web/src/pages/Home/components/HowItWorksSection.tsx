const WORKFLOW_STEPS = [
  {
    num: "01",
    title: "Link your repository",
    desc: "Connect any GitHub repository from your Boris dashboard.",
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

export function HowItWorksSection() {
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
          {WORKFLOW_STEPS.map((step) => (
            <div key={step.num} class="py-8 md:px-10 first:pl-0 last:pr-0">
              <div class="font-mono text-5xl font-bold text-neutral-800 mb-6 leading-none">{step.num}</div>
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
