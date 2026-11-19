/* Atmosferi° homepage on the shared Fabrica system (for-agencies.css + home-f.css).
   Only what unified-home.js does not already do: the .js hook, the wordmark
   letter rise and the hero load state. Menu, rail, gallery, reveals and the
   film button stay in unified-home.js so the i18n layer keeps working. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  var word = document.querySelector(".f-hero__word");
  if (word) {
    var text = word.textContent;
    word.textContent = "";
    Array.prototype.forEach.call(text, function (ch, i) {
      var s = document.createElement("span");
      s.textContent = ch;
      s.style.setProperty("--i", String(i));
      word.appendChild(s);
    });
  }

  var hero = document.getElementById("home");
  var film = document.getElementById("heroFilm");
  if (hero) {
    var done = false;
    var start = function () {
      if (done) return;
      done = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("is-loaded"); }); });
    };
    if (film && film.readyState < 2) film.addEventListener("loadeddata", start, { once: true });
    else start();
    // Never hold the page hostage to a slow video.
    setTimeout(start, 700);
  }

  // Small cascade inside the website rail and the gallery.
  document.querySelectorAll("#websiteRail .un-work-card").forEach(function (el, i) { el.style.setProperty("--d", String(i)); });
})();

/* Gallery: first screen curated, "Show all images" expands in place. The
   lightbox reads the whole gallery, so hidden tiles still work in it. */
(function () {
  "use strict";
  var grid = document.getElementById("visualGallery");
  var btn = document.getElementById("galleryMore");
  if (!grid || !btn) return;
  var sync = function () {
    var total = grid.querySelectorAll(".un-viz-item").length;
    btn.parentNode.hidden = total <= 11;
  };
  btn.addEventListener("click", function () {
    var open = grid.classList.toggle("is-collapsed") === false;
    btn.setAttribute("aria-expanded", String(open));
    if (!open) grid.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  sync();
  // The admin can hide images after load (home-gallery-controls.js).
  if ("MutationObserver" in window) new MutationObserver(sync).observe(grid, { childList: true });
})();
