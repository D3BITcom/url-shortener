import { Link2 } from "lucide-react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from "react-router";
import { Button } from "~/components/ui/button";
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
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
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
      <body className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
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

function SiteHeader() {
  const navigation = useNavigation();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-foreground",
      isActive ? "bg-muted text-foreground" : "text-muted-foreground",
    );

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      {/* Thin progress bar while a page is loading */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 origin-left bg-primary transition-transform duration-500",
          navigation.state === "loading" ? "scale-x-75" : "scale-x-0",
        )}
        aria-hidden
      />
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Link2 className="size-4" aria-hidden />
          </span>
          Shortener
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navClass}>
            Shorten
          </NavLink>
          <NavLink to="/links" className={navClass}>
            Links
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-xs text-muted-foreground">
      <p>
        IP geolocation by{" "}
        <a
          href="https://db-ip.com"
          className="underline-offset-2 hover:underline"
        >
          DB-IP
        </a>{" "}
        (CC BY 4.0). Raw IP addresses are never stored.
      </p>
    </footer>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let details = "An unexpected error occurred. Please try again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error) && error.status === 404) {
    title = "Not found";
    details = "This link doesn't exist, or the page has moved.";
  } else if (isRouteErrorResponse(error)) {
    title = `Error ${error.status}`;
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{details}</p>
      <Button asChild variant="outline">
        <Link to="/">Back to home</Link>
      </Button>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-md bg-muted p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </div>
  );
}
