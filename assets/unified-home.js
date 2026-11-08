/* Atmosferi° unified homepage interactions. No dependencies, no page tracking. */
(function () {
  "use strict";
  document.documentElement.classList.add("js-enabled");
  function tr(value) {
    var lang = document.documentElement.lang || "en";
    return lang !== "en" && window.I18N_DICT && window.I18N_DICT[lang] &&
      window.I18N_DICT[lang][value] || value;
  }


  var header = document.getElementById("siteHeader");
  var hero = document.getElementById("home");
  var burger = document.getElementById("menuToggle");
  var mobile = document.getElementById("mobileNav");

  function closeMenu() {
    if (!header || !burger) return;
    header.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", tr("Open menu"));
  }

  if (header && burger && mobile) {
    burger.addEventListener("click", function () {
      var expanded = header.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", String(expanded));
      burger.setAttribute("aria-label", tr(expanded ? "Close menu" : "Open menu"));
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

  /* Website rail: native scroll-snap handles touch and keyboard scrolling;
     arrows advance one square card, disabled accurately at either end. */
  var websiteRail = document.getElementById("websiteRail");
  var websitePrev = document.getElementById("websitePrev");
  var websiteNext = document.getElementById("websiteNext");
  if (websiteRail && websitePrev && websiteNext) {
    var railTicking = false;
    function updateWebsiteArrows() {
      var end = Math.max(0, websiteRail.scrollWidth - websiteRail.clientWidth);
      websitePrev.disabled = websiteRail.scrollLeft <= 2;
      websiteNext.disabled = websiteRail.scrollLeft >= end - 2;
      railTicking = false;
    }
    function requestRailUpdate() {
      if (railTicking) return;
      railTicking = true;
      requestAnimationFrame(updateWebsiteArrows);
    }
    function scrollWebsites(direction) {
      var card = websiteRail.querySelector(".un-work-card");
      if (!card) return;
      var styles = getComputedStyle(websiteRail);
      var gap = parseFloat(styles.columnGap || styles.gap) || 0;
      var distance = card.getBoundingClientRect().width + gap;
      var reducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      websiteRail.scrollBy({
        left: direction * distance,
        behavior: reducedMotion ? "auto" : "smooth"
      });
    }
    websitePrev.addEventListener("click", function () { scrollWebsites(-1); });
    websiteNext.addEventListener("click", function () { scrollWebsites(1); });
    websiteRail.addEventListener("scroll", requestRailUpdate, { passive: true });
    window.addEventListener("resize", requestRailUpdate);
    window.addEventListener("pageshow", requestRailUpdate);
    if ("ResizeObserver" in window) {
      new ResizeObserver(requestRailUpdate).observe(websiteRail);
    }
    requestRailUpdate();
  }

  /* The full architecture archive keeps its individual project series in
     one native, keyboard-accessible dialog. No duplicate gallery script. */
  var gallery = Array.from(document.querySelectorAll(".un-viz-item"));
  var lightbox = document.getElementById("visualLightbox");
  if (gallery.length && lightbox && typeof lightbox.showModal === "function") {
    var large = document.getElementById("visualLarge");
    var count = document.getElementById("visualCount");
    var title = document.getElementById("visualTitle");
    var caption = document.getElementById("visualCaption");
    var note = document.getElementById("visualNote");
    var closeButton = document.getElementById("visualClose");
    var previous = document.getElementById("visualPrev");
    var next = document.getElementById("visualNext");
    var activeItems = gallery;
    var activeIndex = 0;
    var opener = null;
    var oldOverflow = "";

    function showImage(index) {
      if (!activeItems.length) return;
      activeIndex = (index + activeItems.length) % activeItems.length;
      var imageButton = activeItems[activeIndex];
      var image = imageButton.querySelector("img");
      large.src = imageButton.getAttribute("data-full");
      large.alt = image ? image.getAttribute("alt") || "" : "";
      title.textContent = tr(imageButton.getAttribute("data-project-title") || imageButton.getAttribute("data-cap") || "");
      var imageCaption = imageButton.getAttribute("data-cap") || "";
      var imageMeta = imageButton.getAttribute("data-meta") || "";
      caption.textContent = tr(imageCaption) + (imageMeta ? " · " + tr(imageMeta) : "");
      var message = imageButton.getAttribute("data-project-note") || "";
      note.textContent = tr(message);
      note.hidden = !message;
      count.textContent = String(activeIndex + 1).padStart(2,"0") + " / " + String(activeItems.length).padStart(2,"0");
    }

    function openImage(imageButton) {
      opener = imageButton;
      var groupName = imageButton.getAttribute("data-project");
      var group = groupName ? gallery.filter(function (entry) {
        return entry.getAttribute("data-project") === groupName;
      }) : [];
      // As on the original Visuals page, single-image projects navigate
      // the whole archive; series navigate only that project's images.
      activeItems = group.length > 1 ? group : gallery;
      showImage(activeItems.indexOf(imageButton));
      oldOverflow = document.body.style.overflow;
      lightbox.showModal();
      document.body.style.overflow = "hidden";
      closeButton.focus({ preventScroll: true });
    }

    gallery.forEach(function (imageButton) {
      imageButton.addEventListener("click", function () {
        openImage(imageButton);
      });
    });
    closeButton.addEventListener("click", function () { lightbox.close(); });
    previous.addEventListener("click", function () { showImage(activeIndex - 1); });
    next.addEventListener("click", function () { showImage(activeIndex + 1); });
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) lightbox.close();
    });
    lightbox.addEventListener("close", function () {
      document.body.style.overflow = oldOverflow;
      large.removeAttribute("src");
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    });
    document.addEventListener("keydown", function (event) {
      if (!lightbox.open) return;
      if (event.key === "ArrowRight") { event.preventDefault(); showImage(activeIndex + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); showImage(activeIndex - 1); }
      // Escape is handled by <dialog> natively.
    });
  }

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
    filmToggle.setAttribute("aria-label", tr(paused ? "Play film" : "Pause film"));
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
