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
      <div class="min-h-screen bg-neutral-950 pt-14 flex items-center justify-center">
        <span class="font-mono text-xs text-neutral-600">loading...</span>
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
    <div class="min-h-screen bg-neutral-950 pt-14">
      <div class="max-w-3xl mx-auto px-6 py-10">
        {/* Page header */}
        <div class="mb-8">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-2">Dashboard</p>
          <h1 class="text-2xl font-bold text-white">Repositories</h1>
          <p class="text-sm text-neutral-600 mt-1">
            Track bundle-size evolution across your GitHub repositories.
          </p>
        </div>

        {/* Add repository */}
        <div class="rounded-xl border border-neutral-800 p-5 mb-5" style="background: #111113;">
          <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-3">
            Add repository
          </h2>
          <form onSubmit={handleAddRepo} class="flex gap-2">
            <Input
              type="text"
              placeholder="owner/repo"
              value={addInput}
              onInput={(e) => setAddInput((e.target as HTMLInputElement).value)}
              class="flex-1"
            />
            <Button type="submit" size="sm" disabled={!addInput.trim() || addLoading}>
              {addLoading ? "Adding…" : "Add"}
            </Button>
          </form>
          {addError && <p class="font-mono text-xs text-red-400 mt-2">{addError}</p>}
        </div>

        {/* Repository list */}
        <div
          class="rounded-xl border border-neutral-800 overflow-hidden"
          style="background: #111113;"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60">
            <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">
              Tracked repositories
            </h2>
            <span class="font-mono text-xs text-neutral-600">
              {repos.repositories.value.length} linked
            </span>
          </div>

          {repos.reposLoading.value ? (
            <div class="py-10 text-center">
              <span class="font-mono text-xs text-neutral-600">loading…</span>
            </div>
          ) : repos.reposError.value ? (
            <div class="py-10 text-center">
              <span class="font-mono text-xs text-red-400">{repos.reposError.value}</span>
            </div>
          ) : repos.repositories.value.length === 0 ? (
            <div class="py-12 text-center px-5">
              <div class="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                <svg
                  class="w-5 h-5 text-neutral-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <p class="text-sm text-neutral-600">No repositories yet.</p>
              <p class="text-xs text-neutral-700 mt-1">Add one above to start tracking.</p>
            </div>
          ) : (
            <ul class="divide-y divide-neutral-800/60">
              {repos.repositories.value.map((repo) => (
                <li
                  key={repo.id}
                  class="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.015] transition-colors group"
                >
                  <button class="text-left min-w-0" onClick={() => route(`/repository/${repo.id}`)}>
                    <span class="text-sm font-mono text-neutral-300 group-hover:text-white transition-colors">
                      <span class="text-neutral-600">{repo.owner}/</span>
                      {repo.name}
                    </span>
                  </button>
                  <div class="flex items-center gap-1 shrink-0">
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
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width={1.5}
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
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
