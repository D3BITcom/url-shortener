import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
}: {
  value: string;
  label?: string;
  size?: "sm" | "icon";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked (insecure context, permissions);
      // the link is still visible and selectable.
    }
  }

  const Icon = copied ? Check : Copy;
  const text = copied ? "Copied" : label;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={copy}
      aria-label={size === "icon" ? `${text}: ${value}` : undefined}
      title={size === "icon" ? text : undefined}
    >
      <Icon className={copied ? "text-success" : undefined} aria-hidden />
      {size !== "icon" && <span aria-live="polite">{text}</span>}
    </Button>
  );
}
