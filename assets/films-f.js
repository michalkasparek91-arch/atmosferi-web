/* Atmosferi° films & 360° page: menu, reveals and the film player.
   The 360° tour itself is assets/pano-f.js. */
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
  var targets = document.querySelectorAll("[data-reveal]");
  document.querySelectorAll(".v-uses [data-reveal]").forEach(function (el, i) { el.style.setProperty("--d", String(i)); });
  if (reduced || !("IntersectionObserver" in window)) targets.forEach(function (el) { el.classList.add("is-in"); });
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Film player
  var player = document.getElementById("player");
  var video = document.getElementById("playerVideo");
  if (!player || !video) return;
  var playBtn = document.getElementById("playerPlay");
  var soundBtn = document.getElementById("playerSound");
  var nameEl = document.getElementById("playerName");
  var descEl = document.getElementById("playerDesc");
  var idxEl = document.getElementById("playerIndex");
  var timeEl = document.getElementById("playerTime");
  var durEl = document.getElementById("playerDur");
  var bar = document.getElementById("playerBar");
  var prog = document.getElementById("playerProg");
  var items = Array.prototype.slice.call(document.querySelectorAll(".v-reel__item"));
  var userPaused = reduced, visible = false, current = 0;

  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function sync() { player.classList.toggle("is-paused", video.paused); }
  function tryPlay() { var p = video.play(); if (p && p.catch) p.catch(function () { sync(); }); }

  function select(i, autoplay) {
    current = (i + items.length) % items.length;
    var it = items[current];
    items.forEach(function (b, k) { b.classList.toggle("is-on", k === current); b.setAttribute("aria-pressed", k === current ? "true" : "false"); });
    video.pause();
    video.poster = it.getAttribute("data-poster");
    video.src = it.getAttribute("data-src");
    nameEl.textContent = it.getAttribute("data-title");
    descEl.textContent = it.getAttribute("data-desc");
    idxEl.textContent = pad(current + 1) + " / " + pad(items.length);
    timeEl.textContent = "00:00"; durEl.textContent = "00:00"; prog.style.width = "0%";
    video.load();
    if (autoplay) { userPaused = false; tryPlay(); }
    sync();
  }

  items.forEach(function (b, i) { b.addEventListener("click", function () { select(i, true); }); });
  function toggle() {
    if (video.paused) { userPaused = false; tryPlay(); } else { userPaused = true; video.pause(); }
  }
  player.addEventListener("click", function (e) {
    if (e.target.closest("#playerSound") || e.target.closest("#playerBar")) return;
    toggle();
  });
  playBtn.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
  player.addEventListener("keydown", function (e) {
    if (e.target !== player) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
    if (e.key === "ArrowRight") { e.preventDefault(); select(current + 1, true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); select(current - 1, true); }
  });
  soundBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    video.muted = !video.muted;
    player.classList.toggle("is-sound", !video.muted);
    soundBtn.setAttribute("aria-pressed", String(!video.muted));
    soundBtn.setAttribute("aria-label", tr(video.muted ? "Sound on" : "Sound off"));
    if (video.paused) { userPaused = false; tryPlay(); }
  });
  ["play", "pause", "ended"].forEach(function (ev) { video.addEventListener(ev, sync); });
  video.addEventListener("loadedmetadata", function () { durEl.textContent = fmt(video.duration); });
  video.addEventListener("timeupdate", function () {
    timeEl.textContent = fmt(video.currentTime);
    var pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    prog.style.width = pct + "%";
    bar.setAttribute("aria-valuenow", String(Math.round(pct)));
  });
  function seek(clientX) {
    var r = bar.getBoundingClientRect();
    var k = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (video.duration) video.currentTime = k * video.duration;
  }
  bar.addEventListener("click", function (e) { e.stopPropagation(); seek(e.clientX); });
  bar.addEventListener("keydown", function (e) {
    if (!video.duration) return;
    if (e.key === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 5); }
    if (e.key === "ArrowLeft") { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
  });

  // Plays muted while on screen (unless paused by the visitor or reduced motion).
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible = en.isIntersecting;
        if (!visible) video.pause();
        else if (!userPaused) tryPlay();
      });
    }, { threshold: 0.35 }).observe(player);
  }
  sync();
})();
