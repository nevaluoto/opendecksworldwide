const { DateTime } = require("luxon");

// Normalize a display name into a URL slug matching the folder naming convention,
// e.g. "Drum & Bass" -> "drum-bass", "São Paulo" -> "sao-paulo".
function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// An event is shown when its status flag is "active" AND, for one-off events
// (no recurrence), its date has not passed yet. Recurring events stay visible
// until the flag is flipped, regardless of the "next occurrence" date.
function isActive(data) {
  if (data.status !== "active") return false;
  if (!data.recurrence && data.date) {
    const eventDay = DateTime.fromJSDate(data.date, { zone: "utc" }).endOf("day");
    if (eventDay < DateTime.utc()) return false;
  }
  return true;
}

// events/<continent>/<country>[/<state>]/<city>/<venue>/<event>.md -> slugs
// from the path. The state level is optional (used e.g. for the US, with the
// state abbreviation as the folder name) and is detected by path depth.
// venue.md files share the same shape with event === "venue".
function pathParts(filePathStem) {
  const parts = filePathStem.replace(/^\/events\//, "").split("/");
  const hasState = parts.length === 6;
  return {
    continent: parts[0],
    country: parts[1],
    state: hasState ? parts[2] : undefined,
    city: parts[hasState ? 3 : 2],
    venue: parts[hasState ? 4 : 3],
    event: parts[hasState ? 5 : 4],
  };
}

function isVenueDoc(filePathStem) {
  return filePathStem.endsWith("/venue");
}

// Directory an event/venue doc lives in — the venue folder.
function venueDir(filePathStem) {
  return filePathStem.slice(0, filePathStem.lastIndexOf("/"));
}

module.exports = { slugify, isActive, pathParts, isVenueDoc, venueDir };
