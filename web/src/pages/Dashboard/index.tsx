import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthModel } from "../../models/auth";
import { createPersona, deletePersona, listPersonas } from "../../lib/api";
import { useModel, useSignal } from "@preact/signals";
import { PersonasPanel } from "./components/PersonasPanel";
import { CreatePersonaModal } from "./components/CreatePersonaModal";
import { Button } from "../../components/ui/Button";

export function Dashboard() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const queryClient = useQueryClient();

  const personasQuery = useQuery({
    queryKey: ["personas"],
    queryFn: listPersonas,
    enabled: auth.authenticated.value,
  });

  const createPersonaMutation = useMutation({
    mutationFn: createPersona,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  const deletePersonaMutation = useMutation({
    mutationFn: (id: string) => deletePersona(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  const showCreateModal = useSignal(false);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  if (auth.loading.value) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-14 flex items-center justify-center">
        <span class="font-mono text-xs text-neutral-500">loading...</span>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-neutral-950 pt-14">
      <div class="max-w-7xl mx-auto px-6 py-10">
        {/* Page header */}
        <div class="mb-8 flex items-end justify-between gap-4">
          <div>
            <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-2">
              Dashboard
            </p>
            <h1 class="text-2xl font-bold text-white">Personas</h1>
            <p class="text-sm text-neutral-400 mt-1">
              Manage your bundle-tracking personas and their linked repositories.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => (showCreateModal.value = true)}
          >
            + New persona
          </Button>
        </div>

        <PersonasPanel
          personas={personasQuery.data ?? []}
          loading={personasQuery.isLoading}
          error={
            personasQuery.error instanceof Error
              ? personasQuery.error.message
              : personasQuery.error
                ? "Failed to load personas"
                : null
          }
          onOpen={(personaId) => route(`/persona/${personaId}`)}
          onRemove={async (persona) => {
            if (confirm(`Delete persona "${persona.name}"?`)) {
              await deletePersonaMutation.mutateAsync(persona.id);
            }
          }}
        />
      </div>

      <CreatePersonaModal
        open={showCreateModal.value}
        onClose={() => (showCreateModal.value = false)}
        onCreate={createPersonaMutation.mutateAsync}
        onViewPersona={(id) => route(`/persona/${id}`)}
      />
    </div>
  );
}
