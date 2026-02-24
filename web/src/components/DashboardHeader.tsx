import { useModel } from "@preact/signals";
import { AuthModel } from "../models/auth";

export function DashboardHeader() {
  const auth = useModel(AuthModel);

  async function handleSignOut() {
    await auth.signOut();
    window.location.href = "/";
  }

  return (
    <header
      class="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800/80"
      style="background: rgba(9,9,11,0.95); backdrop-filter: blur(16px);"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/dashboard" class="flex items-center gap-2.5">
          <div
            class="w-6 h-6 rounded-md flex items-center justify-center text-neutral-950 font-bold text-xs"
            style="background: #f97316;"
          >
            B
          </div>
          <span class="text-sm font-bold text-white tracking-tight">Boris</span>
        </a>
        <div class="flex items-center gap-1">
          <a
            href="/dashboard"
            class="text-sm text-neutral-500 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-neutral-800/60"
          >
            Dashboard
          </a>
          {false && (
            <a
              href="/billing"
              class="text-sm text-neutral-500 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-neutral-800/60"
            >
              Billing
            </a>
          )}
          <button
            onClick={handleSignOut}
            class="text-sm text-neutral-500 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-neutral-800/60 ml-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
