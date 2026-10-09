import { createHash } from "node:crypto";
import { isbot } from "isbot";
import { UAParser } from "ua-parser-js";
import type { DeviceType } from "./click";

/** What the controller extracts from the HTTP request. Framework-agnostic on purpose. */
export interface VisitContext {
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
}

export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
  device: DeviceType;
  isBot: boolean;
}

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  // Real browsers always send a User-Agent. A missing one is a script.
  if (!userAgent) {
    return { browser: null, os: null, device: "other", isBot: true };
  }

  const { browser, os, device } = new UAParser(userAgent).getResult();
  return {
    browser: browser.name ?? null,
    os: os.name ?? null,
    device: toDeviceType(device.type),
    isBot: isbot(userAgent),
  };
}

function toDeviceType(type: string | undefined): DeviceType {
  // ua-parser leaves `type` undefined for desktop browsers.
  if (type === undefined) return "desktop";
  if (type === "mobile" || type === "tablet") return type;
  return "other";
}

export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * Privacy-friendly unique-visitor key (the approach Plausible uses):
 * hash(secret salt + day + IP + UA). The IP is never stored, and because the
 * day is part of the input, the same person can't be followed across days.
 * The trade-off: a person who visits on 3 days counts as 3 unique visitors.
 */
export function visitorId(
  salt: string,
  day: string,
  ip: string | null,
  userAgent: string | null,
): string {
  return createHash("sha256")
    .update(`${salt}|${day}|${ip ?? ""}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 16);
}

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
