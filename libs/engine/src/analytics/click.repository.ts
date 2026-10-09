import type { ClickStats, NewClick } from "./click";

export interface ClickRepository {
  record(click: NewClick): Promise<void>;
  /** Aggregates for one short URL. `byDay` only includes days on/after `sinceDay`. */
  statsFor(
    shortUrlId: string,
    options: { sinceDay: string },
  ): Promise<ClickStats>;
}
