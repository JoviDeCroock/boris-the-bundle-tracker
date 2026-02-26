import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { Button } from "../../../components/ui/Button";
import { Input, Label, LabelText } from "../../../components/ui/Input";
import type { Persona } from "../../../lib/api";

type Step = "details" | "repository" | "done";

type CreatePersonaModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description?: string;
    repoOwner?: string;
    repoName?: string;
  }) => Promise<Persona>;
  onViewPersona: (personaId: string) => void;
};

export function CreatePersonaModal({
  open,
  onClose,
  onCreate,
  onViewPersona,
}: CreatePersonaModalProps) {
  const step = useSignal<Step>("details");
  const name = useSignal("");
  const description = useSignal("");
  const repoInput = useSignal("");
  const error = useSignal<string | null>(null);
  const loading = useSignal(false);
  const createdPersona = useSignal<Persona | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      step.value = "details";
      name.value = "";
      description.value = "";
      repoInput.value = "";
      error.value = null;
      loading.value = false;
      createdPersona.value = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function parseRepoInput(value: string): { owner: string; repoName: string } | null {
    // Accept "owner/name" or a full GitHub URL
    const trimmed = value.trim();
    const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) return { owner: urlMatch[1], repoName: urlMatch[2].replace(/\.git$/, "") };
    const slashMatch = trimmed.match(/^([\w.\-]+)\/([\w.\-]+)$/);
    if (slashMatch) return { owner: slashMatch[1], repoName: slashMatch[2] };
    return null;
  }

  async function handleDetailsNext(e: Event) {
    e.preventDefault();
    error.value = null;
    if (!name.value.trim()) {
      error.value = "A name is required.";
      return;
    }
    step.value = "repository";
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    error.value = null;

    let parsedRepo: { owner: string; repoName: string } | null = null;
    if (repoInput.value.trim()) {
      parsedRepo = parseRepoInput(repoInput.value);
      if (!parsedRepo) {
        error.value = 'Enter a repository as "owner/name", e.g. "acme/my-app"';
        return;
      }
    }

    loading.value = true;
    try {
      const persona = await onCreate({
        name: name.value.trim(),
        description: description.value.trim() || undefined,
        repoOwner: parsedRepo?.owner,
        repoName: parsedRepo?.repoName,
      });
      createdPersona.value = persona;
      step.value = "done";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create persona";
    } finally {
      loading.value = false;
    }
  }

  function handleSkipRepo(e: Event) {
    e.preventDefault();
    handleCreate(e);
  }

  const stepCount = step.value === "details" ? 1 : step.value === "repository" ? 2 : 3;
  const totalSteps = 3;

  return (
    <div
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-persona-modal-title"
    >
      <div
        class="w-full max-w-lg rounded-xl border border-neutral-800 overflow-hidden"
        style="background: #111113;"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="px-5 py-4 border-b border-neutral-800/60 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-persona-modal-title" class="text-sm font-semibold text-white">
              {step.value === "done" ? "Persona created!" : "Create a new persona"}
            </h2>
            <p class="text-xs text-neutral-500 mt-0.5">
              {step.value === "details" && "Give your persona a name and description."}
              {step.value === "repository" && "Optionally link a GitHub repository."}
              {step.value === "done" && "Your persona is ready to use."}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Step indicators */}
        {step.value !== "done" && (
          <div class="px-5 pt-4 flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                class={`h-1 flex-1 rounded-full transition-colors ${
                  n <= stepCount ? "bg-orange-500" : "bg-neutral-800"
                }`}
              />
            ))}
            <span class="font-mono text-[10px] text-neutral-600 ml-1 shrink-0">
              {stepCount}/{totalSteps}
            </span>
          </div>
        )}

        {/* Step 1 – Details */}
        {step.value === "details" && (
          <form onSubmit={handleDetailsNext} class="p-5 space-y-4">
            <Label>
              <LabelText>Name *</LabelText>
              <Input
                placeholder="e.g. Frontend team"
                value={name.value}
                onInput={(e) => (name.value = (e.target as HTMLInputElement).value)}
                autoFocus
              />
            </Label>

            <Label>
              <LabelText>Description</LabelText>
              <Input
                placeholder="Optional — what is this persona for?"
                value={description.value}
                onInput={(e) => (description.value = (e.target as HTMLInputElement).value)}
              />
            </Label>

            {error.value && (
              <p class="text-xs text-red-400 font-mono">{error.value}</p>
            )}

            <div class="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Next &rarr;
              </Button>
            </div>
          </form>
        )}

        {/* Step 2 – Repository */}
        {step.value === "repository" && (
          <form onSubmit={handleCreate} class="p-5 space-y-4">
            <div
              class="rounded-lg border border-neutral-800/60 p-3 text-xs text-neutral-500 font-mono"
              style="background: rgba(0,0,0,0.2);"
            >
              Linking a repository lets Boris track bundle sizes for packages in that repo.
              You can always add one later from the persona detail page.
            </div>

            <Label>
              <LabelText>GitHub repository</LabelText>
              <Input
                placeholder="owner/repo  or  https://github.com/owner/repo"
                value={repoInput.value}
                onInput={(e) => (repoInput.value = (e.target as HTMLInputElement).value)}
                autoFocus
              />
            </Label>

            {error.value && (
              <p class="text-xs text-red-400 font-mono">{error.value}</p>
            )}

            <div class="flex justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  step.value = "details";
                  error.value = null;
                }}
              >
                &larr; Back
              </Button>
              <div class="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading.value}
                  onClick={handleSkipRepo}
                >
                  Skip
                </Button>
                <Button type="submit" size="sm" disabled={loading.value || !repoInput.value.trim()}>
                  {loading.value ? "Creating…" : "Create persona"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3 – Done */}
        {step.value === "done" && createdPersona.value && (
          <div class="p-5 space-y-4">
            <div class="flex items-center gap-3 p-4 rounded-lg border border-neutral-800/60" style="background: rgba(0,0,0,0.2);">
              <div class="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg
                  class="w-4.5 h-4.5 text-orange-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-white truncate">
                  {createdPersona.value.name}
                </p>
                {createdPersona.value.description && (
                  <p class="text-xs text-neutral-500 truncate mt-0.5">
                    {createdPersona.value.description}
                  </p>
                )}
                {createdPersona.value.repository && (
                  <p class="font-mono text-xs text-neutral-600 mt-0.5">
                    <span class="text-neutral-700">{createdPersona.value.repository.owner}/</span>
                    {createdPersona.value.repository.name}
                  </p>
                )}
              </div>
              <div class="ml-auto shrink-0">
                <svg
                  class="w-5 h-5 text-emerald-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Done
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onViewPersona(createdPersona.value!.id);
                }}
              >
                View persona &rarr;
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
