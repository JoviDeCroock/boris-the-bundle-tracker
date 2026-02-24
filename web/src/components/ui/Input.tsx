import type { JSX } from "preact";

type InputProps = JSX.IntrinsicElements["input"] & { class?: string };

export function Input({ class: className, onFocus, onBlur, ...props }: InputProps) {
  return (
    <input
      class={`rounded-lg bg-neutral-900 border border-neutral-700/80 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none transition-all ${className ?? ""}`.trim()}
      onFocus={(e) => {
        const el = e.target as HTMLInputElement;
        el.style.boxShadow = "0 0 0 2px rgba(249,115,22,0.35)";
        el.style.borderColor = "rgba(249,115,22,0.5)";
        if (typeof onFocus === "function") onFocus(e);
      }}
      onBlur={(e) => {
        const el = e.target as HTMLInputElement;
        el.style.boxShadow = "";
        el.style.borderColor = "";
        if (typeof onBlur === "function") onBlur(e);
      }}
      {...props}
    />
  );
}

type LabelProps = JSX.IntrinsicElements["label"] & { class?: string };

export function Label({ class: className, children, ...props }: LabelProps) {
  return (
    <label class={`flex flex-col gap-1.5 ${className ?? ""}`.trim()} {...props}>
      {children}
    </label>
  );
}

export function LabelText({ children }: { children: preact.ComponentChildren }) {
  return (
    <span class="text-xs font-mono text-neutral-500 uppercase tracking-wider">{children}</span>
  );
}
