import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthModel } from "../../models/auth";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { getSubscription } from "../../lib/api";
import { authClient } from "../../lib/auth";

export function Billing() {
  const { route, query } = useLocation();
  const auth = useModel(AuthModel);

  const success = query.success === "true";

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
    enabled: auth.authenticated.value,
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.$fetch<{ url: string }>("/checkout", {
        method: "POST",
        body: { slug: "pro" },
      });

      if ("data" in res && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }

      if ("url" in res) {
        window.location.href = res.url;
        return;
      }

      throw new Error("Failed to start checkout");
    },
  });

  const manageMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.$fetch<{ url: string }>("/customer/portal", {
        method: "GET",
      });

      if ("data" in res && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }

      if ("url" in res) {
        window.location.href = res.url;
        return;
      }

      throw new Error("Failed to open customer portal");
    },
  });

  const plan = subscriptionQuery.data?.plan ?? "free";
  const isPro = plan === "pro";
  const pageError =
    (subscriptionQuery.error instanceof Error && subscriptionQuery.error.message) ||
    (upgradeMutation.error instanceof Error && upgradeMutation.error.message) ||
    (manageMutation.error instanceof Error && manageMutation.error.message) ||
    null;

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  if (auth.loading.value || subscriptionQuery.isLoading) {
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
            <p class="text-sm text-emerald-400">Your subscription has been updated successfully.</p>
          </div>
        )}

        {pageError && <Alert class="mb-6">{pageError}</Alert>}

        {/* Current Plan */}
        <div
          class="rounded-xl border overflow-hidden"
            style={
              isPro
                ? "background: #111113; border-color: rgba(249,115,22,0.25); box-shadow: 0 0 30px rgba(249,115,22,0.04);"
                : "background: #111113; border-color: rgba(255,255,255,0.06);"
            }
        >
          <div class="px-6 py-5 border-b border-neutral-800/60">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h2 class="text-base font-semibold text-white">
                    {isPro ? "Pro Plan" : "Free Plan"}
                  </h2>
                  {isPro && (
                    <span
                      class="font-mono text-xs px-2 py-0.5 rounded-full font-semibold"
                      style="background: #f97316; color: #431407;"
                    >
                      active
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-5">
            {isPro ? (
              <div class="flex items-center justify-between">
                <p class="text-xs text-neutral-600 font-mono">
                  Manage or cancel your subscription via Polar.
                </p>
                <Button variant="secondary" size="sm" onClick={() => manageMutation.mutate()}>
                  Manage subscription
                </Button>
              </div>
            ) : (
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p class="text-sm text-white font-medium mb-1">Upgrade to Pro</p>
                  <p class="text-xs text-neutral-600">
                    Unlock more repositories and priority support.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => upgradeMutation.mutate()}
                  disabled={upgradeMutation.isPending}
                  class="shrink-0"
                >
                  {upgradeMutation.isPending ? "Redirecting…" : "Upgrade to Pro →"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
