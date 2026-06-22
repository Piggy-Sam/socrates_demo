import { forwardRef } from "react";
import Link from "next/link";

type Variant = "gold" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // the soul/the call-to-action — gold is rationed to the focal action
  gold: "bg-gold text-ink font-medium hover:bg-gold-lit active:translate-y-px shadow-[0_0_24px_-6px_rgb(var(--star-glow)/0.6)]",
  outline:
    "border border-hairline-strong text-marble hover:border-gold hover:text-gold bg-transparent",
  ghost: "text-marble-dim hover:text-marble hover:bg-raised bg-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2.5",
};

const BASE =
  "inline-flex items-center justify-center rounded-sm font-sans transition-all duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

type BaseProps = { variant?: Variant; size?: Size; className?: string };

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "gold", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";

type LinkButtonProps = BaseProps &
  React.ComponentProps<typeof Link>;

export function LinkButton({
  variant = "gold",
  size = "md",
  className = "",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
