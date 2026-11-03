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
    el.dataset.galleryKey = "cms:" + image.full;
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
    var controls = [];
    for (var position = 0; ; position += 1000) {
      var settingsResponse = await fetch(root + "/rest/v1/visualization_gallery_controls?select=image_key,hidden,sort_order&order=image_key&limit=1000&offset=" + position,
        { headers: { apikey: key, Authorization: "Bearer " + key }, cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!settingsResponse.ok) throw new Error("Gallery settings HTTP " + settingsResponse.status);
      var settingsPage = await settingsResponse.json();
      if (!Array.isArray(settingsPage)) throw new Error("Invalid gallery settings");
      controls = controls.concat(settingsPage);
      if (settingsPage.length < 1000) break;
    }
    var projects = [];
    try {
    for (var offset = 0; ; offset += 100) {
      var url = root + "/rest/v1/visualization_projects?select=id,title,location,project_year,category,description,credits,images&published=eq.true&order=created_at.desc,id.desc&limit=100&offset=" + offset;
      var response = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Portfolio HTTP " + response.status);
      var page = await response.json();
      if (!Array.isArray(page)) throw new Error("Invalid portfolio response");
      projects = projects.concat(page);
      if (page.length < 100) break;
    }
    } catch (error) { console.warn("Uploaded projects unavailable", error.message); }
    var covers = document.createDocumentFragment();
    projects.forEach(function (project) {
      if (!/^[a-f0-9-]{36}$/.test(project.id) || !Array.isArray(project.images)) return;
      var images = project.images.filter(function (image) {
        return safePath(image.full, project.id) && safePath(image.thumb, project.id)
          && image.width > 0 && image.height > 0;
      });
      images.forEach(function (image, i) {
        covers.appendChild(figure(project, image, true));
      });
    });
    grid.insertBefore(covers, grid.firstChild);
    var byKey = new Map(controls.map(function (control) { return [control.image_key, control]; }));
    var ordered = Array.from(grid.querySelectorAll(".portfolio-item")).map(function (el, i) {
      var imageKey = el.dataset.galleryKey || "static:" + el.getAttribute("data-full");
      var control = byKey.get(imageKey);
      return { el: el, index: i, hidden: control && control.hidden, order: control ? control.sort_order : i };
    }).sort(function (a, b) { return a.order - b.order || a.index - b.index; });
    ordered.forEach(function (item) {
      // Remove hidden images from both the grid and the lightbox's source list.
      if (item.hidden) item.el.remove();
      else grid.appendChild(item.el);
    });
    var toggle = document.getElementById("portfolioToggle");
    if (toggle) toggle.hidden = grid.querySelectorAll(".portfolio-item").length <= 12;
    window.dispatchEvent(new CustomEvent("atmosferi:portfolio-updated"));
  }
  load().catch(function (err) { console.warn("Published portfolio unavailable; existing work remains visible.", err.message); });
})();
