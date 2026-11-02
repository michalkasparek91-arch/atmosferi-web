/* Published CMS projects join the existing static portfolio. Drafts stay out. */
(function () {
  "use strict";
  var root = "https://paryiowezqlnffanxtnt.supabase.co";
  var key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnlpb3dlenFsbmZmYW54dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3MzYsImV4cCI6MjA5NjQwOTczNn0.yyd-pRRXds1o8lU9mVWk21zu-5l_dcdxiBjDSKfKw5o";
  var storage = root + "/storage/v1/object/public/visualization-portfolio/";
  var grid = document.getElementById("grid");
  if (!grid) return;
  function safePath(path, id) {
    return typeof path === "string" && path.indexOf(id + "/") === 0
      && /^[a-f0-9-]+\/[a-f0-9-]+-(full|thumb)\.(webp|jpg)$/.test(path);
  }
  function figure(project, image, cover) {
    var el = document.createElement("figure");
    el.className = cover ? "frame portfolio-item bloom lit" : "frame";
    el.dataset.full = storage + image.full;
    el.dataset.cap = image.caption || project.title;
    el.dataset.meta = [project.location, project.category, project.project_year].filter(Boolean).join(" · ");
    el.dataset.project = "cms-" + project.id;
    el.dataset.projectTitle = project.title;
    el.dataset.projectNote = [project.description, project.credits].filter(Boolean).join("\n");
    var frame = document.createElement("span"); frame.className = "frame__img";
    var img = document.createElement("img");
    img.src = storage + image.thumb;
    img.alt = image.alt || project.title;
    img.loading = "lazy"; img.decoding = "async";
    img.width = image.width; img.height = image.height;
    var thumbWidth = Math.max(1, Math.round(image.width * Math.min(1, 1000 / Math.max(image.width, image.height))));
    if (image.width > thumbWidth) {
      img.srcset = storage + image.thumb + " " + thumbWidth + "w, " + storage + image.full + " " + image.width + "w";
      img.sizes = "(max-width:760px) 100vw, (max-width:1100px) 50vw, 33vw";
    }
    frame.appendChild(img); el.appendChild(frame);
    var caption = document.createElement("figcaption"); caption.className = "frame__cap";
    var title = document.createElement("span"); title.className = "t"; title.textContent = project.title;
    caption.appendChild(title); el.appendChild(caption);
    return el;
  }
  async function load() {
    var projects = [];
    for (var offset = 0; ; offset += 100) {
      var url = root + "/rest/v1/visualization_projects?select=id,title,location,project_year,category,description,credits,images&published=eq.true&order=created_at.desc,id.desc&limit=100&offset=" + offset;
      var response = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Portfolio HTTP " + response.status);
      var page = await response.json();
      if (!Array.isArray(page)) throw new Error("Invalid portfolio response");
      projects = projects.concat(page);
      if (page.length < 100) break;
    }
    var covers = document.createDocumentFragment();
    var series = document.createElement("div");
    series.id = "cms-portfolio-series"; series.hidden = true; series.style.display = "none";
    projects.forEach(function (project) {
      if (!/^[a-f0-9-]{36}$/.test(project.id) || !Array.isArray(project.images)) return;
      var images = project.images.filter(function (image) {
        return safePath(image.full, project.id) && safePath(image.thumb, project.id)
          && image.width > 0 && image.height > 0;
      });
      images.forEach(function (image, i) {
        var el = figure(project, image, i === 0);
        (i === 0 ? covers : series).appendChild(el);
      });
    });
    grid.insertBefore(covers, grid.firstChild);
    grid.parentNode.appendChild(series);
    window.dispatchEvent(new CustomEvent("atmosferi:portfolio-updated"));
  }
  load().catch(function (err) { console.warn("Published portfolio unavailable; existing work remains visible.", err.message); });
})();
