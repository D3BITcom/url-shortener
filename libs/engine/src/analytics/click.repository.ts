import type { ClickStats, LeaderboardRow, NewClick } from "./click";

export interface ClickRepository {
  record(click: NewClick): Promise<void>;
  /** Aggregates for one short URL. `byDay` only includes days on/after `sinceDay`. */
  statsFor(
    shortUrlId: string,
    options: { sinceDay: string },
  ): Promise<ClickStats>;
  /**
   * Public, non-hidden links created before `createdBefore`, ranked by unique
   * human visitors since `sinceDay` (null = all time).
   */
  leaderboard(options: {
    sinceDay: string | null;
    createdBefore: Date;
    limit: number;
  }): Promise<LeaderboardRow[]>;
}
