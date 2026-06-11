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

  /* ---- language switcher UI ---- */
  function injectStyle() {
    if (document.getElementById("i18nsw-style")) return;
    var s = document.createElement("style");
    s.id = "i18nsw-style";
    s.textContent =
      ".i18nsw{display:inline-flex;align-items:center;gap:1px;margin-left:18px;flex:none;color:var(--ink,#16140f);}" +
      ".i18nsw button{font-family:var(--font-mono,ui-monospace,monospace);font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:currentColor;opacity:.42;background:none;border:0;padding:5px 5px;cursor:pointer;transition:opacity .25s;line-height:1;}" +
      ".i18nsw button:hover{opacity:.85;}" +
      ".i18nsw button.on{opacity:1;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px;}" +
      ".i18nsw__sep{opacity:.3;font-size:9px;}" +
      "@media(max-width:720px){.i18nsw{margin-left:12px;}.i18nsw button{font-size:9px;padding:5px 4px;letter-spacing:.1em;}}";
    document.head.appendChild(s);
  }
  function makeSwitcher() {
    var el = document.createElement("div");
    el.className = "i18nsw";
    el.setAttribute("data-no-i18n", "");
    el.setAttribute("aria-label", "Language");
    var labels = { en: "EN", de: "DE", cs: "CZ" };
    LANGS.forEach(function (l, i) {
      if (i) { var sep = document.createElement("span"); sep.className = "i18nsw__sep"; sep.textContent = "·"; el.appendChild(sep); }
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-lang", l);
      b.textContent = labels[l];
      el.appendChild(b);
    });
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
    document.querySelectorAll(".i18nsw button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-lang") === current);
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
    var b = e.target.closest && e.target.closest(".i18nsw button");
    if (!b) return;
    e.preventDefault();
    setLang(b.getAttribute("data-lang"));
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
