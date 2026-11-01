/* ==========================================================================
   ATMOSFERI — site.js
   Colour toggle (persisted), mobile menu, choice groups, contact form.
   All behaviour is progressive: the site is fully readable without JS.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'atmos-color';

  /* ---- Colour toggle ------------------------------------------------ */
  function readColor() {
    try { return localStorage.getItem(STORE_KEY) === 'on'; } catch (e) { return false; }
  }
  function writeColor(on) {
    try { localStorage.setItem(STORE_KEY, on ? 'on' : 'off'); } catch (e) {}
  }
  function applyColor(on) {
    document.body.classList.toggle('color-on', on);
    var toggles = document.querySelectorAll('.toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function initColor() {
    // index-print forces colour on via the .color-on body class — respect it.
    var forced = document.body.classList.contains('color-on');
    var on = forced || readColor();
    applyColor(on);

    var toggles = document.querySelectorAll('.toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function () {
        var next = !document.body.classList.contains('color-on');
        applyColor(next);
        writeColor(next);
      });
    }
  }

  /* ---- Mobile menu -------------------------------------------------- */
  function initMenu() {
    var nav = document.querySelector('.nav');
    var burger = document.querySelector('.nav__burger');
    if (!nav || !burger) return;

    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
    });

    // Close the menu when a link inside the mobile drawer is followed.
    var mobile = nav.querySelector('.nav__mobile');
    if (mobile) {
      mobile.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          nav.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ---- Single-select choice groups (contact) ------------------------ */
  function initChoices() {
    var groups = document.querySelectorAll('[data-choice-group]');
    for (var g = 0; g < groups.length; g++) {
      (function (group) {
        var name = group.getAttribute('data-choice-group');
        var hidden = document.querySelector('input[type="hidden"][name="' +
          (name === 'project-type' ? 'project_type' : name) + '"]');
        group.addEventListener('click', function (e) {
          var btn = e.target.closest('.choice');
          if (!btn) return;
          var buttons = group.querySelectorAll('.choice');
          var alreadyOn = btn.getAttribute('aria-pressed') === 'true';
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute('aria-pressed', 'false');
          }
          if (!alreadyOn) {
            btn.setAttribute('aria-pressed', 'true');
            if (hidden) hidden.value = btn.textContent.trim();
          } else if (hidden) {
            hidden.value = '';
          }
        });
      })(groups[g]);
    }
  }

  /* ---- Contact form: real server submission ------------------------ */
  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var status = form.querySelector('.form-status');
    var email = form.querySelector('#c-email');
    var submit = form.querySelector('[type="submit"]');
    var originalLabel = submit ? submit.innerHTML : '';
    var startedAt = Date.now();
    var busy = false;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (busy) return;
      var address = (email && email.value || '').trim();
      var msg = (form.querySelector('#c-message').value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || msg.length < 10) {
        status.textContent = AtmosferiInquiry.t('invalid');
        status.className = 'form-status is-error';
        (!address ? email : form.querySelector('#c-message')).focus();
        return;
      }
      busy = true;
      if (submit) { submit.disabled = true; submit.textContent = AtmosferiInquiry.t('sending'); }
      if (status) status.textContent = '';
      var payload = {
        source: 'websites-contact', name: form.querySelector('#c-name').value.trim(),
        email: address, message: msg, project_type: form.querySelector('[name="project_type"]').value,
        budget: form.querySelector('[name="budget"]').value, website: form.querySelector('[name="website"]').value,
        started_at: startedAt,
        details: { language: document.documentElement.lang || 'en', page: location.pathname }
      };
      try {
        await AtmosferiInquiry.send(payload);
        status.textContent = AtmosferiInquiry.t('success');
        status.className = 'form-status is-ok';
        form.reset();
        form.querySelectorAll('.choice[aria-pressed="true"]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        form.querySelectorAll('input[type="hidden"]').forEach(function (input) { input.value = ''; });
        startedAt = Date.now();
      } catch (err) {
        status.textContent = AtmosferiInquiry.t(err.kind || 'error');
        status.className = 'form-status is-error';
      } finally {
        busy = false;
        if (submit) { submit.disabled = false; submit.innerHTML = originalLabel; }
      }
    });
  }

  /* ---- Site switcher (sliding knob) --------------------------------- */
  function initSwitcher() {
    function place(sw, seg) {
      var k = sw.querySelector('.swx__knob');
      if (!k || !seg) return;
      k.style.left = seg.offsetLeft + 'px';
      k.style.width = seg.offsetWidth + 'px';
    }
    function rest(sw) { place(sw, sw.querySelector('.swx__seg.is-on')); }
    var sws = document.querySelectorAll('.swx');
    for (var i = 0; i < sws.length; i++) {
      (function (sw) {
        rest(sw);
        var segs = sw.querySelectorAll('.swx__seg');
        for (var j = 0; j < segs.length; j++) {
          segs[j].addEventListener('mouseenter', (function (s) { return function () { place(sw, s); }; })(segs[j]));
        }
        sw.addEventListener('mouseleave', function () { rest(sw); });
      })(sws[i]);
    }
    window.addEventListener('resize', function () { for (var k = 0; k < sws.length; k++) rest(sws[k]); });
    window.addEventListener('load', function () { for (var k = 0; k < sws.length; k++) rest(sws[k]); });
  }

  /* ---- Boot --------------------------------------------------------- */
  function boot() {
    initColor();
    initMenu();
    initChoices();
    initForm();
    initSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
