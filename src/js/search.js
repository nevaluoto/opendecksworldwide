(function () {
  var NEAR_ME_RADIUS_KM = 150;
  var input = document.getElementById("event-search");
  var results = document.getElementById("search-results");
  var status = document.getElementById("search-status");
  if (!input || !results) return;

  var data = null;
  function load() {
    if (data) return Promise.resolve(data);
    return fetch("/events.json")
      .then(function (r) { return r.json(); })
      .then(function (d) { data = d; return d; });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cardHTML(item, distanceLabel) {
    var whenParts = [];
    if (item.recurrence) whenParts.push(item.recurrence);
    else if (item.dateLabel) whenParts.push(item.dateLabel);
    if (item.time) whenParts.push(item.time);

    var locationParts = [item.city, item.state, item.country].filter(Boolean);
    var loc = [item.venue].concat(locationParts.length ? [locationParts.join(", ")] : [])
      .filter(Boolean)
      .join(" · ");

    var genresHTML = item.genres && item.genres.length
      ? '<ul class="genre-list">' + item.genres.map(function (g) {
          return "<li>" + escapeHtml(g) + "</li>";
        }).join("") + "</ul>"
      : "";

    var badge = distanceLabel
      ? '<span class="badge badge-distance">' + escapeHtml(distanceLabel) + "</span>"
      : whenParts.length
        ? '<span class="badge badge-date">' + escapeHtml(whenParts.join(" · ")) + "</span>"
        : "";

    return (
      '<a class="event-card reveal is-visible" href="' + item.url + '">' +
        '<div class="event-card-head"><h3 class="event-card-title">' + escapeHtml(item.title) + "</h3>" + badge + "</div>" +
        '<p class="event-card-venue">' + escapeHtml(loc) + "</p>" +
        genresHTML +
      "</a>"
    );
  }

  function render(items, opts) {
    opts = opts || {};
    if (!items.length) {
      results.innerHTML = "";
      status.textContent = opts.emptyMessage || "No matching events.";
      return;
    }
    status.textContent = items.length + " event" + (items.length === 1 ? "" : "s") + (opts.statusSuffix || "");
    results.innerHTML = items.map(function (item) {
      return cardHTML(item, opts.distances && opts.distances[item.url]);
    }).join("");
  }

  input.addEventListener("input", function () {
    var q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = "";
      status.textContent = "";
      return;
    }
    load().then(function (items) {
      var matches = items.filter(function (item) {
        return [item.title, item.venue, item.city, item.state, item.country, item.continent]
          .filter(Boolean)
          .some(function (field) { return field.toLowerCase().indexOf(q) !== -1; });
      });
      render(matches, {
        statusSuffix: ' matching "' + q + '"',
        emptyMessage: 'No events match "' + q + '".',
      });
    });
  });

  function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = ((lat2 - lat1) * Math.PI) / 180;
    var dLon = ((lon2 - lon1) * Math.PI) / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  var nearBtn = document.getElementById("near-me-btn");
  if (nearBtn) {
    nearBtn.addEventListener("click", function () {
      if (!("geolocation" in navigator)) {
        status.textContent = "Location isn't available in this browser.";
        return;
      }
      status.textContent = "Finding events near you…";
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          load().then(function (items) {
            var here = pos.coords;
            var nearby = items
              .filter(function (i) { return i.lat != null && i.lon != null; })
              .map(function (i) {
                i._distance = haversineKm(here.latitude, here.longitude, i.lat, i.lon);
                return i;
              })
              .filter(function (i) { return i._distance <= NEAR_ME_RADIUS_KM; })
              .sort(function (a, b) { return a._distance - b._distance; });

            var distances = {};
            nearby.forEach(function (i) {
              distances[i.url] = Math.round(i._distance) + " km away";
            });

            input.value = "";
            render(nearby.slice(0, 12), {
              distances: distances,
              statusSuffix: " within " + NEAR_ME_RADIUS_KM + " km",
              emptyMessage: "No events within " + NEAR_ME_RADIUS_KM + " km of you yet.",
            });
          });
        },
        function () {
          status.textContent = "Couldn't get your location — check your browser's location permission.";
        },
        { timeout: 8000 }
      );
    });
  }
})();
