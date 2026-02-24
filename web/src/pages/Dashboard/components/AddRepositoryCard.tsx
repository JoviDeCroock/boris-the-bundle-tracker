import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";

type AddRepositoryCardProps = {
  inputValue: string;
  loading: boolean;
  error: string | null;
  onSubmit: (event: Event) => void;
  onInput: (value: string) => void;
};

export function AddRepositoryCard({
  inputValue,
  loading,
  error,
  onSubmit,
  onInput,
}: AddRepositoryCardProps) {
  return (
    <div class="rounded-xl border border-neutral-800 p-5 mb-5" style="background: #111113;">
      <h2 class="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-3">Add repository</h2>
      <form onSubmit={onSubmit} class="flex gap-2">
        <Input
          type="text"
          placeholder="owner/repo"
          value={inputValue}
          onInput={(e) => onInput((e.target as HTMLInputElement).value)}
          class="flex-1"
        />
        <Button type="submit" size="sm" disabled={!inputValue.trim() || loading}>
          {loading ? "Adding…" : "Add"}
        </Button>
      </form>
      {error && <p class="font-mono text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
