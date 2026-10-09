import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    // The wrapper scrolls on narrow screens so the page itself never does.
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          "w-full min-w-[720px] border-collapse text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b-[3px] border-ink bg-peach px-4 py-3 text-left text-xs font-bold tracking-[0.1em] uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b-2 border-dashed border-grape last:border-0",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
