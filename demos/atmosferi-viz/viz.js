/* ===========================================================================
   ATMOSFERI° VISUALISATION — viz.js
   Image-first refinements: scroll reveals, the grayscale→colour bloom,
   a fullscreen lightbox with keyboard nav, scroll progress, live clock.
   =========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  document.documentElement.classList.add("vz");  // enables curtain reveals

  /* ---- scroll progress + nav readability state ---- */
  var bar = document.getElementById("progress");
  var nav = document.querySelector("header.nav");
  var ribbon = document.querySelector(".ds-ribbon");
  function onScroll() {
    var h = document.documentElement;
    var st = h.scrollTop || window.pageYOffset || 0;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (st / max) * 100 : 0) + "%";
    if (nav) {
      var rh = ribbon ? ribbon.offsetHeight : 0;
      nav.style.top = Math.max(0, rh - st) + "px";
      nav.classList.toggle("scrolled", st >= (rh ? rh - 2 : 60));
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---- hero bloom on load ---- */
  var hero = document.querySelector(".hero");
  if (hero) {
    if (reduce) hero.classList.add("lit");
    else setTimeout(function () { hero.classList.add("lit"); }, 360);
  }

  /* ---- reveals ---- */
  if ("IntersectionObserver" in window && !reduce) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-rise]").forEach(function (el) { rio.observe(el); });
  } else {
    document.querySelectorAll("[data-rise]").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- curtain reveal: featured + gallery frames wipe open as they enter ---- */
  if ("IntersectionObserver" in window && !reduce) {
    var bio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("lit"); bio.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -4% 0px" });
    document.querySelectorAll(".feature__media.bloom, .frame.bloom").forEach(function (el) { bio.observe(el); });
  } else {
    document.querySelectorAll(".feature__media.bloom, .frame.bloom").forEach(function (el) { el.classList.add("lit"); });
  }

  /* ---- intro loader: lift once the page is ready (CSS auto-dismisses as a fallback) ---- */
  var vload = document.getElementById("vload");
  if (vload) {
    function liftLoader() { vload.classList.add("gone"); setTimeout(function () { vload.remove(); }, 800); }
    if (reduce) { liftLoader(); }
    else {
      window.addEventListener("load", function () { setTimeout(liftLoader, 500); });
      setTimeout(liftLoader, 2600); // hard fallback
    }
  }

  /* ---- custom VIEW cursor over openable images (desktop only) ---- */
  var vcur = document.getElementById("vcur");
  if (vcur && window.matchMedia("(pointer:fine)").matches && !reduce) {
    var cx = 0, cy = 0, tx = 0, ty = 0, curRaf = 0;
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!curRaf) curRaf = requestAnimationFrame(follow);
    });
    function follow() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      vcur.style.left = cx + "px"; vcur.style.top = cy + "px";
      curRaf = (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(follow) : 0;
    }
    document.querySelectorAll("[data-full]").forEach(function (el) {
      el.addEventListener("mouseenter", function () { vcur.classList.add("show"); });
      el.addEventListener("mouseleave", function () { vcur.classList.remove("show"); });
    });
  }

  /* ---- contact form: chips + mailto compose ---- */
  (function () {
    var form = document.getElementById("viz-form");
    if (!form) return;
    var chipsWrap = form.querySelector("[data-viz-chips]");
    var chosen = "";
    if (chipsWrap) {
      chipsWrap.addEventListener("click", function (e) {
        var b = e.target.closest(".vchip");
        if (!b) return;
        var on = b.getAttribute("aria-pressed") === "true";
        chipsWrap.querySelectorAll(".vchip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
        if (!on) { b.setAttribute("aria-pressed", "true"); chosen = b.textContent.trim(); }
        else { chosen = ""; }
      });
    }
    var status = form.querySelector(".vstatus");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector("#vf-name").value || "").trim();
      var email = (form.querySelector("#vf-email").value || "").trim();
      var msg = (form.querySelector("#vf-msg").value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (status) status.textContent = "— A valid email is needed so I can reply.";
        form.querySelector("#vf-email").focus();
        return;
      }
      var subject = "Visualisation enquiry" + (chosen ? " · " + chosen : "");
      var body =
        "Name: " + (name || "—") + "\n" +
        "Email: " + email + "\n" +
        "Needs: " + (chosen || "—") + "\n\n" +
        (msg || "");
      var href = "mailto:info@atmosferi.com?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
      window.location.href = href;
      if (status) status.textContent = "— Opening your email app… or write to info@atmosferi.com.";
    });
  })();

  /* ---- site switcher: sliding knob (Studio ↔ Visual) ---- */
  (function () {
    function place(sw, seg) {
      var knob = sw.querySelector(".swx__knob"); if (!knob || !seg) return;
      knob.style.left = seg.offsetLeft + "px"; knob.style.width = seg.offsetWidth + "px";
    }
    function rest(sw) { place(sw, sw.querySelector(".swx__seg.is-on")); }
    document.querySelectorAll(".swx").forEach(function (sw) {
      rest(sw);
      sw.querySelectorAll(".swx__seg").forEach(function (seg) {
        seg.addEventListener("mouseenter", function () { place(sw, seg); });
      });
      sw.addEventListener("mouseleave", function () { rest(sw); });
    });
    window.addEventListener("resize", function () { document.querySelectorAll(".swx").forEach(rest); });
    window.addEventListener("load", function () { document.querySelectorAll(".swx").forEach(rest); });
  })();

  /* ---- live Prague clock ---- */
  var clk = document.getElementById("clk");
  function tick() {
    try { clk.textContent = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" }); }
    catch (e) {}
  }
  if (clk) { tick(); setInterval(tick, 15000); }

  /* =========================================================================
     LIGHTBOX
     ========================================================================= */
  var items = [].slice.call(document.querySelectorAll("[data-full]"));
  var lb = document.getElementById("lb");
  var lbImg = document.getElementById("lbImg");
  var lbT = document.getElementById("lbT");
  var lbM = document.getElementById("lbM");
  var lbCount = document.getElementById("lbCount");
  var idx = -1;

  function show(i) {
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    idx = i;
    var el = items[i];
    lbImg.src = el.getAttribute("data-full");
    lbImg.alt = el.getAttribute("data-cap") || "";
    lbT.textContent = el.getAttribute("data-cap") || "";
    lbM.textContent = el.getAttribute("data-meta") || "";
    lbCount.textContent = ("0" + (i + 1)).slice(-2) + " / " + ("0" + items.length).slice(-2);
  }
  function open(i) {
    show(i);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function close() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  items.forEach(function (el, i) {
    el.addEventListener("click", function () { open(i); });
  });
  document.getElementById("lbClose").addEventListener("click", close);
  document.getElementById("lbNext").addEventListener("click", function (e) { e.stopPropagation(); show(idx + 1); });
  document.getElementById("lbPrev").addEventListener("click", function (e) { e.stopPropagation(); show(idx - 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
  });

  /* =========================================================================
     IN MOTION — showreel video (muted autoplay, sound toggle, play/pause)
     ========================================================================= */
  (function () {
    var film = document.getElementById("film");
    if (!film) return;
    var video = document.getElementById("filmVideo");
    var tcEl = document.getElementById("filmTC");
    var durEl = document.getElementById("filmDur");
    var progEl = document.getElementById("filmProg");
    var playBtn = document.getElementById("filmPlay");
    var soundBtn = document.getElementById("filmSound");
    var soundLab = soundBtn ? soundBtn.querySelector(".film__sound-lab") : null;
    if (!video) return;

    function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2); }

    // muted autoplay loop
    video.muted = true;
    video.loop = true;

    film.classList.add("paused");
    function reflectState() { film.classList.toggle("paused", video.paused); }

    function tryPlay() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked — stays paused with overlay */ });
    }

    video.addEventListener("loadedmetadata", function () { durEl.textContent = fmt(video.duration); });
    video.addEventListener("timeupdate", function () {
      tcEl.textContent = fmt(video.currentTime);
      progEl.style.width = (video.duration ? (video.currentTime / video.duration) * 100 : 0) + "%";
    });
    video.addEventListener("play", reflectState);
    video.addEventListener("playing", reflectState);
    video.addEventListener("pause", reflectState);

    // play / pause on stage click
    film.addEventListener("click", function (e) {
      if (soundBtn && soundBtn.contains(e.target)) return;
      if (video.paused) tryPlay(); else video.pause();
    });
    if (playBtn) playBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (video.paused) tryPlay(); else video.pause();
    });

    // sound toggle — always-visible
    function setSound(on) {
      video.muted = !on;
      soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
      if (soundLab) soundLab.textContent = on ? "Sound on" : "Sound off";
      if (on && video.paused) tryPlay();
    }
    if (soundBtn) soundBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setSound(video.muted);  // toggle
    });

    // autoplay muted when scrolled into view; pause when out (saves resources)
    if ("IntersectionObserver" in window && !reduce) {
      var vio = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) { tryPlay(); }
          else if (!video.paused) { video.pause(); }
        });
      }, { threshold: 0.4 });
      vio.observe(film);
    } else if (!reduce) {
      tryPlay();
    }
  })();

  /* =========================================================================
     360° — drag-to-look panorama
     ========================================================================= */
  (function () {
    var stage = document.getElementById("pano");
    if (!stage) return;
    var track = document.getElementById("panoTrack");
    var img = document.getElementById("panoImg");
    var headEl = document.getElementById("panoHead");
    var tip = document.getElementById("panoTip");
    var hots = [].slice.call(stage.querySelectorAll(".pano__hot"));
    var DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

    var x = 0, min = 0, dragging = false, startX = 0, startPos = 0, vel = 0, lastX = 0, momentum = 0;

    function bounds() {
      // the track is a fixed-width wide strip; pan range = stage - track width
      var tw = track.getBoundingClientRect().width;
      min = Math.min(0, stage.clientWidth - tw);
    }
    function apply() {
      if (x > 0) x = 0; if (x < min) x = min;
      track.style.transform = "translateX(" + x + "px)";
      var frac = min < 0 ? (x / min) : 0;          // 0 → left edge, 1 → right edge
      var deg = Math.round(frac * 359);
      headEl.textContent = ("00" + deg).slice(-3) + "° · " + DIRS[Math.round(frac * 8) % 8];
      positionHots(frac);
    }
    function positionHots(frac) {
      var iw = track.getBoundingClientRect().width || 1;
      hots.forEach(function (h) {
        var hx = parseFloat(h.getAttribute("data-x"));      // 0..1 along image
        var px = hx * iw + x;                                 // screen x
        h.style.left = px + "px";
        h.style.display = (px > -20 && px < stage.clientWidth + 20) ? "flex" : "none";
      });
    }

    function down(e) {
      dragging = true; stage.classList.add("grabbing", "touched");
      startX = (e.touches ? e.touches[0].clientX : e.clientX);
      lastX = startX; startPos = x; momentum = 0;
    }
    function move(e) {
      if (!dragging) return;
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      vel = cx - lastX; lastX = cx;
      x = startPos + (cx - startX);
      apply();
    }
    function up() {
      if (!dragging) return;
      dragging = false; stage.classList.remove("grabbing");
      momentum = vel * 12;
      requestAnimationFrame(glide);
    }
    function glide() {
      if (Math.abs(momentum) < 0.5 || dragging) return;
      x += momentum; momentum *= 0.92; apply();
      requestAnimationFrame(glide);
    }

    stage.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    stage.addEventListener("touchstart", down, { passive: true });
    stage.addEventListener("touchmove", function (e) { move(e); }, { passive: true });
    stage.addEventListener("touchend", up);

    hots.forEach(function (h) {
      h.addEventListener("click", function (e) {
        e.stopPropagation();
        tip.textContent = h.getAttribute("data-tip");
        tip.classList.add("show");
        clearTimeout(h._t);
        h._t = setTimeout(function () { tip.classList.remove("show"); }, 2200);
      });
    });

    function init() { bounds(); x = Math.round(min * 0.18); apply(); }
    if (img.complete) init(); else img.addEventListener("load", init);
    window.addEventListener("resize", function () { bounds(); apply(); });

    // gentle auto-drift until first interaction (hints it's draggable)
    if (!reduce) {
      var drift = setInterval(function () {
        if (stage.classList.contains("touched")) { clearInterval(drift); return; }
        x -= 0.4; if (x < min) { clearInterval(drift); return; } apply();
      }, 40);
    }
  })();
})();
