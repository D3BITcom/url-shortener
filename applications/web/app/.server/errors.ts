import { DomainError } from "@url-shortener/engine";
import { logger } from "./logger";

/**
 * Expected failures (DomainError) carry messages written for users. Anything
 * else is a bug: log it with context and show a generic message.
 */
export function toUserMessage(error: unknown, context: string): string {
  if (error instanceof DomainError) return error.message;
  logger.error({ err: error, context }, "Unexpected error");
  return "Something went wrong on our side. Please try again.";
}

export function isExpected(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
