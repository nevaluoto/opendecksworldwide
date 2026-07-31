---
# Venue details — the stuff that doesn't change between events.
# Copy this file to: events/<continent>/<country>/<city>/<venue-name>/venue.md
# Folder names are lowercase-with-dashes, e.g. events/europe/finland/helsinki/bar-vice/venue.md
#
# US venues only: insert a state-abbreviation folder between country and city,
# e.g. events/north-america/united-states/ny/new-york/the-sub-room/venue.md
# and set `state: "NY"` below (two-letter USPS abbreviation).
#
# The file MUST be named venue.md. One venue.md per venue folder; every event at
# this venue lives as its own file in the same folder and inherits these details.
# Required: name, city, country, continent. Everything else is optional —
# delete any line that doesn't apply.

name: "Venue Name"        # display names; must match the folder path when slugified
address: "Street Address 1, 00100 City"
city: "Helsinki"
state: "NY"                # US only — two-letter abbreviation; DELETE this line otherwise
country: "Finland"
continent: "Europe"

# Coordinates enable the embedded OpenStreetMap on the venue page.
# Find them by right-clicking the venue on openstreetmap.org -> "Show address".
lat: 60.1866
lon: 24.9503
osm: https://www.openstreetmap.org/?mlat=60.1866&mlon=24.9503

gear: "2x CDJ-3000, DJM-900NX2 — bring your own USB"   # house setup; events can override

links:
  website: https://example.com
  instagram: https://instagram.com/example
contact: "hello@example.com"
---

A short free-form description of the venue: the room, the sound system, the
booth, how to find the entrance — anything useful that stays true year-round.
