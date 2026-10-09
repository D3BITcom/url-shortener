import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

/** The original's error box (lime, thick red border), kept and made readable. */
export function ErrorAlert({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn(
        "border-[6px] border-error-edge bg-error px-4 py-3 font-bold text-error-ink",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Notice({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "border-2 border-dashed border-ink bg-peach px-4 py-3 text-sm leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
