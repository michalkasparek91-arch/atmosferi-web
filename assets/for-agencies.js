/* Atmosferi° / for-agencies: menu, hero sequence, reveals and the enquiry form. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  doc.classList.add("js");
  // Recover from an intermittent image delivery failure without forcing a page refresh.
  // Only one retry, only for our own static image assets. Persistent 404s remain visible.
  document.querySelectorAll('img[src^="/img/"]').forEach(function (img) {
    function retryImage() {
      if (img.dataset.imageRetryUsed) return;
      img.dataset.imageRetryUsed = "1";
      var original = img.getAttribute("src");
      if (!original) return;
      window.setTimeout(function () {
        if (img.complete && img.naturalWidth > 0) return;
        img.loading = "eager";
        var url = new URL(original, window.location.origin);
        url.searchParams.set("asset_retry", "1");
        img.src = url.pathname + url.search;
      }, 500);
    }
    img.addEventListener("error", retryImage);
    if (img.complete && img.naturalWidth === 0) retryImage();
  });

  // Strings set from script follow the language picked in the switcher.
  function tr(t) { var l = doc.lang; return (window.I18N_DICT && I18N_DICT[l] && I18N_DICT[l][t]) || t; }

  // Mobile menu
  var header = document.getElementById("siteHeader");
  var burger = document.getElementById("menuToggle");
  var mobile = document.getElementById("mobileNav");
  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", tr(open ? "Zavřít menu" : "Otevřít menu"));
  }
  if (header && burger && mobile) {
    burger.addEventListener("click", function () { setMenu(!header.classList.contains("menu-open")); });
    mobile.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // Hero: wordmark letters, then the rest
  var hero = document.getElementById("home");
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
  if (hero) requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("is-loaded"); }); });

  // Hero film: one blurred frame at a time
  var frames = document.querySelectorAll(".f-hero__film img");
  if (frames.length) {
    var cur = 0;
    frames[0].classList.add("is-on");
    if (!reduced && frames.length > 1) setInterval(function () {
      if (document.hidden) return;
      frames[cur].classList.remove("is-on");
      cur = (cur + 1) % frames.length;
      frames[cur].classList.add("is-on");
    }, 5200);
  }

  // Product video respects reduced motion
  if (reduced) document.querySelectorAll("video[autoplay]").forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });

  // Reveal on scroll, small cascade inside grids
  ["f-projs", "f-stats", "f-steps", "f-bento", "f-ai__cards", "f-caps", "f-nums"].forEach(function (cls) {
    var g = document.querySelector("." + cls);
    if (g) Array.prototype.forEach.call(g.querySelectorAll("[data-reveal]"), function (el, i) { el.style.setProperty("--d", String(i)); });
  });
  var targets = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Zrobee screens: hovering a frame scrolls the whole page inside it.
  var views = document.querySelectorAll(".f-screen__view");
  var sizeViews = function () { views.forEach(function (v) { v.style.setProperty("--view-h", v.clientHeight + "px"); }); };
  if (views.length) { sizeViews(); window.addEventListener("resize", sizeViews, { passive: true }); }

  // Search results count up once when visible.
  var counters = document.querySelectorAll("[data-count]");
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
  if (counters.length && !reduced && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, end = Number(el.getAttribute("data-count")), t0 = null;
        var step = function (t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / 1600);
          el.textContent = fmt(end * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // Zrobee admin viewer: tabs, crossfade, auto-rotation until the visitor picks one.
  var adm = document.querySelector(".f-adm");
  if (adm) {
    var tabs = Array.prototype.slice.call(adm.querySelectorAll('[role="tab"]'));
    var shots = adm.querySelectorAll(".f-adm__stack img");
    var url = adm.querySelector(".f-adm__url");
    var panel = adm.querySelector('[role="tabpanel"]');
    var at = 0, timer = null, manual = false, visible = false, dur = 6000;
    var show = function (i, focus) {
      at = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) { t.setAttribute("aria-selected", k === at ? "true" : "false"); t.tabIndex = k === at ? 0 : -1; });
      shots.forEach(function (s, k) { s.classList.toggle("is-on", k === at); });
      if (url) url.textContent = tabs[at].getAttribute("data-url");
      if (panel) panel.setAttribute("aria-labelledby", tabs[at].id);
      if (focus) tabs[at].focus();
      adm.classList.remove("is-auto"); void adm.offsetWidth;
      if (!manual && !reduced && visible) adm.classList.add("is-auto");
    };
    var stop = function () { clearInterval(timer); timer = null; adm.classList.remove("is-auto"); };
    var start = function () {
      if (reduced || manual || timer) return;
      adm.style.setProperty("--adm-dur", dur / 1000 + "s");
      adm.classList.add("is-auto");
      timer = setInterval(function () { show(at + 1); }, dur);
    };
    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () { manual = true; stop(); show(k); });
      t.addEventListener("keydown", function (e) {
        var d = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -1 : 0;
        if (!d) return;
        e.preventDefault(); manual = true; stop(); show(at + d, true);
      });
    });
    adm.addEventListener("mouseenter", stop);
    adm.addEventListener("mouseleave", function () { if (visible) start(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible = en.isIntersecting; if (visible) start(); else stop(); });
      }, { threshold: 0.35 }).observe(adm);
    }
  }

  // Zrobee interface slider: one preview at a time, arrows, keys and swipe.
  var gal = document.querySelector(".f-gal");
  if (gal) {
    var slides = Array.prototype.slice.call(gal.querySelectorAll(".f-gal__slide"));
    var gTitle = gal.querySelector(".f-gal__title");
    var gDesc = gal.querySelector(".f-gal__desc");
    var gCount = gal.querySelector(".f-gal__count");
    var stage = gal.querySelector(".f-gal__stage");
    var gi = 0;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var go = function (d) {
      var prev = slides[gi];
      gi = (gi + d + slides.length) % slides.length;
      var next = slides[gi];
      prev.classList.remove("is-on"); prev.classList.add("is-out"); prev.setAttribute("aria-hidden", "true");
      setTimeout(function () { prev.classList.remove("is-out"); }, 650);
      next.classList.add("is-on"); next.removeAttribute("aria-hidden");
      gTitle.textContent = next.getAttribute("data-title");
      gDesc.textContent = next.getAttribute("data-desc");
      gCount.textContent = pad(gi + 1) + " / " + pad(slides.length);
      var v = next.querySelector(".f-screen__view");
      if (v) v.style.setProperty("--view-h", v.clientHeight + "px");
    };
    gal.querySelectorAll(".f-gal__btn").forEach(function (b) {
      b.addEventListener("click", function () { go(Number(b.getAttribute("data-dir"))); });
    });
    stage.setAttribute("tabindex", "0");
    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    var x0 = null;
    stage.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    stage.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    });
    var sizeGal = function () {
      slides.forEach(function (s) { var v = s.querySelector(".f-screen__view"); if (v && v.clientHeight) v.style.setProperty("--view-h", v.clientHeight + "px"); });
    };
    sizeGal(); window.addEventListener("resize", sizeGal, { passive: true });
  }

  // Enquiry form
  var form = document.getElementById("agencyForm");
  var status = document.getElementById("agencyStatus");
  if (!form || !status) return;
  var startedAt = Date.now();
  var busy = false;
  form.querySelectorAll(".ag-choice").forEach(function (b) {
    b.addEventListener("click", function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); });
  });

  // Google Meet intro: this is a call REQUEST, never an invented calendar
  // booking. The existing inquiry endpoint delivers it with minimal friction.
  var callLinks = document.querySelectorAll("[data-agency-call-request]");
  var callReset = form.querySelector("[data-agency-call-reset]");
  var messageField = form.elements.message;
  var originalPlaceholder = messageField.getAttribute("placeholder");
  var callPlaceholders = {
    cs: "Například úterý odpoledne, případně se domluvíme e-mailem.",
    en: "For example Tuesday afternoon, or we can arrange it by email.",
    de: "Zum Beispiel Dienstag Nachmittag, oder wir stimmen uns per E-Mail ab.",
    fr: "Par exemple mardi après-midi, ou nous convenons d'un créneau par e-mail."
  };
  function resetCallMode() {
    form.classList.remove("is-call-request");
    messageField.required = true;
    messageField.minLength = 10;
    messageField.value = "";
    // Restore the original localized placeholder instead of a translated
    // stale value if the visitor changed language mid-form.
    messageField.placeholder = tr(originalPlaceholder);
  }
  function enterCallMode(event) {
    event.preventDefault();
    form.classList.add("is-call-request");
    messageField.required = false;
    messageField.minLength = 0;
    messageField.value = "";
    messageField.placeholder = callPlaceholders[doc.lang] || callPlaceholders.cs;
    form.querySelectorAll(".ag-choice").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    form.elements.email.focus({ preventScroll: true });
  }
  callLinks.forEach(function (a) { a.addEventListener("click", enterCallMode); });
  if (callReset) callReset.addEventListener("click", resetCallMode);
  function say(t, kind) { status.textContent = tr(t); status.className = "ag-form__status" + (kind ? " is-" + kind : ""); }
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    var data = new FormData(form);
    var email = String(data.get("email") || "").trim();
    var message = String(data.get("message") || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say("Zadejte prosím platnou e-mailovou adresu.", "error"); form.elements.email.focus(); return; }
    var callRequest = form.classList.contains("is-call-request");
    if (!callRequest && message.length < 10) { say("Napište prosím alespoň krátký popis, stačí pár slov.", "error"); form.elements.message.focus(); return; }
    if (!window.AtmosferiInquiry) { say("Odeslání se nezdařilo. Napište prosím na info@atmosferi.com.", "error"); return; }
    var needs = Array.from(form.querySelectorAll('.ag-choice[aria-pressed="true"]')).map(function (b) { return b.getAttribute("data-value"); });
    var name = String(data.get("name") || "").trim();
    var btn = form.querySelector('[type="submit"]');
    busy = true; btn.disabled = true; say("Odesílám…");
    try {
      await window.AtmosferiInquiry.send({
        source: callRequest ? "agency-intro-call" : "websites-contact", mode: "web", name: name, email: email,
        message: callRequest ? ("Žádost o úvodní 15min Google Meet. " + (message ? "Navržený čas: " + message : "Termín domluvit e-mailem.")) : ((needs.length ? "Zájem: " + needs.join(", ") + "\n\n" : "") + message),
        project_type: callRequest ? "Agency intro call · Google Meet" : needs.join(", ").slice(0, 100),
        website: String(data.get("website") || ""), started_at: startedAt,
        details: { page: "for-agencies", needs: needs, call_request: callRequest, language: doc.lang || "cs" }
      });
      say(callRequest ? "Děkuji, žádost o call odešla. Ozvu se s termínem a odkazem na Google Meet do dvou pracovních dnů." : "Děkuji, zpráva odešla. Ozvu se vám do dvou pracovních dnů.", "ok");
      form.reset();
      resetCallMode();
      form.querySelectorAll(".ag-choice").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      startedAt = Date.now();
    } catch (err) {
      say(err.kind === "invalid" ? "Zkontrolujte prosím e-mail a zprávu."
        : err.kind === "saved" ? "Zpráva se uložila, ale upozornění neodešlo. Napište prosím i na info@atmosferi.com."
        : "Odeslání se nezdařilo. Napište prosím na info@atmosferi.com.", "error");
    } finally { busy = false; btn.disabled = false; }
  });
})();
