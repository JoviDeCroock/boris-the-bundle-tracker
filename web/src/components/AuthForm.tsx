import { useModel } from "@preact/signals";
import { AuthFormModel } from "../models/auth-form";
import { Button } from "./ui/Button";
import { Input, Label, LabelText } from "./ui/Input";
import { Alert } from "./ui/Alert";

interface AuthFormProps {
  onSuccess?: () => void;
  compact?: boolean;
}

export function AuthForm({ onSuccess, compact = false }: AuthFormProps) {
  const form = useModel(AuthFormModel);

  async function handleSignIn(e: Event) {
    e.preventDefault();
    const ok = await form.signIn();
    if (ok) onSuccess?.();
  }

  async function handleSignUp(e: Event) {
    e.preventDefault();
    const ok = await form.signUp();
    if (ok) onSuccess?.();
  }

  return (
    <div class={compact ? "w-full" : "min-h-screen flex items-center justify-center px-4 pt-14 relative overflow-hidden bg-neutral-950"}>
      {/* Background grid */}
      {!compact && (
        <>
          <div
            class="absolute inset-0 opacity-[0.03]"
            style="background-image: linear-gradient(rgba(249,115,22,1) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,1) 1px, transparent 1px); background-size: 52px 52px;"
          />
          <div
            class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
            style="background: radial-gradient(ellipse at center, rgba(249,115,22,0.05) 0%, transparent 70%);"
          />
        </>
      )}

      <div class="relative w-full max-w-sm mx-auto">
        {/* Logo */}
        {!compact && (
          <div class="flex items-center justify-center gap-2 mb-8">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-950 font-bold text-sm"
              style="background: #f97316;"
            >
              B
            </div>
            <span class="text-lg font-bold text-white tracking-tight">Boris</span>
          </div>
        )}

        {/* Tab toggle */}
        <div class="flex rounded-lg bg-neutral-900/80 border border-neutral-800 p-1 mb-5">
          <button
            type="button"
            class={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
              form.tab.value === "signin"
                ? "bg-neutral-800 text-white"
                : "text-neutral-600 hover:text-neutral-300"
            }`}
            onClick={() => form.switchTab("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            class={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
              form.tab.value === "signup"
                ? "bg-neutral-800 text-white"
                : "text-neutral-600 hover:text-neutral-300"
            }`}
            onClick={() => form.switchTab("signup")}
          >
            Sign up
          </button>
        </div>

        {/* Form card */}
        <div class="rounded-2xl border border-neutral-800 p-7" style="background: #111113;">
          <h1 class="text-lg font-bold text-white mb-1">
            {form.tab.value === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p class="text-xs text-neutral-600 mb-6 font-mono">
            {form.tab.value === "signin" ? "Sign in to your Boris dashboard" : "Start tracking bundle sizes for free"}
          </p>

          {form.tab.value === "signin" ? (
            <form onSubmit={handleSignIn} class="flex flex-col gap-4">
              <Label>
                <LabelText>Email</LabelText>
                <Input
                  type="email"
                  required
                  value={form.email.value}
                  onInput={(e) => (form.email.value = (e.target as HTMLInputElement).value)}
                  placeholder="you@example.com"
                />
              </Label>
              <Label>
                <LabelText>Password</LabelText>
                <Input
                  type="password"
                  required
                  value={form.password.value}
                  onInput={(e) => (form.password.value = (e.target as HTMLInputElement).value)}
                  placeholder="••••••••"
                />
              </Label>
              {form.error.value && <Alert variant="inline-error">{form.error.value}</Alert>}
              <Button type="submit" disabled={form.loading.value} class="mt-1 py-2.5 w-full">
                {form.loading.value ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} class="flex flex-col gap-4">
              <Label>
                <LabelText>Name</LabelText>
                <Input
                  type="text"
                  required
                  value={form.name.value}
                  onInput={(e) => (form.name.value = (e.target as HTMLInputElement).value)}
                  placeholder="Your name"
                />
              </Label>
              <Label>
                <LabelText>Email</LabelText>
                <Input
                  type="email"
                  required
                  value={form.email.value}
                  onInput={(e) => (form.email.value = (e.target as HTMLInputElement).value)}
                  placeholder="you@example.com"
                />
              </Label>
              <Label>
                <LabelText>Password</LabelText>
                <Input
                  type="password"
                  required
                  value={form.password.value}
                  onInput={(e) => (form.password.value = (e.target as HTMLInputElement).value)}
                  placeholder="••••••••"
                />
              </Label>
              {form.error.value && <Alert variant="inline-error">{form.error.value}</Alert>}
              <Button type="submit" disabled={form.loading.value} class="mt-1 py-2.5 w-full">
                {form.loading.value ? "Creating account…" : "Create account"}
              </Button>
            </form>
          )}
        </div>

        {!compact && (
          <p class="text-center text-xs text-neutral-700 mt-5">
            3 repositories free · no credit card needed
          </p>
        )}
      </div>
    </div>
  );
}
