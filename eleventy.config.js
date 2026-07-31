const { DateTime } = require("luxon");
const topojson = require("topojson-client");
const worldTopology = require("world-atlas/countries-110m.json");
const { slugify, isActive, pathParts, venueDir } = require("./lib/events");

// Decimate a GeoJSON ring (array of [lon, lat]) down to at most maxPoints,
// always keeping the closing point, and flip to our [lat, lon] convention.
function simplifyRing(ring, maxPoints) {
  var points = ring;
  if (ring.length > maxPoints) {
    var step = Math.ceil(ring.length / maxPoints);
    points = ring.filter(function (_, i) { return i % step === 0; });
    var last = ring[ring.length - 1];
    if (points[points.length - 1] !== last) points.push(last);
  }
  return points.map(function (p) { return [p[1], p[0]]; });
}

// Real country boundary polygons from Natural Earth (via the world-atlas
// package, public domain, 110m resolution — plenty for a small decorative
// globe). Every ring (a country's outer edge, an enclave, an island) becomes
// its own closed wireframe loop of [lat, lon] points.
function buildCountryBorders() {
  var geo = topojson.feature(worldTopology, worldTopology.objects.countries);
  var loops = [];
  geo.features.forEach(function (feature) {
    var geom = feature.geometry;
    if (!geom) return;
    var polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
    polygons.forEach(function (polygon) {
      polygon.forEach(function (ring) {
        loops.push(simplifyRing(ring, 30));
      });
    });
  });
  return loops;
}

function getVenueMap(api) {
  const venueDocs = api.getFilteredByGlob("./events/**/venue.md");
  return new Map(venueDocs.map((v) => [venueDir(v.filePathStem), v]));
}

