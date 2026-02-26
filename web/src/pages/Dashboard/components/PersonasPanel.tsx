import { Button } from "../../../components/ui/Button";
import type { Persona } from "../../../lib/api";

type PersonasPanelProps = {
  personas: Persona[];
  loading: boolean;
  error: string | null;
  onOpen: (personaId: string) => void;
  onRemove: (persona: Persona) => void;
};

export function PersonasPanel({ personas, loading, error, onOpen, onRemove }: PersonasPanelProps) {
  return (
    <div class="rounded-xl border border-neutral-800 overflow-hidden" style="background: #111113;">
      <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60">
        <h2 class="text-xs font-mono text-neutral-400 uppercase tracking-wider">Your personas</h2>
        <span class="font-mono text-xs text-neutral-500">{personas.length} created</span>
      </div>

      {loading ? (
        <div class="py-10 text-center">
          <span class="font-mono text-xs text-neutral-500">loading…</span>
        </div>
      ) : error ? (
        <div class="py-10 text-center">
          <span class="font-mono text-xs text-red-400">{error}</span>
        </div>
      ) : personas.length === 0 ? (
        <div class="py-12 text-center px-5">
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
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <p class="text-sm text-neutral-400">No personas yet.</p>
          <p class="text-xs text-neutral-500 mt-1">Create one above to start tracking.</p>
        </div>
      ) : (
        <ul class="divide-y divide-neutral-800/60">
          {personas.map((persona) => (
            <li
              key={persona.id}
              class="flex items-center justify-between px-5 py-4 hover:bg-white/[0.015] transition-colors group"
            >
              <button class="text-left min-w-0 flex-1 mr-4" onClick={() => onOpen(persona.id)}>
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <svg
                      class="w-3.5 h-3.5 text-orange-400"
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
                    <span class="text-sm font-semibold text-neutral-300 group-hover:text-white transition-colors block truncate">
                      {persona.name}
                    </span>
                    {persona.description && (
                      <span class="text-xs text-neutral-500 block truncate mt-0.5">
                        {persona.description}
                      </span>
                    )}
                    {persona.repository && (
                      <span class="font-mono text-xs text-neutral-600 block mt-0.5">
                        <span class="text-neutral-700">{persona.repository.owner}/</span>
                        {persona.repository.name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <div class="flex items-center gap-1 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => onOpen(persona.id)}>
                  Open
                </Button>
                <Button
                  variant="danger-icon"
                  onClick={() => onRemove(persona)}
                  title="Delete persona"
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
  );
}
