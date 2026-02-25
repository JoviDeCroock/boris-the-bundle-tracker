import { Button } from "../../../components/ui/Button";
import { API_BASE_URL } from "../../../lib/constants";
import type { Repository } from "../../../lib/api";

const WORKFLOW_SNIPPET = `name: Boris Bundle Tracker
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Collect sizes & report to Boris
        uses: ./.github/actions/boris-bundle-tracker
        with:
          api-key: \${{ secrets.BORIS_API_KEY }}
          # Optional:
          # base-branch: main
          # working-directory: .
          # install-command: npm ci
          # build-command: npm run build`;

type SetupInstructionsPanelProps = {
  packageCount: number;
  setupExpanded: boolean;
  repository: Repository | undefined;
  onOpenActionFilesModal: () => void;
  onToggleExpanded: () => void;
};

export function SetupInstructionsPanel({
  packageCount,
  setupExpanded,
  repository,
  onOpenActionFilesModal,
  onToggleExpanded,
}: SetupInstructionsPanelProps) {
  const badgeUrl = repository
    ? `${API_BASE_URL}/api/badge/${repository.owner}/${repository.name}/<package-name>`
    : null;
  return (
    <section class="rounded-xl border border-neutral-800 overflow-hidden" style="background: #111113;">
      <div class="px-5 py-4 border-b border-neutral-800/60 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">GitHub Action setup</h2>
          <p class="text-xs text-neutral-700 mt-1">
            Store your API key as a GitHub secret named{" "}
            <code class="font-mono text-neutral-500 bg-neutral-800/60 px-1 rounded">BORIS_API_KEY</code>.
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          {packageCount > 0 && (
            <span class="font-mono text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              installed
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={onOpenActionFilesModal}>
            Copy action files
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggleExpanded}>
            {setupExpanded ? "Hide" : "Show"}
          </Button>
        </div>
      </div>
      {setupExpanded && (
        <div class="p-5 space-y-5">
          <div>
            <p class="font-mono text-xs text-neutral-700 mb-3">
              Add the action files to your repo (button above), then reference the local action in your
              workflow.
            </p>
            <pre
              class="rounded-lg border border-neutral-800/60 p-4 text-xs text-neutral-400 overflow-x-auto font-mono leading-relaxed"
              style="background: rgba(0,0,0,0.3);"
            >
              {WORKFLOW_SNIPPET}
            </pre>
          </div>

          {packageCount > 0 && badgeUrl && (
            <div>
              <p class="font-mono text-[10px] uppercase tracking-widest text-neutral-600 mb-2">
                README badge
              </p>
              <p class="font-mono text-xs text-neutral-700 mb-2">
                Embed a live bundle-size badge in your README. Replace{" "}
                <code class="text-neutral-500 bg-neutral-800/60 px-1 rounded">&lt;package-name&gt;</code>{" "}
                with the npm package name (URL-encode <code class="text-neutral-500 bg-neutral-800/60 px-1 rounded">@</code> as <code class="text-neutral-500 bg-neutral-800/60 px-1 rounded">%40</code>).
                Optional query params: <code class="text-neutral-500 bg-neutral-800/60 px-1 rounded">compression=raw|gzip|brotli</code>,{" "}
                <code class="text-neutral-500 bg-neutral-800/60 px-1 rounded">export=./client</code>,{" "}
                <code class="text-neutral-500 bg-neutral-800/60 px-1 rounded">label=my+label</code>.
              </p>
              <pre
                class="rounded-lg border border-neutral-800/60 p-4 text-xs text-neutral-400 overflow-x-auto font-mono leading-relaxed"
                style="background: rgba(0,0,0,0.3);"
              >{`![Bundle size](${badgeUrl})`}</pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
