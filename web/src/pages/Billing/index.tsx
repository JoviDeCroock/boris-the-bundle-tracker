import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { BillingModel } from "../../models/billing";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";

export function Billing() {
  const { route, query } = useLocation();
  const auth = useModel(AuthModel);
  const billing = useModel(BillingModel);

  const success = query.success === "true";

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      billing.fetch();
    });
  }, []);

  if (billing.loading.value) {
    return (
      <div class="min-h-screen bg-neutral-950 pt-14 flex items-center justify-center">
        <span class="font-mono text-xs text-neutral-600">Loading...</span>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-neutral-950 pt-14">
      <div class="max-w-2xl mx-auto px-6 py-10">
        <div class="mb-8">
          <p class="font-mono text-xs text-orange-500 tracking-widest uppercase mb-2">Billing</p>
          <h1 class="text-2xl font-bold text-white">Subscription</h1>
          <p class="text-sm text-neutral-600 mt-1">Manage your Boris plan.</p>
        </div>

        {success && (
          <div
            class="mb-6 rounded-xl border p-4"
            style="background: rgba(34,197,94,0.05); border-color: rgba(34,197,94,0.2);"
          >
            <p class="text-sm text-emerald-400">
              Your subscription has been updated successfully.
            </p>
          </div>
        )}

        {billing.error.value && (
          <Alert class="mb-6">{billing.error.value}</Alert>
        )}

        {/* Current Plan */}
        <div
          class="rounded-xl border overflow-hidden"
          style={billing.isPro.value
            ? "background: #111113; border-color: rgba(249,115,22,0.25); box-shadow: 0 0 30px rgba(249,115,22,0.04);"
            : "background: #111113; border-color: rgba(255,255,255,0.06);"}
        >
          <div class="px-6 py-5 border-b border-neutral-800/60">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h2 class="text-base font-semibold text-white">
                    {billing.isPro.value ? "Pro Plan" : "Free Plan"}
                  </h2>
                  {billing.isPro.value && (
                    <span
                      class="font-mono text-xs px-2 py-0.5 rounded-full font-semibold"
                      style="background: #f97316; color: #431407;"
                    >
                      active
                    </span>
                  )}
                </div>
                <p class="text-sm text-neutral-600">
                  {billing.isPro.value
                    ? "50 repos · 10 API keys/repo · 365 days history"
                    : "3 repos · 2 API keys/repo · 30 days history"}
                </p>
              </div>
              <div class="text-right shrink-0 ml-4">
                <p class="text-2xl font-bold text-white">
                  {billing.isPro.value ? "$10" : "$0"}
                </p>
                <p class="font-mono text-xs text-neutral-600">/month</p>
              </div>
            </div>
          </div>

          <div class="px-6 py-5">
            {billing.isPro.value ? (
              <div class="flex items-center justify-between">
                <p class="text-xs text-neutral-600 font-mono">
                  Manage or cancel your subscription via Polar.
                </p>
                <Button variant="secondary" size="sm" onClick={() => billing.manage()}>
                  Manage subscription
                </Button>
              </div>
            ) : (
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p class="text-sm text-white font-medium mb-1">Upgrade to Pro</p>
                  <p class="text-xs text-neutral-600">
                    Unlock 50 repos, 365 days history, and priority support.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => billing.upgrade()}
                  disabled={billing.upgradeLoading.value}
                  class="shrink-0"
                >
                  {billing.upgradeLoading.value ? "Redirecting…" : "Upgrade to Pro →"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Plan comparison */}
        <div class="mt-6 rounded-xl border border-neutral-800/60 overflow-hidden" style="background: #111113;">
          <div class="px-5 py-4 border-b border-neutral-800/60">
            <h3 class="text-xs font-mono text-neutral-500 uppercase tracking-wider">Plan limits</h3>
          </div>
          <div class="divide-y divide-neutral-800/40">
            {[
              { label: "Repositories", free: "3", pro: "50" },
              { label: "API keys per repo", free: "2", pro: "10" },
              { label: "History retention", free: "30 days", pro: "365 days" },
            ].map((row) => (
              <div key={row.label} class="grid grid-cols-3 px-5 py-3 text-sm">
                <span class="text-neutral-500">{row.label}</span>
                <span class={`font-mono text-xs text-center ${!billing.isPro.value ? "text-white" : "text-neutral-600"}`}>
                  {row.free}
                </span>
                <span class={`font-mono text-xs text-center ${billing.isPro.value ? "text-orange-400" : "text-neutral-600"}`}>
                  {row.pro}
                </span>
              </div>
            ))}
            <div class="grid grid-cols-3 px-5 py-2 text-xs font-mono text-neutral-700">
              <span />
              <span class="text-center">Free</span>
              <span class="text-center text-orange-600">Pro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
