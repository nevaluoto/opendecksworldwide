const { isActive, pathParts, isVenueDoc, venueDir } = require("../lib/events");

// Applies to every markdown file under events/. Two kinds of documents live
// here: venue.md (evergreen venue details, always rendered at the venue folder
// URL) and event files (rendered only while active — inactive/expired events
// produce no output page at all, so their old URLs 404).
module.exports = {
  eleventyComputed: {
    layout: (data) =>
      isVenueDoc(data.page.filePathStem) ? "venue.njk" : "event.njk",
    permalink: (data) => {
      const stem = data.page.filePathStem;
      if (isVenueDoc(stem)) {
        return `${venueDir(stem).replace(/^\/events/, "")}/index.html`;
      }
      return isActive(data)
        ? `${stem.replace(/^\/events/, "")}/index.html`
        : false;
    },
    eleventyExcludeFromCollections: (data) =>
      isVenueDoc(data.page.filePathStem) ? false : !isActive(data),
    locations: (data) => pathParts(data.page.filePathStem),
  },
};
