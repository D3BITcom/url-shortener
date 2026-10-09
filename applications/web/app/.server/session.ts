import { timingSafeEqual } from "node:crypto";
import {
  ANONYMOUS,
  type OwnerSession,
  type Viewer,
} from "@url-shortener/engine";
import type { Container } from "./container";

/**
 * Turns cookies into a Viewer (who is asking), the only identity the engine
 * understands. Two independent cookies:
 * - d3b_owner: the owner's secret key (signed, httpOnly)
 * - d3b_admin: present only after logging in with ADMIN_TOKEN
 */
export async function getViewer(
  request: Request,
  { owners, cookies, adminToken }: Container,
): Promise<{ viewer: Viewer; owner: OwnerSession | null }> {
  const cookieHeader = request.headers.get("Cookie");
  const secret = await cookies.owner.parse(cookieHeader);
  const owner = await owners.authenticate(
    typeof secret === "string" ? secret : null,
  );
  const isAdmin =
    adminToken !== null && (await cookies.admin.parse(cookieHeader)) === true;

  return {
    viewer: { ...ANONYMOUS, ownerId: owner?.owner.id ?? null, isAdmin },
    owner,
  };
}

/** Constant-time comparison so response timing doesn't leak the token. */
export function isAdminToken(container: Container, candidate: string): boolean {
  if (!container.adminToken) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(container.adminToken);
  return a.length === b.length && timingSafeEqual(a, b);
}
