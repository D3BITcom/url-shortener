import { cn } from "~/lib/utils";

const styles = {
  public: "bg-lime text-ink",
  private: "bg-ink text-lilac",
  hidden: "bg-error-edge text-white",
  custom: "bg-white text-ink",
} as const;

export type BadgeKind = keyof typeof styles;

const labels: Record<BadgeKind, string> = {
  public: "Public",
  private: "Private",
  hidden: "Hidden",
  custom: "Custom",
};

export function Badge({
  kind,
  children,
  className,
}: {
  kind: BadgeKind;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block border-2 border-ink px-2 py-0.5 text-xs font-bold tracking-wider uppercase",
        styles[kind],
        className,
      )}
    >
      {children ?? labels[kind]}
    </span>
  );
}

/** The right badge for a link's visibility state. */
export function VisibilityBadge({
  isPublic,
  hidden,
}: {
  isPublic: boolean;
  hidden?: boolean;
}) {
  if (hidden) return <Badge kind="hidden" />;
  return <Badge kind={isPublic ? "public" : "private"} />;
}
