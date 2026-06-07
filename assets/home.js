/* ===========================================================================
   ATMOSFERI — home.js
   Landing-only refinements: scroll reveals, count-up proof figures,
   and a live Prague clock. Progressive — the page is complete without it.
   =========================================================================== */
(function () {
  "use strict";
  var html = document.documentElement;
  html.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---- scroll reveals ---- */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-rise]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll("[data-rise]").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- count-up proof figures ---- */
  function countUp(el) {
    var raw = el.getAttribute("data-count");
    var target = parseFloat(raw);
    var dec = (raw.split(".")[1] || "").length;
    if (reduce) { el.firstChild.nodeValue = target.toFixed(dec); return; }
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / 1500, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.firstChild.nodeValue = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });
  } else {
    document.querySelectorAll("[data-count]").forEach(function (el) {
      el.firstChild.nodeValue = el.getAttribute("data-count");
    });
  }

  /* ---- live Prague clock ---- */
  var clk = document.getElementById("praClock");
  if (clk) {
    function tick() {
      try {
        clk.textContent = new Date().toLocaleTimeString("en-GB", {
          timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit"
        });
      } catch (e) { /* leave placeholder */ }
    }
    tick();
    setInterval(tick, 15000);
  }
})();
