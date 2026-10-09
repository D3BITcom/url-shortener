import type { ComponentProps, ReactNode } from "react";
import { cn } from "~/lib/utils";

const fieldBox =
  "border-4 border-blue bg-peach text-plum aria-invalid:border-error-edge";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        fieldBox,
        "h-14 w-full min-w-0 rounded-none px-4 font-mono text-base placeholder:text-plum/60",
        className,
      )}
      {...props}
    />
  );
}

/** An input with a fixed prefix box, e.g. "d3b.it/r/" before a custom slug. */
export function PrefixedInput({
  prefix,
  className,
  ...props
}: ComponentProps<"input"> & { prefix: ReactNode }) {
  return (
    <div
      className={cn(
        fieldBox,
        "flex focus-within:outline-4 focus-within:outline-blue",
        className,
      )}
    >
      <span className="flex items-center bg-ink px-3 font-pixel text-2xl text-lime">
        {prefix}
      </span>
      <input
        className="h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-base outline-none placeholder:text-plum/60"
        {...props}
      />
    </div>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("text-xs font-bold tracking-[0.1em] uppercase", className)}
      {...props}
    />
  );
}
