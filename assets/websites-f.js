/* Atmosferi° websites page: menu, reveals and the website-concept slider. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function tr(t) { var l = doc.lang; return (l !== "en" && window.I18N_DICT && I18N_DICT[l] && I18N_DICT[l][t]) || t; }

  // Mobile menu
  var header = document.getElementById("siteHeader");
  var burger = document.getElementById("menuToggle");
  var mobile = document.getElementById("mobileNav");
  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", tr(open ? "Close menu" : "Open menu"));
  }
  if (header && burger && mobile) {
    burger.addEventListener("click", function () { setMenu(!header.classList.contains("menu-open")); });
    mobile.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // Reveals
  document.querySelectorAll(".w-do [data-reveal]").forEach(function (el, i) { el.style.setProperty("--d", String(i)); });
  var targets = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) targets.forEach(function (el) { el.classList.add("is-in"); });
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Website slider: one browser window, hover scrolls the whole page inside it.
  var gal = document.querySelector(".w-gal");
  if (!gal) return;
  var slides = Array.prototype.slice.call(gal.querySelectorAll(".f-gal__slide"));
  var title = gal.querySelector(".f-gal__title");
  var desc = gal.querySelector(".f-gal__desc");
  var count = gal.querySelector(".f-gal__count");
  var open = gal.querySelector(".w-open");
  var stage = gal.querySelector(".f-gal__stage");
  var at = 0;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function size(s) { var v = s.querySelector(".f-screen__view"); if (v && v.clientHeight) v.style.setProperty("--view-h", v.clientHeight + "px"); }
  function go(d) {
    var prev = slides[at];
    at = (at + d + slides.length) % slides.length;
    var next = slides[at];
    prev.classList.remove("is-on"); prev.classList.add("is-out"); prev.setAttribute("aria-hidden", "true");
    setTimeout(function () { prev.classList.remove("is-out"); var v = prev.querySelector(".f-screen__view"); if (v) v.scrollTop = 0; }, 650);
    next.classList.add("is-on"); next.removeAttribute("aria-hidden");
    title.textContent = tr(next.getAttribute("data-title"));
    desc.textContent = tr(next.getAttribute("data-desc"));
    count.textContent = pad(at + 1) + " / " + pad(slides.length);
    if (open) open.href = next.getAttribute("data-href");
    var img = next.querySelector("img"); if (img) img.loading = "eager";
    size(next);
  }
  gal.querySelectorAll(".f-gal__btn").forEach(function (b) {
    b.addEventListener("click", function () { go(Number(b.getAttribute("data-dir"))); });
  });
  stage.setAttribute("tabindex", "0");
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });
  // Swipe sideways to change site (vertical swipes still scroll the page inside).
  var x0 = null, y0 = null;
  stage.addEventListener("pointerdown", function (e) { x0 = e.clientX; y0 = e.clientY; });
  stage.addEventListener("pointerup", function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0; x0 = y0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  });
  // Preload the next site once the slider is near the screen.
  if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      slides.forEach(function (s) { var i = s.querySelector("img"); if (i) i.loading = "eager"; });
      pio.disconnect();
    }, { rootMargin: "400px" });
    pio.observe(stage);
  }
  function sizeAll() { slides.forEach(size); }
  sizeAll();
  window.addEventListener("resize", sizeAll, { passive: true });
  window.addEventListener("load", sizeAll);
})();
