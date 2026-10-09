#!/bin/sh
# Downloads the free DB-IP "IP to Country Lite" database (CC BY 4.0, no
# account needed). It's published monthly; early in a month the new file may
# not exist yet, so fall back to last month's.
#
# Usage: scripts/download-geoip.sh <output.mmdb>
set -eu

out="${1:?usage: download-geoip.sh <output.mmdb>}"
mkdir -p "$(dirname "$out")"

# Plain arithmetic instead of `date -d`/`date -v`, which differ between GNU,
# BSD/macOS and BusyBox (Alpine).
year=$(date -u +%Y)
month=$(date -u +%m)
this_month="$year-$month"
if [ "$month" = "01" ]; then
  last_month="$((year - 1))-12"
else
  last_month=$(printf "%s-%02d" "$year" "$((${month#0} - 1))")
fi

for month in "$this_month" "$last_month"; do
  url="https://download.db-ip.com/free/dbip-country-lite-$month.mmdb.gz"
  if curl -fsSL "$url" | gunzip > "$out.tmp" 2>/dev/null && [ -s "$out.tmp" ]; then
    mv "$out.tmp" "$out"
    echo "GeoIP database ($month) saved to $out"
    exit 0
  fi
done

rm -f "$out.tmp"
echo "Could not download the GeoIP database; countries will show as Unknown." >&2
exit 1
