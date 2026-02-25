import { Button } from "../../../components/ui/Button";
import type { Repository } from "../../../lib/api";

type RepositoriesPanelProps = {
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  onOpen: (repositoryId: string) => void;
  onRemove: (repository: Repository) => void;
};

export function RepositoriesPanel({
  repositories,
  loading,
  error,
  onOpen,
  onRemove,
}: RepositoriesPanelProps) {
  return (
    <div class="rounded-xl border border-neutral-800 overflow-hidden" style="background: #111113;">
      <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60">
        <h2 class="text-xs font-mono text-neutral-400 uppercase tracking-wider">Tracked repositories</h2>
        <span class="font-mono text-xs text-neutral-500">{repositories.length} linked</span>
      </div>

      {loading ? (
        <div class="py-10 text-center">
          <span class="font-mono text-xs text-neutral-500">loading…</span>
        </div>
      ) : error ? (
        <div class="py-10 text-center">
          <span class="font-mono text-xs text-red-400">{error}</span>
        </div>
      ) : repositories.length === 0 ? (
        <div class="py-12 text-center px-5">
          <div class="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mx-auto mb-3">
            <svg class="w-5 h-5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <p class="text-sm text-neutral-400">No repositories yet.</p>
          <p class="text-xs text-neutral-500 mt-1">Add one above to start tracking.</p>
        </div>
      ) : (
        <ul class="divide-y divide-neutral-800/60">
          {repositories.map((repo) => (
            <li
              key={repo.id}
              class="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.015] transition-colors group"
            >
              <button class="text-left min-w-0" onClick={() => onOpen(repo.id)}>
                <span class="text-sm font-mono text-neutral-300 group-hover:text-white transition-colors">
                  <span class="text-neutral-500">{repo.owner}/</span>
                  {repo.name}
                </span>
              </button>
              <div class="flex items-center gap-1 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => onOpen(repo.id)}>
                  Open
                </Button>
                <Button variant="danger-icon" onClick={() => onRemove(repo)} title="Remove repository">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={1.5}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