// Nested tree: continents -> countries -> cities -> venues -> events. Drives
// the homepage grouping and the paginated location index pages. Display names
// for locations come from each venue.md; events only carry event-specific data.
function buildTree(api) {
  const venueByDir = getVenueMap(api);
  const venueDocs = [...venueByDir.values()];

  // Warn when venue frontmatter display names disagree with the folder path.
  for (const venue of venueDocs) {
    const slugs = pathParts(venue.filePathStem);
    for (const [level, name] of [
      ["continent", venue.data.continent],
      ["country", venue.data.country],
      ["state", venue.data.state],
      ["city", venue.data.city],
      ["venue", venue.data.name],
    ]) {
      if (name && slugify(name) !== slugs[level]) {
        console.warn(
          `[opendecks] ${venue.inputPath}: frontmatter ${level} "${name}" does not match path segment "${slugs[level]}"`
        );
      }
    }
  }

  const events = api
    .getFilteredByGlob("./events/**/*.md")
    .filter((e) => e.fileSlug !== "venue" && isActive(e.data));

  const tree = new Map();
  for (const event of events) {
    const dir = venueDir(event.filePathStem);
    const venueDoc = venueByDir.get(dir);
    if (!venueDoc) {
      console.warn(
        `[opendecks] ${event.inputPath}: no venue.md found in its folder — event skipped from listings`
      );
      continue;
    }
    const slugs = pathParts(event.filePathStem);
    const vd = venueDoc.data;

    if (!tree.has(slugs.continent)) {
      tree.set(slugs.continent, {
        slug: slugs.continent,
        name: vd.continent,
        url: `/${slugs.continent}/`,
        countries: new Map(),
      });
    }
    const continent = tree.get(slugs.continent);
    if (!continent.countries.has(slugs.country)) {
      continent.countries.set(slugs.country, {
        slug: slugs.country,
        name: vd.country,
        url: `${continent.url}${slugs.country}/`,
        continentName: continent.name,
        continentUrl: continent.url,
        states: new Map(),
        cities: new Map(),
      });
    }
    const country = continent.countries.get(slugs.country);

    // Optional state/region level (e.g. US states by abbreviation).
    let cityParent = country;
    let stateNode;
    if (slugs.state) {
      if (!country.states.has(slugs.state)) {
        country.states.set(slugs.state, {
          slug: slugs.state,
          name: vd.state,
          url: `${country.url}${slugs.state}/`,
          countryName: country.name,
          countryUrl: country.url,
          continentName: continent.name,
          continentUrl: continent.url,
          cities: new Map(),
        });
      }
      stateNode = country.states.get(slugs.state);
      cityParent = stateNode;
    }

    if (!cityParent.cities.has(slugs.city)) {
      cityParent.cities.set(slugs.city, {
        slug: slugs.city,
        name: vd.city,
        url: `${(stateNode || country).url}${slugs.city}/`,
        stateName: stateNode ? stateNode.name : undefined,
        stateUrl: stateNode ? stateNode.url : undefined,
        countryName: country.name,
        countryUrl: country.url,
        continentName: continent.name,
        continentUrl: continent.url,
        venues: new Map(),
      });
    }
    const city = cityParent.cities.get(slugs.city);
    if (!city.venues.has(slugs.venue)) {
      city.venues.set(slugs.venue, {
        slug: slugs.venue,
        name: vd.name,
        url: `${city.url}${slugs.venue}/`,
        doc: venueDoc,
        cityName: city.name,
        stateName: city.stateName,
        countryName: country.name,
        events: [],
      });
    }
    city.venues.get(slugs.venue).events.push(event);
  }

  const byName = (a, b) => a.name.localeCompare(b.name);
  const byDate = (a, b) => {
    const ad = a.data.date ? a.data.date.getTime() : Infinity;
    const bd = b.data.date ? b.data.date.getTime() : Infinity;
    return ad - bd || a.data.title.localeCompare(b.data.title);
  };

  const finalizeCity = (city) => {
    city.venues = [...city.venues.values()].sort(byName);
    city.eventCount = 0;
    const genreSet = new Set();
    for (const venue of city.venues) {
      venue.events.sort(byDate);
      city.eventCount += venue.events.length;
      for (const event of venue.events) {
        for (const genre of event.data.genres || []) genreSet.add(genre);
      }
    }
    city.genres = [...genreSet].sort((a, b) => a.localeCompare(b));
    return city.eventCount;
  };

  const continents = [...tree.values()].sort(byName);
  for (const continent of continents) {
    continent.countries = [...continent.countries.values()].sort(byName);
    continent.eventCount = 0;
    for (const country of continent.countries) {
      country.states = [...country.states.values()].sort(byName);
      country.cities = [...country.cities.values()].sort(byName);
      country.eventCount = 0;
      for (const state of country.states) {
        state.cities = [...state.cities.values()].sort(byName);
        state.eventCount = 0;
        for (const city of state.cities) {
          state.eventCount += finalizeCity(city);
        }
        country.eventCount += state.eventCount;
      }
      for (const city of country.cities) {
        country.eventCount += finalizeCity(city);
      }
      // Flat city list (state and stateless) for continent/homepage listings.
      country.allCities = [
        ...country.cities,
        ...country.states.flatMap((s) => s.cities),
      ].sort(byName);
      continent.eventCount += country.eventCount;
    }
  }
  return continents;
}

