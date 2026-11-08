/* Atmosferi° unified homepage interactions. No dependencies, no page tracking. */
(function () {
  "use strict";
  document.documentElement.classList.add("js-enabled");

  var header = document.getElementById("siteHeader");
  var hero = document.getElementById("home");
  var burger = document.getElementById("menuToggle");
  var mobile = document.getElementById("mobileNav");

  function closeMenu() {
    if (!header || !burger) return;
    header.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
  }

  if (header && burger && mobile) {
    burger.addEventListener("click", function () {
      var expanded = header.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", String(expanded));
      burger.setAttribute("aria-label", expanded ? "Close menu" : "Open menu");
    });
    mobile.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) closeMenu();
    }, { passive: true });
  }

  var ticking = false;
  function syncHeader() {
    if (!header || !hero) return;
    var light = hero.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom;
    header.classList.toggle("is-light", light);
    ticking = false;
  }
  function requestSync() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncHeader);
  }
  syncHeader();
  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync);
  window.addEventListener("pageshow", requestSync);

  var buttons = Array.from(document.querySelectorAll(".un-filter"));
  var cards = Array.from(document.querySelectorAll(".un-work-card"));
  var grid = document.getElementById("workGrid");
  var announcer = document.createElement("span");
  announcer.className = "sr-only";
  announcer.setAttribute("role", "status");
  announcer.setAttribute("aria-live", "polite");
  announcer.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  if (grid) grid.before(announcer);

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var filter = button.getAttribute("data-filter") || "all";
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === button));
      });
      var visible = 0;
      cards.forEach(function (card) {
        var keep = filter === "all" || card.getAttribute("data-category") === filter;
        card.hidden = !keep;
        if (keep) {
          card.classList.add("visible");
          visible++;
        }
      });
      announcer.textContent = visible + " projects shown";
    });
  });

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduced) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 70px 0px" });
    document.querySelectorAll("[data-reveal]").forEach(function (el) { revealObserver.observe(el); });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("visible"); });
  }

  var film = document.getElementById("heroFilm");
  var filmToggle = document.getElementById("filmToggle");
  var explicitlyPaused = !!reduced;
  function syncFilmButton() {
    if (!film || !filmToggle) return;
    var paused = film.paused;
    filmToggle.setAttribute("aria-label", paused ? "Play film" : "Pause film");
    filmToggle.setAttribute("aria-pressed", String(!paused));
    var label = filmToggle.querySelector("span");
    if (label) label.textContent = paused ? "▶" : "Ⅱ";
  }
  if (film && filmToggle) {
    if (reduced) film.pause();
    filmToggle.addEventListener("click", function () {
      if (film.paused) {
        explicitlyPaused = false;
        film.play().catch(function () {});
      } else {
        explicitlyPaused = true;
        film.pause();
      }
      syncFilmButton();
    });
    ["play", "pause", "ended"].forEach(function (ev) { film.addEventListener(ev, syncFilmButton); });
    if ("IntersectionObserver" in window) {
      var filmObserver = new IntersectionObserver(function (entries) {
        var visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (!visible) film.pause();
        else if (!explicitlyPaused) film.play().catch(function () {});
        syncFilmButton();
      }, { threshold: 0.12 });
      filmObserver.observe(film);
    }
    syncFilmButton();
  }
})();
