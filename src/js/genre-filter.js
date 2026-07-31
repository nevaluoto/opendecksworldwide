(function () {
  var bar = document.querySelector("[data-city-genre-filter]");
  if (!bar) return;

  bar.addEventListener("click", function (e) {
    var button = e.target.closest(".filter-chip");
    if (!button) return;

    bar.querySelectorAll(".filter-chip").forEach(function (chip) {
      chip.classList.toggle("is-active", chip === button);
    });

    var genre = button.dataset.genre;
    document.querySelectorAll(".continent-section").forEach(function (section) {
      var grid = section.querySelector(".card-grid");
      if (!grid) return;
      var anyVisible = false;
      grid.querySelectorAll(".event-card").forEach(function (card) {
        var genres = (card.dataset.genres || "").split(",").filter(Boolean);
        var show = genre === "all" || genres.indexOf(genre) !== -1;
        card.classList.toggle("is-hidden", !show);
        if (show) anyVisible = true;
      });
      section.classList.toggle("is-empty", !anyVisible);
    });
  });
})();
