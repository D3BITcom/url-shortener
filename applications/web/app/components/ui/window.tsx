import type { ComponentProps, ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * The house container: an old-school "program window" with an ink title bar
 * (SECRET_KEY.TXT, MY_LINKS.EXE...). `tone` picks the shadow color.
 */
export function Window({
  title,
  aside,
  tone = "ink",
  className,
  children,
  ...props
}: ComponentProps<"section"> & {
  title: ReactNode;
  aside?: ReactNode;
  tone?: "ink" | "hot" | "grape" | "pink";
}) {
  const shadow = {
    ink: "shadow-[8px_8px_0_var(--color-ink)]",
    hot: "shadow-[8px_8px_0_var(--color-hot)]",
    grape: "shadow-[6px_6px_0_var(--color-grape)]",
    pink: "shadow-[6px_6px_0_var(--color-pink)]",
  }[tone];

  return (
    <section
      className={cn("border-4 border-ink bg-white", shadow, className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 bg-ink px-3 py-1 font-pixel text-xl text-white">
        <h2 className="truncate font-normal">{title}</h2>
        {aside ?? (
          <span aria-hidden className="flex gap-1.5">
            <span className="size-3.5 border-2 border-white bg-paper" />
            <span className="size-3.5 border-2 border-white bg-pink" />
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** The dashed yellow card from the original design, slightly rotated. */
export function PaperCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "-rotate-1 border-[6px] border-dashed border-grape bg-paper p-6 shadow-hot sm:p-10",
        className,
      )}
      {...props}
    />
  );
}
