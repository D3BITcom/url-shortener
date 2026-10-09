import { CircleAlert } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

export function ErrorAlert({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-muted px-3 py-2.5 text-sm text-destructive",
        className,
      )}
      {...props}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
