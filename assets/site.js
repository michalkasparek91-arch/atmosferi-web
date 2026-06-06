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

  /* ---- Contact form (client-side only) ------------------------------ */
  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var status = form.querySelector('.form-status');
    var email = form.querySelector('#c-email');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = (email && email.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      if (!ok) {
        if (status) {
          status.textContent = '— A valid email is required to reply.';
          status.className = 'form-status is-error';
        }
        if (email) email.focus();
        return;
      }

      if (status) {
        status.textContent = '— Received. The studio replies within 2 working days.';
        status.className = 'form-status is-ok';
      }
      form.reset();
      var pressed = form.querySelectorAll('.choice[aria-pressed="true"]');
      for (var i = 0; i < pressed.length; i++) pressed[i].setAttribute('aria-pressed', 'false');
      var hiddens = form.querySelectorAll('input[type="hidden"]');
      for (var j = 0; j < hiddens.length; j++) hiddens[j].value = '';
    });
  }

  /* ---- Boot --------------------------------------------------------- */
  function boot() {
    initColor();
    initMenu();
    initChoices();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
