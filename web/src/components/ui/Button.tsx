import type { JSX } from "preact";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon" | "danger-icon";

type ButtonProps = JSX.IntrinsicElements["button"] & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "leading-normal text-white rounded-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100",
  secondary:
    "leading-normal bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white rounded-lg transition-colors disabled:opacity-50",
  ghost: "leading-normal text-neutral-400 hover:text-white transition-colors disabled:opacity-50",
  icon: "p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all cursor-pointer",
  "danger-icon": "p-1.5 text-neutral-600 hover:text-red-400 transition-colors cursor-pointer",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-2 text-xs sm:text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  class: className,
  children,
  ...props
}: ButtonProps) {
  const isIconVariant = variant === "icon" || variant === "danger-icon";
  const sizeClass = isIconVariant ? "" : sizeClasses[size];

  const isPrimary = variant === "primary";

  return (
    <button
      class={`${variantClasses[variant]} ${sizeClass} ${className ?? ""}`.trim()}
      style={isPrimary ? "background: #f97316;" : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