// Flat, plain-JS list of active events for the client-side search index and
// "near me" lookup (served as /events.json). Dates are pre-formatted here so
// the browser never needs a date-formatting library.
function buildSearchIndex(api) {
  const venueByDir = getVenueMap(api);
  const events = api
    .getFilteredByGlob("./events/**/*.md")
    .filter((e) => e.fileSlug !== "venue" && isActive(e.data));

  return events
    .map((event) => {
      const venueDoc = venueByDir.get(venueDir(event.filePathStem));
      const vd = venueDoc ? venueDoc.data : {};
      return {
        title: event.data.title,
        url: event.url,
        venue: vd.name || null,
        city: vd.city || null,
        state: vd.state || null,
        country: vd.country || null,
        continent: vd.continent || null,
        genres: event.data.genres || [],
        recurrence: event.data.recurrence || null,
        dateLabel: event.data.date
          ? DateTime.fromJSDate(event.data.date, { zone: "utc" }).toFormat("ccc d LLL yyyy")
          : null,
        time: event.data.time || null,
        lat: typeof vd.lat === "number" ? vd.lat : null,
        lon: typeof vd.lon === "number" ? vd.lon : null,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

// Rough city-level dot for every venue that has both an active event and
// coordinates, for the homepage globe.
function collectMapDots(continents) {
  const dots = [];
  for (const continent of continents) {
    for (const country of continent.countries) {
      const allCities = [...country.cities, ...country.states.flatMap((s) => s.cities)];
      for (const city of allCities) {
        for (const venue of city.venues) {
          const { lat, lon } = venue.doc.data;
          if (typeof lat === "number" && typeof lon === "number") {
            dots.push({ lat, lon });
          }
        }
      }
    }
  }
  return dots;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("TEMPLATE-EVENT.md");
  eleventyConfig.ignores.add("TEMPLATE-VENUE.md");

  eleventyConfig.addPassthroughCopy({ "src/css": "css", "src/js": "js" });
  eleventyConfig.addWatchTarget("src/css");
  eleventyConfig.addWatchTarget("src/js");

  eleventyConfig.addFilter("eventDate", (date) => {
    if (!date) return "";
    return DateTime.fromJSDate(date, { zone: "utc" }).toFormat("ccc d LLL yyyy");
  });

  eleventyConfig.addFilter("isUrl", (value) => /^https?:\/\//.test(String(value)));

  eleventyConfig.addFilter("slug", (value) => slugify(value));

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  // Comma-separated genre slugs for an event card's data-genres attribute,
  // used by the client-side genre filter on city pages.
  eleventyConfig.addFilter("genreSlugs", (genres) =>
    (genres || []).map(slugify).join(",")
  );

  // Look up the venue.md template object for a given event/venue page path.
  eleventyConfig.addFilter("venueFor", (venues, filePathStem) => {
    const dir = venueDir(filePathStem);
    return venues.find((v) => venueDir(v.filePathStem) === dir);
  });

  // Active events that live in the same venue folder as the given page.
  eleventyConfig.addFilter("eventsAtVenue", (events, filePathStem) => {
    const dir = venueDir(filePathStem);
    return events.filter((e) => venueDir(e.filePathStem) === dir);
  });

  eleventyConfig.addCollection("venues", (api) =>
    api.getFilteredByGlob("./events/**/venue.md")
  );
  eleventyConfig.addCollection("activeEvents", (api) => {
    const events = api
      .getFilteredByGlob("./events/**/*.md")
      .filter((e) => e.fileSlug !== "venue" && isActive(e.data));
    return events.sort((a, b) => {
      const ad = a.data.date ? a.data.date.getTime() : Infinity;
      const bd = b.data.date ? b.data.date.getTime() : Infinity;
      return ad - bd || a.data.title.localeCompare(b.data.title);
    });
  });
  eleventyConfig.addCollection("eventTree", (api) => buildTree(api));
  eleventyConfig.addCollection("continentPages", (api) => buildTree(api));
  eleventyConfig.addCollection("countryPages", (api) =>
    buildTree(api).flatMap((c) => c.countries)
  );
  eleventyConfig.addCollection("statePages", (api) =>
    buildTree(api).flatMap((c) => c.countries.flatMap((k) => k.states))
  );
  eleventyConfig.addCollection("cityPages", (api) =>
    buildTree(api).flatMap((c) =>
      c.countries.flatMap((k) => [...k.cities, ...k.states.flatMap((s) => s.cities)])
    )
  );

  eleventyConfig.addCollection("searchIndex", (api) => buildSearchIndex(api));
  eleventyConfig.addCollection("mapDots", (api) => collectMapDots(buildTree(api)));

  // Computed once and cached — the topology never changes within a build.
  let countryBordersCache;
  eleventyConfig.addCollection("countryBorders", () => {
    if (!countryBordersCache) countryBordersCache = buildCountryBorders();
    return countryBordersCache;
  });
  eleventyConfig.addCollection("siteStats", (api) => {
    const tree = buildTree(api);
    const countries = new Set();
    for (const continent of tree) {
      for (const country of continent.countries) {
        countries.add(`${continent.slug}/${country.slug}`);
      }
    }
    return {
      events: tree.reduce((n, c) => n + c.eventCount, 0),
      countries: countries.size,
      continents: tree.length,
    };
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "src/_includes",
      data: "src/_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
