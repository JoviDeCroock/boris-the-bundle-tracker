import { useSignal } from "@preact/signals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { createApiKey, deleteApiKey, listApiKeys } from "../../../lib/api";

type ApiKeysPanelProps = {
  repoId: string;
};

export function ApiKeysPanel({ repoId }: ApiKeysPanelProps) {
  const queryClient = useQueryClient();
  const newKeyName = useSignal("");
  const createError = useSignal<string | null>(null);
  const newKeyValue = useSignal<string | null>(null);
  const copyStatus = useSignal<string | null>(null);

  const apiKeysQuery = useQuery({
    queryKey: ["repositories", repoId, "api-keys"],
    queryFn: () => listApiKeys(repoId),
    enabled: Boolean(repoId),
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (name: string) => createApiKey(repoId, name),
    onSuccess: (key) => {
      newKeyValue.value = key.key ?? null;
      queryClient.invalidateQueries({ queryKey: ["repositories", repoId, "api-keys"] });
    },
  });

  const removeApiKeyMutation = useMutation({
    mutationFn: (keyId: string) => deleteApiKey(repoId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories", repoId, "api-keys"] });
    },
  });

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newKeyName.value.trim()) return;
    createError.value = null;
    try {
      await createApiKeyMutation.mutateAsync(newKeyName.value.trim());
      newKeyName.value = "";
    } catch (error) {
      createError.value = error instanceof Error ? error.message : "Failed to create key";
    }
  }

  async function handleCopyNewKey() {
    if (!newKeyValue.value) return;
    try {
      await navigator.clipboard.writeText(newKeyValue.value);
      copyStatus.value = "Copied";
      window.setTimeout(() => {
        if (copyStatus.value === "Copied") copyStatus.value = null;
      }, 1500);
    } catch {
      copyStatus.value = "Copy failed";
    }
  }

  return (
    <section class="rounded-xl border border-neutral-800 overflow-hidden" style="background: #111113;">
      <div class="px-5 py-4 border-b border-neutral-800/60">
        <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">API Keys</h2>
        <p class="text-xs text-neutral-700 mt-1">
          Used to authenticate the GitHub Action. Full key shown once at creation.
        </p>
      </div>

      <div class="p-5">
        {newKeyValue.value && (
          <div
            class="mb-5 p-4 rounded-lg border"
            style="background: rgba(34,197,94,0.05); border-color: rgba(34,197,94,0.2);"
          >
            <p class="font-mono text-xs text-emerald-400 mb-2">
              Copy this key now — it will not be shown again.
            </p>
            <code class="block text-xs text-emerald-300 break-all font-mono leading-relaxed">
              {newKeyValue.value}
            </code>
            <div class="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyNewKey}
                class="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
              >
                Copy API key
              </Button>
              {copyStatus.value && <span class="font-mono text-[11px] text-emerald-400">{copyStatus.value}</span>}
              <button
                class="font-mono text-xs text-emerald-600 hover:text-emerald-400 transition-colors"
                onClick={() => (newKeyValue.value = null)}
              >
                Dismiss ×
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} class="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Key name, e.g. CI"
            value={newKeyName.value}
            onInput={(e) => (newKeyName.value = (e.target as HTMLInputElement).value)}
            class="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newKeyName.value.trim() || createApiKeyMutation.isPending}
          >
            {createApiKeyMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </form>
        {createError.value && <p class="font-mono text-xs text-red-400 mb-4">{createError.value}</p>}

        {apiKeysQuery.isLoading ? (
          <p class="font-mono text-xs text-neutral-600 py-4 text-center">Loading…</p>
        ) : (apiKeysQuery.data ?? []).length === 0 ? (
          <p class="font-mono text-xs text-neutral-700 py-4 text-center">No API keys yet.</p>
        ) : (
          <ul class="divide-y divide-neutral-800/60">
            {(apiKeysQuery.data ?? []).map((key) => (
              <li key={key.id} class="flex items-center justify-between py-3 first:pt-0">
                <div class="min-w-0">
                  <p class="text-sm text-white font-medium">{key.name}</p>
                  <p class="font-mono text-xs text-neutral-600 mt-0.5">{key.keyPrefix}…</p>
                  {key.lastUsedAt && (
                    <p class="font-mono text-xs text-neutral-700 mt-0.5">
                      last used {new Date(key.lastUsedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="danger-icon"
                  onClick={async () => {
                    if (confirm(`Delete key "${key.name}"?`)) {
                      await removeApiKeyMutation.mutateAsync(key.id);
                    }
                  }}
                  title="Delete key"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={1.5}>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
