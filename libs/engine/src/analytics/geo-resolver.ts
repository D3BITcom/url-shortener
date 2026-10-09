export interface GeoResolver {
  /** ISO 3166-1 alpha-2 country code, or null when unknown. */
  countryOf(ip: string): Promise<string | null>;
}

/** Used when no GeoIP database is configured: analytics still work, without countries. */
export class NullGeoResolver implements GeoResolver {
  async countryOf(): Promise<string | null> {
    return null;
  }
}
