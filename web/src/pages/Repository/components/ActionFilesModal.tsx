import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { Button } from "../../../components/ui/Button";
import { ACTION_INSTALL_FILES } from "./actionInstallFiles";

type ActionFilesModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ActionFilesModal({ open, onClose }: ActionFilesModalProps) {
  const activeFileId = useSignal<(typeof ACTION_INSTALL_FILES)[number]["id"]>(
    ACTION_INSTALL_FILES[0].id,
  );
  const copiedLabel = useSignal<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeFile =
    ACTION_INSTALL_FILES.find((file) => file.id === activeFileId.value) ?? ACTION_INSTALL_FILES[0];

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedLabel.value = label;
      window.setTimeout(() => {
        if (copiedLabel.value === label) copiedLabel.value = null;
      }, 1500);
    } catch {
      copiedLabel.value = `Failed to copy ${label}`;
    }
  }

  return (
    <div
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-files-modal-title"
    >
      <div
        class="w-full max-w-5xl rounded-xl border border-neutral-800 overflow-hidden"
        style="background: #111113;"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="px-5 py-4 border-b border-neutral-800/60 flex items-start justify-between gap-4">
          <div>
            <h2 id="action-files-modal-title" class="text-sm font-semibold text-white">
              Add Boris action files to your repository
            </h2>
            <p class="text-xs text-neutral-600 mt-1">
              Create <code class="font-mono text-neutral-500">.github/actions/boris-bundle-tracker/</code>{" "}
              and copy these files in.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div class="px-5 pt-4">
          <div
            class="rounded-lg border border-neutral-800/60 p-3 text-xs text-neutral-500 font-mono"
            style="background: rgba(0,0,0,0.2);"
          >
            Then use <code class="text-neutral-300">uses: ./.github/actions/boris-bundle-tracker</code> in
            your workflow.
          </div>
        </div>

        <div class="p-5 space-y-4">
          <div class="flex flex-wrap gap-2">
            {ACTION_INSTALL_FILES.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => (activeFileId.value = file.id)}
                class={`px-3 py-1.5 rounded-md font-mono text-xs border transition-colors ${
                  activeFile.id === file.id
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                    : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>

          <div class="rounded-lg border border-neutral-800/60 overflow-hidden">
            <div
              class="px-4 py-3 border-b border-neutral-800/60 flex flex-wrap items-center justify-between gap-2"
              style="background: rgba(0,0,0,0.2);"
            >
              <code class="font-mono text-xs text-neutral-400 break-all">{activeFile.targetPath}</code>
              <div class="flex items-center gap-2">
                {copiedLabel.value && (
                  <span class="font-mono text-[10px] text-emerald-500">{copiedLabel.value}</span>
                )}
                <Button size="sm" variant="secondary" onClick={() => copyText(activeFile.targetPath, "path")}>
                  Copy path
                </Button>
                <Button size="sm" onClick={() => copyText(activeFile.content, activeFile.name)}>
                  Copy file
                </Button>
              </div>
            </div>
            <pre
              class={`max-h-[55vh] overflow-auto p-4 text-xs leading-relaxed font-mono text-neutral-300 ${activeFile.languageClass}`}
              style="background: rgba(0,0,0,0.35);"
            >
              {activeFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
