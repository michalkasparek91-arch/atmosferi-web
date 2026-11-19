/* Atmosferi° main subpages: masked headings, image wipes, tucking nav.
   Must load as a normal (non-deferred) script BEFORE i18n.js, so headings
   are wrapped before the translation layer collects its text nodes. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window)) return;
  doc.classList.add("atm-js");

  // 1. Wrap headings in a mask. Existing nodes are moved, not recreated.
  var titles = document.querySelectorAll(".pagehead__title, .section__title, .cta__title, .founder__title, .heroover__title, .footer__cta-link");
  titles.forEach(function (title) {
    if (title.querySelector(".ln")) return;
    var outer = document.createElement("span");
    var inner = document.createElement("span");
    outer.className = "ln";
    while (title.firstChild) inner.appendChild(title.firstChild);
    outer.appendChild(inner);
    title.appendChild(outer);
  });

  var show = function (el) { el.classList.add("is-in"); };
  var everything = [];
  var pagehead = document.querySelector(".pagehead");
  if (pagehead) everything.push(pagehead);
  titles.forEach(function (t) { if (!pagehead || !pagehead.contains(t)) everything.push(t); });
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    el.style.setProperty("--i", String(i % 3));
    everything.push(el);
  });

  if (reduced) {
    everything.forEach(show);
    if (pagehead && pagehead.querySelector(".pagehead__title")) show(pagehead.querySelector(".pagehead__title"));
    return;
  }

  // 2. Page head plays once on load; everything else on entering view.
  if (pagehead) {
    var headTitle = pagehead.querySelector(".pagehead__title");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        show(pagehead);
        if (headTitle) show(headTitle);
      });
    });
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      show(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
  everything.forEach(function (el) { if (el !== pagehead) io.observe(el); });

  // 3. Navigation tucks away on scroll down, returns on scroll up.
  var nav = document.querySelector(".nav");
  if (nav) {
    var lastY = window.scrollY;
    var busy = false;
    window.addEventListener("scroll", function () {
      if (busy) return;
      busy = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        var delta = y - lastY;
        if (y < 140 || delta < -6) nav.classList.remove("is-tucked");
        else if (delta > 6 && !nav.classList.contains("is-open")) nav.classList.add("is-tucked");
        if (Math.abs(delta) > 6) lastY = y;
        busy = false;
      });
    }, { passive: true });
    nav.addEventListener("focusin", function () { nav.classList.remove("is-tucked"); });
  }
})();
