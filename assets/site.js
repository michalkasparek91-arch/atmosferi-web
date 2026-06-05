/* ============================================================
   ATMOSFERI° — shared site behaviour
   Multi-page (non-SPA). Keeps the global "Color" mode in sync
   across page loads via localStorage. Mobile menu. Contact form.
   ============================================================ */
(function () {
  'use strict';

  var STORE_KEY = 'atmosferi:colorOn';

  /* ---- Global color mode (grayscale ↔ color) ---------------------- */
  function applyColor(on) {
    document.body.classList.toggle('color-on', on);
    document.querySelectorAll('.toggle').forEach(function (t) {
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function initColor() {
    var on = false;
    try { on = localStorage.getItem(STORE_KEY) === '1'; } catch (e) {}
    applyColor(on);

    document.querySelectorAll('.toggle').forEach(function (t) {
      t.addEventListener('click', function () {
        var now = document.body.classList.contains('color-on');
        var next = !now;
        applyColor(next);
        try { localStorage.setItem(STORE_KEY, next ? '1' : '0'); } catch (e) {}
      });
    });
  }

  /* ---- Mobile menu ----------------------------------------------- */
  function initMenu() {
    var burger = document.querySelector('.nav__burger');
    if (!burger) return;
    burger.addEventListener('click', function () {
      document.body.classList.toggle('menu-open');
      var open = document.body.classList.contains('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // close menu when a link is tapped
    document.querySelectorAll('.nav__mobile .navlink').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open');
      });
    });
  }

  /* ---- Choice chips (project type / budget) ----------------------- */
  function initChoices() {
    document.querySelectorAll('[data-choice-group]').forEach(function (group) {
      var hidden = group.parentNode.querySelector('input[type="hidden"]');
      group.querySelectorAll('.choice').forEach(function (chip) {
        chip.addEventListener('click', function () {
          group.querySelectorAll('.choice').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
          chip.setAttribute('aria-pressed', 'true');
          if (hidden) hidden.value = chip.textContent.trim();
        });
      });
    });
  }

  /* ---- Contact form (faked submit) -------------------------------- */
  function initForm() {
    var form = document.querySelector('#contact-form');
    if (!form) return;
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[name="email"]');
      if (email && !email.value) {
        if (status) status.textContent = '— An email is required.';
        email.focus();
        return;
      }
      form.querySelectorAll('input, textarea, select, button, .choice').forEach(function (el) {
        if (el.tagName === 'BUTTON' || el.classList.contains('choice')) { el.disabled = true; el.style.pointerEvents = 'none'; }
      });
      if (status) status.textContent = '— Received. The studio replies within two working days.';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initColor();
    initMenu();
    initChoices();
    initForm();
  });
})();
