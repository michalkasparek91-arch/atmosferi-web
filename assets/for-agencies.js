/* Atmosferi° / for-agencies: menu, hero sequence, reveals and the enquiry form. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  doc.classList.add("js");

  // Mobile menu
  var header = document.getElementById("siteHeader");
  var burger = document.getElementById("menuToggle");
  var mobile = document.getElementById("mobileNav");
  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
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
  ["f-projs", "f-stats", "f-steps", "f-bento", "f-ai__cards", "f-screens", "f-mk", "f-caps", "f-zscreens"].forEach(function (cls) {
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

  // Enquiry form
  var form = document.getElementById("agencyForm");
  var status = document.getElementById("agencyStatus");
  if (!form || !status) return;
  var startedAt = Date.now();
  var busy = false;
  form.querySelectorAll(".ag-choice").forEach(function (b) {
    b.addEventListener("click", function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); });
  });
  function say(t, kind) { status.textContent = t; status.className = "ag-form__status" + (kind ? " is-" + kind : ""); }
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    var data = new FormData(form);
    var email = String(data.get("email") || "").trim();
    var message = String(data.get("message") || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say("Zadejte prosím platnou e-mailovou adresu.", "error"); form.elements.email.focus(); return; }
    if (message.length < 10) { say("Napište prosím alespoň krátký popis, stačí pár slov.", "error"); form.elements.message.focus(); return; }
    if (!window.AtmosferiInquiry) { say("Odeslání se nezdařilo. Napište prosím na info@atmosferi.com.", "error"); return; }
    var needs = Array.from(form.querySelectorAll('.ag-choice[aria-pressed="true"]')).map(function (b) { return b.getAttribute("data-value"); });
    var name = String(data.get("name") || "").trim();
    var btn = form.querySelector('[type="submit"]');
    busy = true; btn.disabled = true; say("Odesílám…");
    try {
      await window.AtmosferiInquiry.send({
        source: "websites-contact", mode: "web", name: name, email: email,
        message: (needs.length ? "Zájem: " + needs.join(", ") + "\n\n" : "") + message,
        project_type: needs.join(", ").slice(0, 100),
        website: String(data.get("website") || ""), started_at: startedAt,
        details: { page: "for-agencies", needs: needs, language: "cs" }
      });
      say("Děkuji, zpráva odešla. Ozvu se vám do dvou pracovních dnů.", "ok");
      form.reset();
      form.querySelectorAll(".ag-choice").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      startedAt = Date.now();
    } catch (err) {
      say(err.kind === "invalid" ? "Zkontrolujte prosím e-mail a zprávu."
        : err.kind === "saved" ? "Zpráva se uložila, ale upozornění neodešlo. Napište prosím i na info@atmosferi.com."
        : "Odeslání se nezdařilo. Napište prosím na info@atmosferi.com.", "error");
    } finally { busy = false; btn.disabled = false; }
  });
})();
