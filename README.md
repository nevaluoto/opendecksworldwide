# Open Decks Worldwide

A community-maintained directory of **open decks DJ events** around the world.
Every venue and event is a markdown file; the site is a static build generated
with [Eleventy](https://www.11ty.dev/) — no database, no backend.

Repo: http://192.168.0.20:3333/nevaluoto/opendecksglobal

## What's on the site

- **Homepage** — a live count of tracked events/countries/continents over a
  small rotating wireframe globe (dots mark active event cities), a search
  bar that filters events by city/venue/country as you type, and a "📍 Near
  me" button that uses the browser's geolocation to sort events by distance.
- **Browse pages** — continent → country (→ state, for the US) → city → venue,
  each auto-generated with a stable URL you can link directly to.
- **Genre filter** — city pages with more than one genre among their active
  events get an on-the-fly filter bar (client-side, no extra pages).
- **Light/dark themes** — toggle in the header, persisted per browser.

## Structure

```
events/<continent>/<country>/<city>/<venue-name>/
├── venue.md              # venue details (address, map, gear, links) — one per venue
├── my-weekly-night.md    # an event at this venue
└── my-other-night.md     # venues often host several events
```

Folder names are lowercase-with-dashes. The folder path becomes the URL:
`/europe/finland/helsinki/bar-vice/` (venue) and
`/europe/finland/helsinki/bar-vice/my-weekly-night/` (event).

**US venues** insert an extra state-abbreviation folder between country and
city, using the two-letter USPS abbreviation as both the folder name and the
`state` field in `venue.md`:

```
events/north-america/united-states/ny/new-york/the-sub-room/venue.md
```

which produces `/north-america/united-states/ny/` (state index) and
`/north-america/united-states/ny/new-york/the-sub-room/`.

## Add your event

1. **Venue not listed yet?** Copy [TEMPLATE-VENUE.md](TEMPLATE-VENUE.md) to
   `events/<continent>/<country>/<city>/<venue-name>/venue.md` and fill it in.
   The venue holds everything that doesn't change: address, OpenStreetMap
   location, house gear, socials, contact. Add `lat`/`lon` if you want the
   venue to show up as a dot on the homepage globe and in "near me" results.

2. Copy [TEMPLATE-EVENT.md](TEMPLATE-EVENT.md) into the same venue folder as
   `<event-name>.md`. Events only carry event-specific details (schedule,
   genres, sign-up, cost) — the rest is inherited from `venue.md`.

3. Open a pull request — or email a submission to the address in the footer
   if you'd rather not use git directly (placeholder address for now).

## How visibility works

Only **active** events are shown — the markdown files stay in the repo either way:

- `status: inactive` hides an event (and its page) immediately.
- One-off events (no `recurrence` field) auto-hide once their `date` passes.
- Recurring events stay visible until someone flips `status` to `inactive`.
- Venue pages stay up even with no active events (the info is evergreen), but
  they're only linked from listings while they have at least one active event.

## Develop locally

```
npm install
npm run dev      # serves at http://localhost:8080
npm run build    # outputs static site to _site/
```

The build is plain static HTML/CSS with a handful of small vanilla-JS scripts
(no framework, no client-side dependencies) — host `_site/` anywhere that
serves files. Country border data for the homepage globe is fetched at build
time from the `world-atlas`/`topojson-client` npm packages (Natural Earth,
public domain) and baked into a static `/borders.json`; nothing is fetched
from a third party at runtime.
