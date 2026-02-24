import { useSignal } from "@preact/signals";

const FAQ_ITEMS = [
  {
    question: "How does Boris integrate with my CI pipeline?",
    answer:
      "Boris provides a GitHub Action you add to your pull-request workflow. It builds your project, measures output sizes, and sends the report to Boris using a repository-scoped API key you create in the dashboard.",
  },
  {
    question: "Does Boris store my source code?",
    answer:
      "No. Boris only receives the file names and byte sizes you report via the action. Your code never leaves your CI environment.",
  },
  {
    question: 'What counts as a "package"?',
    answer:
      "A package maps to one entry in your build (e.g. a directory in a monorepo). You can track multiple packages per repository — each gets its own evolution history.",
  },
  {
    question: "Can I use Boris with non-GitHub repos?",
    answer:
      "The dashboard and API are Git-host agnostic, but the official action is built for GitHub Actions. GitLab CI / Bitbucket Pipelines support is on the roadmap.",
  },
];

export function FaqSection() {
  return (
    <section class="py-28 px-6" style="background: #0d0c0b;">
      <div class="max-w-3xl mx-auto">
        <div class="mb-14">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-3">FAQ</p>
          <h2 class="text-4xl font-bold text-white">Common questions.</h2>
        </div>
        <div class="space-y-2">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

type FaqItemProps = {
  question: string;
  answer: string;
};

function FaqItem({ question, answer }: FaqItemProps) {
  const open = useSignal(false);

  return (
    <div
      class="rounded-xl overflow-hidden border transition-colors"
      style={
        open.value
          ? "border-color: rgba(249,115,22,0.2); background: rgba(249,115,22,0.02);"
          : "border-color: rgba(255,255,255,0.06);"
      }
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
      {open.value && <div class="px-6 pb-5 text-sm text-neutral-500 leading-relaxed">{answer}</div>}
    </div>
  );
}
