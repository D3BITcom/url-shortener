import { cn } from "~/lib/utils";

/** A number in a black box with green pixel digits. */
export function Counter({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const text = typeof value === "number" ? value.toLocaleString("en") : value;
  return (
    <span
      className={cn(
        "inline-block bg-ink px-2 font-pixel text-2xl leading-tight text-lime-soft tabular-nums",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** The classic web hit counter: one box per digit, zero-padded. */
export function Odometer({
  value,
  digits = 6,
}: {
  value: number;
  digits?: number;
}) {
  const text = String(Math.max(0, value)).padStart(digits, "0");
  return (
    <span
      className="flex gap-1"
      aria-label={value.toLocaleString("en")}
      role="img"
    >
      {[...text].map((digit, i) => (
        <span
          key={i}
          aria-hidden
          className="flex h-11 w-8 items-center justify-center border-2 border-violet bg-black font-pixel text-4xl text-lime"
        >
          {digit}
        </span>
      ))}
    </span>
  );
}
