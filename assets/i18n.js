/* ===========================================================================
   ATMOSFERI — i18n.js
   Lightweight, no-build translation layer. Walks text nodes + a few
   attributes, swaps EN → DE/CS from a shared dictionary (i18n-dict.js),
   persists the choice, updates <html lang>, and re-translates dynamically
   added content (pricing composer, forms) via a MutationObserver.
   English is the source of truth; missing strings simply stay English.
   =========================================================================== */
(function () {
  "use strict";
  var LANGS = ["en", "de", "cs"];
  var KEY = "atmosferi-lang";
  var DICT = window.I18N_DICT || { de: {}, cs: {} };
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  var items = [];
  var current = "en";

  function norm(s) { return s.replace(/\s+/g, " ").trim(); }
  function isTranslatable(k) { return k && !/^[\d\s\W]+$/.test(k); }

  function collect(root) {
    (function walk(node) {
      if (node.nodeType === 3) {
        var k = norm(node.nodeValue);
        if (isTranslatable(k)) items.push({ t: "text", node: node, orig: node.nodeValue, norm: k });
        return;
      }
      if (node.nodeType !== 1) return;
      if (SKIP[node.tagName] || node.hasAttribute("data-no-i18n")) return;
      ["placeholder", "aria-label", "title"].forEach(function (a) {
        if (node.hasAttribute(a)) {
          var v = node.getAttribute(a);
          if (norm(v)) items.push({ t: "attr", node: node, attr: a, orig: v, norm: norm(v) });
        }
      });
      for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
    })(root);
  }

  function apply(it, lang) {
    var tr = lang === "en" ? undefined : (DICT[lang] && DICT[lang][it.norm]);
    if (it.t === "text") {
      if (tr === undefined) { it.node.nodeValue = it.orig; return; }
      var lead = (it.orig.match(/^\s*/) || [""])[0];
      var trail = (it.orig.match(/\s*$/) || [""])[0];
      it.node.nodeValue = lead + tr + trail;
    } else {
      it.node.setAttribute(it.attr, tr === undefined ? it.orig : tr);
    }
  }

  function applyAll(lang) {
    for (var i = 0; i < items.length; i++) apply(items[i], lang);
    document.documentElement.setAttribute("lang", lang);
  }

  /* ---- language switcher UI (globe dropdown) ---- */
  function injectStyle() {
    if (document.getElementById("i18nsw-style")) return;
    var s = document.createElement("style");
    s.id = "i18nsw-style";
    s.textContent =
      ".i18nsw{position:relative;display:inline-flex;align-items:center;margin-left:18px;flex:none;color:var(--ink,#16140f);}" +
      ".i18nsw__btn{display:inline-flex;align-items:center;gap:7px;font-family:var(--font-mono,ui-monospace,monospace);font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:currentColor;opacity:.72;background:none;border:0;padding:6px 4px;cursor:pointer;line-height:1;transition:opacity .25s;}" +
      ".i18nsw__btn:hover{opacity:1;}" +
      ".i18nsw__btn svg{width:15px;height:15px;display:block;}" +
      ".i18nsw__btn .chev{width:9px;height:9px;transition:transform .3s;}" +
      ".i18nsw.open .i18nsw__btn .chev{transform:rotate(180deg);}" +
      ".i18nsw__menu{position:absolute;top:calc(100% + 9px);right:0;min-width:120px;background:var(--canvas,#f4f2ec);border:1px solid var(--line,rgba(22,20,15,.14));box-shadow:0 16px 42px rgba(11,10,8,.15);padding:5px;display:flex;flex-direction:column;gap:1px;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .25s,transform .25s,visibility .25s;z-index:90;}" +
      ".i18nsw.open .i18nsw__menu{opacity:1;visibility:visible;transform:none;}" +
      ".i18nsw__menu button{display:flex;align-items:center;justify-content:space-between;gap:16px;font-family:var(--font-mono,ui-monospace,monospace);font-size:10px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--ink,#16140f);opacity:.58;background:none;border:0;padding:9px 11px;cursor:pointer;text-align:left;transition:opacity .2s,background .2s;}" +
      ".i18nsw__menu button:hover{opacity:1;background:var(--canvas-2,rgba(0,0,0,.045));}" +
      ".i18nsw__menu button.on{opacity:1;}" +
      ".i18nsw__menu button.on::after{content:'';width:5px;height:5px;border-radius:50%;background:var(--accent,#a85d3c);flex:none;}" +
      "@media(max-width:720px){.i18nsw{margin-left:10px;}}";
    document.head.appendChild(s);
  }
  var I18N_LABELS = { en: "EN", de: "DE", cs: "CZ" };
  var I18N_FULL = { en: "English", de: "Deutsch", cs: "\u010ce\u0161tina" };
  function makeSwitcher() {
    var el = document.createElement("div");
    el.className = "i18nsw";
    el.setAttribute("data-no-i18n", "");
    el.setAttribute("aria-label", "Language");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "i18nsw__btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/></svg><span class="lbl">' + (I18N_LABELS[current] || "EN") + '</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    el.appendChild(btn);
    var menu = document.createElement("div");
    menu.className = "i18nsw__menu";
    LANGS.forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-lang", l);
      b.textContent = I18N_FULL[l] || l.toUpperCase();
      menu.appendChild(b);
    });
    el.appendChild(menu);
    return el;
  }
  function injectSwitchers() {
    injectStyle();
    var anchors = document.querySelectorAll(".swx");
    if (anchors.length) {
      anchors.forEach(function (swx) { swx.parentNode.insertBefore(makeSwitcher(), swx); });
    } else {
      var host = document.querySelector("header .nav__in, header nav, header");
      if (host) host.appendChild(makeSwitcher());
    }
  }
  function updateSwitchers() {
    document.querySelectorAll(".i18nsw").forEach(function (sw) {
      var lbl = sw.querySelector(".i18nsw__btn .lbl");
      if (lbl) lbl.textContent = I18N_LABELS[current] || current.toUpperCase();
      sw.querySelectorAll(".i18nsw__menu button").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-lang") === current);
      });
    });
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) < 0) lang = "en";
    current = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyAll(lang);
    updateSwitchers();
  }
  window.atmosferiSetLang = setLang;

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest && e.target.closest(".i18nsw__btn");
    if (trigger) {
      e.preventDefault();
      var sw = trigger.closest(".i18nsw");
      var willOpen = !sw.classList.contains("open");
      document.querySelectorAll(".i18nsw.open").forEach(function (o) { o.classList.remove("open"); });
      if (willOpen) sw.classList.add("open");
      trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
      return;
    }
    var b = e.target.closest && e.target.closest(".i18nsw__menu button");
    if (b) {
      e.preventDefault();
      setLang(b.getAttribute("data-lang"));
    }
    document.querySelectorAll(".i18nsw.open").forEach(function (o) {
      o.classList.remove("open");
      var t = o.querySelector(".i18nsw__btn"); if (t) t.setAttribute("aria-expanded", "false");
    });
  });

  /* ---- boot ---- */
  function boot() {
    collect(document.body);
    injectSwitchers();
    var saved = "en";
    try { saved = localStorage.getItem(KEY) || "en"; } catch (e) {}
    // URL ?lang= / #lang= overrides stored choice (for language-specific shared links)
    var urlLang = null;
    try {
      var qs = new URLSearchParams(window.location.search);
      urlLang = qs.get("lang");
      if (!urlLang && /^#(en|de|cs)$/.test(window.location.hash)) urlLang = window.location.hash.slice(1);
    } catch (e) {}
    if (urlLang && LANGS.indexOf(urlLang) >= 0) saved = urlLang;
    setLang(saved);

    var mo = new MutationObserver(function (muts) {
      var start = items.length;
      muts.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var nd = m.addedNodes[i];
          if (nd.nodeType === 3) {
            var k = norm(nd.nodeValue);
            if (isTranslatable(k)) items.push({ t: "text", node: nd, orig: nd.nodeValue, norm: k });
          } else if (nd.nodeType === 1 && !nd.hasAttribute("data-no-i18n") && !SKIP[nd.tagName]) {
            collect(nd);
          }
        }
      });
      if (current !== "en") for (var j = start; j < items.length; j++) apply(items[j], current);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
