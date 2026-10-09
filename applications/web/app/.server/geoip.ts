import { existsSync } from "node:fs";
import { NullGeoResolver, type GeoResolver } from "@url-shortener/engine";
import maxmind, { type CountryResponse, type Reader } from "maxmind";

/**
 * Offline IP-to-country lookup from an .mmdb file (DB-IP Lite or MaxMind
 * GeoLite2 use the same format). Lookups are in-process and take
 * microseconds, so redirects never wait on a network call.
 */
class MmdbGeoResolver implements GeoResolver {
  constructor(private readonly reader: Reader<CountryResponse>) {}

  async countryOf(ip: string): Promise<string | null> {
    if (!maxmind.validate(ip)) return null;
    return this.reader.get(ip)?.country?.iso_code ?? null;
  }
}

export async function createGeoResolver(
  dbPath: string | undefined,
): Promise<GeoResolver> {
  if (!dbPath || !existsSync(dbPath)) {
    console.warn(
      `[geoip] No database at ${dbPath ?? "(GEOIP_DB_PATH unset)"}; countries will show as Unknown. Run \`pnpm geoip:download\`.`,
    );
    return new NullGeoResolver();
  }
  return new MmdbGeoResolver(await maxmind.open<CountryResponse>(dbPath));
}
