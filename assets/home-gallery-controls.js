/* Homepage gallery follows the admin (Vizualizace): hidden images are removed
   and the order matches. Same public table and keys as
   demos/atmosferi-viz/portfolio-feed.js ("static:img/…"). If the request
   fails, the static gallery simply stays as it is. */
(function () {
  "use strict";
  var grid = document.getElementById("visualGallery");
  if (!grid || !window.fetch) return;
  var root = "https://paryiowezqlnffanxtnt.supabase.co";
  var key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnlpb3dlenFsbmZmYW54dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3MzYsImV4cCI6MjA5NjQwOTczNn0.yyd-pRRXds1o8lU9mVWk21zu-5l_dcdxiBjDSKfKw5o";
  var prefix = "demos/atmosferi-viz/";

  function imageKey(el) {
    var full = el.getAttribute("data-full") || "";
    return "static:" + (full.indexOf(prefix) === 0 ? full.slice(prefix.length) : full);
  }

  async function load() {
    var controls = [];
    for (var offset = 0; ; offset += 1000) {
      var response = await fetch(root + "/rest/v1/visualization_gallery_controls?select=image_key,hidden,sort_order&order=image_key&limit=1000&offset=" + offset, {
        headers: { apikey: key, Authorization: "Bearer " + key },
        cache: "no-store",
        signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var page = await response.json();
      if (!Array.isArray(page)) throw new Error("Invalid response");
      controls = controls.concat(page);
      if (page.length < 1000) break;
    }
    if (!controls.length) return;
    var byKey = new Map(controls.map(function (c) { return [c.image_key, c]; }));
    Array.from(grid.querySelectorAll(".un-viz-item")).map(function (el, i) {
      var control = byKey.get(imageKey(el));
      return { el: el, index: i, hidden: !!(control && control.hidden), order: control ? control.sort_order : i };
    }).sort(function (a, b) {
      return a.order - b.order || a.index - b.index;
    }).forEach(function (item) {
      if (item.hidden) item.el.remove();
      else grid.appendChild(item.el);
    });
  }

  load().catch(function (error) {
    console.warn("Gallery settings unavailable; showing the full gallery.", error.message);
  });
})();
