import type { ShortUrl } from "./short-url";

/** Who is asking. Controllers build this from cookies; the engine never sees HTTP. */
export interface Viewer {
  ownerId: string | null;
  isAdmin: boolean;
}

export const ANONYMOUS: Viewer = { ownerId: null, isAdmin: false };

export function isOwner(shortUrl: ShortUrl, viewer: Viewer): boolean {
  return viewer.ownerId !== null && shortUrl.ownerId === viewer.ownerId;
}

/**
 * The single rule for who sees a link's stats. Owners and admins always do;
 * everyone else only for public links an admin hasn't hidden.
 */
export function canViewStats(shortUrl: ShortUrl, viewer: Viewer): boolean {
  if (viewer.isAdmin || isOwner(shortUrl, viewer)) return true;
  return shortUrl.isPublic && shortUrl.hiddenAt === null;
}
