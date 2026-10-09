/**
 * Errors that represent a broken business rule. Their messages are written for
 * end users, so controllers can show them as-is. Anything that is NOT a
 * DomainError is unexpected and must be reported as a generic server error.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidUrlError extends DomainError {
  readonly code = "INVALID_URL";
}

export class InvalidSlugError extends DomainError {
  readonly code = "INVALID_SLUG";
}

export class SlugTakenError extends DomainError {
  readonly code = "SLUG_TAKEN";

  constructor() {
    super("That ending is already taken. Try another one.");
  }
}

export class SlugLimitError extends DomainError {
  readonly code = "SLUG_LIMIT";

  constructor(limit: number) {
    super(`You can have up to ${limit} custom endings.`);
  }
}

export class SlugLockedError extends DomainError {
  readonly code = "SLUG_LOCKED";

  constructor() {
    super(
      "This link has already been clicked, so its ending can't change (that would break it for people who have it).",
    );
  }
}

/** The link doesn't exist or the caller isn't allowed to touch it (deliberately indistinguishable). */
export class ShortUrlNotFoundError extends DomainError {
  readonly code = "NOT_FOUND";

  constructor() {
    super("Link not found.");
  }
}

/**
 * Part of the repository contract: thrown when the code is already taken, so
 * the service can retry (random codes) or report it (custom slugs).
 */
export class DuplicateShortCodeError extends Error {
  constructor(readonly shortCode: string) {
    super(`Short code "${shortCode}" already exists`);
    this.name = "DuplicateShortCodeError";
  }
}
