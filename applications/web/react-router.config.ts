import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Everything lives under d3b.it/r; nginx sends only /r/ to this app.
  basename: "/r",
} satisfies Config;
