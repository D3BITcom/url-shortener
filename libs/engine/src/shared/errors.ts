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

/**
 * Part of the repository contract: thrown by `ShortUrlRepository.create` when
 * the code is already taken, so the service can retry with a new code.
 */
export class DuplicateShortCodeError extends Error {
  constructor(readonly shortCode: string) {
    super(`Short code "${shortCode}" already exists`);
    this.name = "DuplicateShortCodeError";
  }
}
