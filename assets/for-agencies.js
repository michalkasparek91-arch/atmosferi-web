/* Atmosferi° / for-agencies: Czech UI strings for the shared header script
   and the enquiry form. Loads before unified-home.js. */
(function () {
  "use strict";
  // unified-home.js reads its menu labels from this dictionary.
  window.I18N_DICT = window.I18N_DICT || {};
  window.I18N_DICT.cs = Object.assign(window.I18N_DICT.cs || {}, {
    "Open menu": "Otevřít menu",
    "Close menu": "Zavřít menu"
  });


  /* ---------- Fabrica details ---------- */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js-enabled");

  // Text roll: the label twice, the second slides in on hover. Czech-only page,
  // so duplicating text here cannot clash with the translation layer.
  document.querySelectorAll("[data-roll]").forEach(function (el) {
    var text = el.textContent;
    el.textContent = "";
    var inner = document.createElement("span");
    inner.className = "roll__in";
    var a = document.createElement("span"); a.textContent = text;
    var b = document.createElement("span"); b.textContent = text; b.setAttribute("aria-hidden", "true");
    inner.appendChild(a); inner.appendChild(b); el.appendChild(inner);
  });

  // Wordmark letters rise one after another on load.
  var word = document.querySelector(".ag-hero__word");
  if (word) {
    var letters = word.textContent;
    word.textContent = "";
    Array.prototype.forEach.call(letters, function (ch, i) {
      var span = document.createElement("span");
      span.textContent = ch;
      span.style.setProperty("--i", String(i));
      word.appendChild(span);
    });
  }

  // Reveal on entering the viewport, with a short cascade inside lists.
  var targets = document.querySelectorAll("[data-ag-reveal]");
  document.querySelectorAll(".ag-rows, .ag-reasons, .ag-more").forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll("[data-ag-reveal]"), function (el, i) {
      el.style.setProperty("--d", String(i));
    });
  });
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }


  // Hero film: one real website at a time, slow crossfade (like Fabrica's video).
  var frames = document.querySelectorAll(".ag-reel img");
  if (frames.length) {
    var current = 0;
    frames[0].classList.add("is-on");
    if (!reduced && frames.length > 1) {
      setInterval(function () {
        if (document.hidden) return;
        frames[current].classList.remove("is-on");
        current = (current + 1) % frames.length;
        frames[current].classList.add("is-on");
      }, 5200);
    }
  }

  // Hero depth: the reel drifts slower than the page, the wordmark lifts away.
  var hero = document.getElementById("home");
  var reel = document.querySelector(".ag-reel");
  var mark = document.querySelector(".ag-hero__mark");
  if (hero && reel && mark && !reduced) {
    var ticking = false;
    var paint = function () {
      var y = Math.min(window.scrollY, hero.offsetHeight);
      reel.style.transform = "translate3d(0," + (y * 0.3).toFixed(1) + "px,0)";
      mark.style.transform = "translate3d(0," + (y * -0.12).toFixed(1) + "px,0)";
      mark.style.opacity = String(Math.max(0, 1 - y / (hero.offsetHeight * 0.7)));
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
  }

  var form = document.getElementById("agencyForm");
  var status = document.getElementById("agencyStatus");
  if (!form || !status) return;
  var startedAt = Date.now();
  var busy = false;

  form.querySelectorAll(".ag-choice").forEach(function (button) {
    button.addEventListener("click", function () {
      var on = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(on));
    });
  });

  function say(text, kind) {
    status.textContent = text;
    status.className = "ag-form__status" + (kind ? " is-" + kind : "");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy) return;
    var data = new FormData(form);
    var email = String(data.get("email") || "").trim();
    var message = String(data.get("message") || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      say("Zadejte prosím platnou e-mailovou adresu.", "error");
      form.elements.email.focus();
      return;
    }
    if (message.length < 10) {
      say("Napište prosím alespoň krátký popis, stačí pár slov.", "error");
      form.elements.message.focus();
      return;
    }
    if (!window.AtmosferiInquiry) {
      say("Odeslání se nezdařilo. Napište prosím na info@atmosferi.com.", "error");
      return;
    }
    var needs = Array.from(form.querySelectorAll('.ag-choice[aria-pressed="true"]'))
      .map(function (b) { return b.getAttribute("data-value"); });
    var agency = String(data.get("agency") || "").trim();
    var submit = form.querySelector('[type="submit"]');
    busy = true;
    submit.disabled = true;
    say("Odesílám…");
    try {
      await window.AtmosferiInquiry.send({
        // Existing allowed source; the page is identified in details.
        source: "websites-contact",
        mode: "web",
        name: String(data.get("name") || "").trim(),
        email: email,
        message: (agency ? "Agentura: " + agency + "\n" : "") +
          (needs.length ? "Zájem: " + needs.join(", ") + "\n\n" : "") + message,
        project_type: needs.join(", ").slice(0, 100),
        website: String(data.get("website") || ""),
        started_at: startedAt,
        details: { page: "for-agencies", agency: agency, needs: needs, language: "cs" }
      });
      say("Děkuji, zpráva odešla. Ozvu se vám do dvou pracovních dnů.", "ok");
      form.reset();
      form.querySelectorAll(".ag-choice").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      startedAt = Date.now();
    } catch (error) {
      say(error.kind === "invalid"
        ? "Zkontrolujte prosím e-mail a zprávu."
        : error.kind === "saved"
          ? "Zpráva se uložila, ale upozornění neodešlo. Napište prosím i na info@atmosferi.com."
          : "Odeslání se nezdařilo. Napište prosím na info@atmosferi.com.", "error");
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
})();
