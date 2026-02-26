import { useEffect } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso";
import { useModel, useSignal } from "@preact/signals";
import { useQuery } from "@tanstack/react-query";
import { AuthModel } from "../../models/auth";
import { getPersona, listPackages } from "../../lib/api";
import { ActionFilesModal } from "../Repository/components/ActionFilesModal";
import { PackagesPanel } from "../Repository/components/PackagesPanel";
import { ApiKeysPanel } from "../Repository/components/ApiKeysPanel";
import { SetupInstructionsPanel } from "../Repository/components/SetupInstructionsPanel";
import { Button } from "../../components/ui/Button";

export function PersonaPage() {
  const { route } = useLocation();
  const { params } = useRoute();
  const auth = useModel(AuthModel);

  const actionFilesModalOpen = useSignal(false);
  const setupExpanded = useSignal(true);
  const setupAutoCollapsed = useSignal(false);
  const packageCount = useSignal(0);

  const personaId = params.id as string;

  const personaQuery = useQuery({
    queryKey: ["personas", personaId],
    queryFn: () => getPersona(personaId),
    enabled: Boolean(personaId) && auth.authenticated.value,
  });

  const persona = personaQuery.data;
  const repoId = persona?.repositoryId ?? null;

  const packagesCountQuery = useQuery({
    queryKey: ["repositories", repoId, "packages"],
    queryFn: () => listPackages(repoId!),
    enabled: Boolean(repoId),
  });

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  useEffect(() => {
    const count = (packagesCountQuery.data ?? []).length;
    if (packageCount.value !== count) {
      packageCount.value = count;
    }
    if (count > 0 && !setupAutoCollapsed.value) {
      setupExpanded.value = false;
      setupAutoCollapsed.value = true;
    }
  }, [packagesCountQuery.data?.length]);

  if (auth.loading.value || personaQuery.isLoading) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-14 flex items-center justify-center">
        <span class="font-mono text-xs text-neutral-600">Loading…</span>
      </div>
    );
  }

  if (personaQuery.error || !persona) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-14 flex items-center justify-center">
        <div class="text-center">
          <p class="text-sm text-neutral-400">Persona not found.</p>
          <Button
            variant="ghost"
            size="sm"
            class="mt-3"
            onClick={() => route("/dashboard")}
          >
            &larr; Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Build a repository object that the existing panels expect
  const repository = persona.repository
    ? {
        id: repoId!,
        owner: persona.repository.owner,
        name: persona.repository.name,
        createdAt: persona.createdAt,
        updatedAt: persona.updatedAt,
      }
    : undefined;

  return (
    <div class="min-h-screen bg-neutral-950 pt-14">
      {repoId && (
        <ActionFilesModal
          open={actionFilesModalOpen.value}
          onClose={() => (actionFilesModalOpen.value = false)}
        />
      )}

      <div class="max-w-7xl mx-auto px-6 py-10 space-y-5">
        {/* Breadcrumb */}
        <div class="flex items-center gap-2 font-mono text-xs text-neutral-600">
          <button
            onClick={() => route("/dashboard")}
            class="hover:text-neutral-300 transition-colors"
          >
            personas
          </button>
          <span>/</span>
          <span class="text-neutral-400">{persona.name}</span>
        </div>

        {/* Persona header */}
        <div class="rounded-xl border border-neutral-800 px-5 py-4" style="background: #111113;">
          <div class="flex items-center gap-3">
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
              <h1 class="text-base font-semibold text-white truncate">{persona.name}</h1>
              {persona.description && (
                <p class="text-xs text-neutral-500 mt-0.5">{persona.description}</p>
              )}
              {persona.repository && (
                <p class="font-mono text-xs text-neutral-600 mt-0.5">
                  <span class="text-neutral-700">{persona.repository.owner}/</span>
                  {persona.repository.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Repository content */}
        {repoId ? (
          <>
            <PackagesPanel repoId={repoId} repository={repository} />
            <ApiKeysPanel repoId={repoId} />
            <SetupInstructionsPanel
              packageCount={packageCount.value}
              setupExpanded={setupExpanded.value}
              repository={repository}
              onOpenActionFilesModal={() => (actionFilesModalOpen.value = true)}
              onToggleExpanded={() => (setupExpanded.value = !setupExpanded.value)}
            />
          </>
        ) : (
          <div
            class="rounded-xl border border-neutral-800 px-5 py-10 text-center"
            style="background: #111113;"
          >
            <div class="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mx-auto mb-3">
              <svg
                class="w-5 h-5 text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
            </div>
            <p class="text-sm text-neutral-400">No repository linked.</p>
            <p class="text-xs text-neutral-500 mt-1">
              This persona doesn't have a GitHub repository linked yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
