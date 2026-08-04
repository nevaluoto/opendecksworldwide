(function () {
  var items = document.querySelectorAll(".recent-ticker-item");
  if (items.length < 2) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var index = 0;
  setInterval(function () {
    items[index].classList.remove("is-active");
    index = (index + 1) % items.length;
    items[index].classList.add("is-active");
  }, 4500);
})();
