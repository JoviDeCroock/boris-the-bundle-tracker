import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { RepositoriesModel } from "../../models/repositories";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

/** Format "owner/name" from two separate fields. */
function parseRepoInput(raw: string): { owner: string; name: string } | null {
  const parts = raw.trim().split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0].trim(), name: parts[1].trim() };
}

export function Dashboard() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const repos = useModel(RepositoriesModel);

  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      } else {
        repos.fetchRepositories();
      }
    });
  }, []);

  if (auth.loading.value) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-16 flex items-center justify-center">
        <p class="text-neutral-400 text-sm">Loading...</p>
      </div>
    );
  }

  async function handleAddRepo(e: Event) {
    e.preventDefault();
    setAddError(null);
    const parsed = parseRepoInput(addInput);
    if (!parsed) {
      setAddError('Enter a repository as "owner/name", e.g. "acme/my-app"');
      return;
    }
    setAddLoading(true);
    try {
      await repos.addRepo(parsed.owner, parsed.name);
      setAddInput("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add repository");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div class="min-h-screen bg-neutral-950 pt-16">
      <div class="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-white">Repositories</h1>
            <p class="text-sm text-neutral-400 mt-1">
              Track bundle-size evolution across your GitHub repositories.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => route("/billing")}>
            Billing
          </Button>
        </div>

        {/* Add repository */}
        <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 class="text-base font-semibold text-white mb-4">Add a repository</h2>
          <form onSubmit={handleAddRepo} class="flex gap-2">
            <Input
              type="text"
              placeholder="owner/repo — e.g. acme/my-app"
              value={addInput}
              onInput={(e) => setAddInput((e.target as HTMLInputElement).value)}
              class="flex-1"
            />
            <Button type="submit" disabled={!addInput.trim() || addLoading}>
              {addLoading ? "Adding…" : "Add"}
            </Button>
          </form>
          {addError && <p class="text-xs text-red-400 mt-2">{addError}</p>}
        </div>

        {/* Repository list */}
        <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-white">Tracked repositories</h2>
            <span class="text-xs text-neutral-500">{repos.repositories.value.length} linked</span>
          </div>

          {repos.reposLoading.value ? (
            <p class="text-sm text-neutral-500 text-center py-8">Loading…</p>
          ) : repos.reposError.value ? (
            <p class="text-sm text-red-400 text-center py-8">{repos.reposError.value}</p>
          ) : repos.repositories.value.length === 0 ? (
            <p class="text-sm text-neutral-500 text-center py-8">
              No repositories yet. Add one above to get started.
            </p>
          ) : (
            <ul class="divide-y divide-neutral-800">
              {repos.repositories.value.map((repo) => (
                <li
                  key={repo.id}
                  class="flex items-center justify-between py-3 group first:pt-0 last:pb-0"
                >
                  <button
                    class="text-left group/link"
                    onClick={() => route(`/repository/${repo.id}`)}
                  >
                    <span class="text-sm font-medium text-white group-hover/link:text-violet-400 transition-colors">
                      {repo.owner}/{repo.name}
                    </span>
                  </button>
                  <div class="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => route(`/repository/${repo.id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      variant="danger-icon"
                      onClick={async () => {
                        if (confirm(`Remove ${repo.owner}/${repo.name}?`)) {
                          await repos.removeRepo(repo.id);
                        }
                      }}
                      title="Remove repository"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
