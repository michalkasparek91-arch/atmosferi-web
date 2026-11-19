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
