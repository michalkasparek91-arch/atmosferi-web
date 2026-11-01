/* Shared enquiry transport. Confirmation only after the server accepts the message. */
(function () {
  'use strict';
  var endpoint = 'https://paryiowezqlnffanxtnt.supabase.co/functions/v1/atmosferi-submit-inquiry';
  var strings = {
    en: { sending: 'Sending…', success: 'Thank you! Your enquiry was sent. I’ll be in touch.', error: 'Could not send right now. Please email info@atmosferi.com.', invalid: 'Please enter a valid email and a short project description.', saved: 'Your message was saved, but email notification failed. Please also email info@atmosferi.com.' },
    de: { sending: 'Wird gesendet…', success: 'Vielen Dank! Ihre Anfrage wurde gesendet. Ich melde mich bei Ihnen.', error: 'Senden derzeit nicht möglich. Bitte schreiben Sie an info@atmosferi.com.', invalid: 'Bitte geben Sie eine gültige E-Mail-Adresse und eine kurze Projektbeschreibung ein.', saved: 'Ihre Anfrage wurde gespeichert, aber die E-Mail-Benachrichtigung ist fehlgeschlagen. Schreiben Sie bitte auch an info@atmosferi.com.' },
    cs: { sending: 'Odesílám…', success: 'Děkuji! Poptávka byla odeslána. Brzy se ozvu.', error: 'Odeslání se nezdařilo. Napište prosím na info@atmosferi.com.', invalid: 'Vyplňte platný e-mail a krátký popis projektu.', saved: 'Poptávka se uložila, ale e-mailové upozornění selhalo. Napište prosím také na info@atmosferi.com.' }
  };
  function language() {
    var lang = (document.documentElement.lang || 'en').toLowerCase();
    return strings[lang] ? lang : 'en';
  }
  function t(key) { return strings[language()][key] || strings.en[key]; }
  async function send(payload) {
    var response, data;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      });
      try { data = await response.json(); } catch (_) { data = {}; }
    } catch (_) {
      var network = new Error('network_error');
      network.kind = 'error';
      throw network;
    }
    if (!response.ok || !data.ok) {
      var failure = new Error(data.error || 'server_unavailable');
      failure.kind = data.saved ? 'saved' : data.error === 'invalid_email' || data.error === 'message_too_short' ? 'invalid' : 'error';
      throw failure;
    }
    return data;
  }
  window.AtmosferiInquiry = { send: send, t: t };
})();
