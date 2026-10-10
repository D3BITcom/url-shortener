import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Button } from "~/components/ui/button";
import { PaperCard } from "~/components/ui/window";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=VT323&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 pt-6 pb-6">
          {children}
        </main>
        <SiteFooter />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

const NAV = [
  { to: "/", label: "Shorten", end: true },
  { to: "/me", label: "My links", end: false },
  { to: "/top", label: "Top 10", end: false },
];

function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-[1100px] px-4 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <Link
          to="/"
          className="-rotate-2 border-[3px] border-ink bg-ink px-3.5 py-1 font-pixel text-4xl leading-none text-lime no-underline shadow-[5px_5px_0_var(--color-hot)] sm:text-5xl"
        >
          d3b.it/r
          <span className="animate-[blink_1s_steps(1)_infinite]">_</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap gap-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex min-h-11 items-center border-[3px] border-ink px-4 text-sm font-bold tracking-wider text-ink uppercase no-underline shadow-hard",
                  isActive ? "bg-paper" : "bg-white",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="px-4 pb-4 text-center text-xs">
      Geolocation by{" "}
      <a href="https://db-ip.com" className="text-ink">
        DB-IP
      </a>{" "}
      (CC BY 4.0)
    </footer>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "~ Error ~";
  let details = "Something broke on our side. Please try again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error) && error.status === 404) {
    title = "404 ~ Not found";
    details =
      "This link doesn't exist, or it's private. Check the address, or ask whoever sent it.";
  } else if (isRouteErrorResponse(error)) {
    title = `Error ${error.status}`;
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <PaperCard className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
      <h1 className="wavy text-3xl font-bold text-fuchsia italic">{title}</h1>
      <p>{details}</p>
      <Button asChild variant="white">
        <Link to="/">← Back to shortening</Link>
      </Button>
      {stack && (
        <pre className="mt-2 w-full overflow-x-auto bg-ink p-4 text-left text-xs text-lime-soft">
          <code>{stack}</code>
        </pre>
      )}
    </PaperCard>
  );
}
