import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 border-[3px] border-ink font-bold tracking-wider whitespace-nowrap uppercase no-underline transition-transform cursor-pointer active:translate-x-[2px] active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** The one big call to action: red pill, teal rim, skewed. */
        cta: "-skew-x-6 rounded-full border-4 border-teal bg-cta text-cta-ink shadow-[6px_6px_0_var(--color-ink)]",
        yellow: "bg-paper text-ink shadow-hard",
        white: "bg-white text-ink shadow-hard",
        ink: "bg-ink text-lime shadow-[4px_4px_0_var(--color-hot)]",
        danger: "bg-white text-error-edge shadow-hard",
        link: "border-0 bg-transparent p-0 text-ink underline underline-offset-4 shadow-none normal-case tracking-normal",
      },
      size: {
        sm: "min-h-11 px-3 text-xs",
        md: "min-h-12 px-4 text-sm",
        lg: "min-h-16 px-6 text-lg",
      },
    },
    defaultVariants: { variant: "white", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
