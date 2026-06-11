/* ===========================================================================
   ATMOSFERI° VISUALISATION — pano.js
   A true equirectangular, multi-room 360° virtual tour (three.js).
   Drag to look (yaw + pitch), scroll/pinch to zoom, auto-rotate, fullscreen,
   walk room-to-room through navigation hotspots, info hotspots, compass,
   scene rail and crossfades.  Placeholder images live at img/pano-*.webp —
   replace them with real equirectangular (2:1) renders to go live.
   =========================================================================== */
(function () {
  "use strict";
  var tour = document.getElementById("tour");
  if (!tour) return;
  var canvas = document.getElementById("tourCanvas");
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ----- tour data: 4 linked rooms of a mountain house ----- */
  var NODES = {
    living: {
      name: "Living room", img: "img/pano-living.webp", start: 0,
      hotspots: [
        { type: "nav", to: "dining",  yaw: 52,  pitch: -6, label: "To dining" },
        { type: "nav", to: "bedroom", yaw: 205, pitch: -7, label: "To bedroom" },
        { type: "info", yaw: -64, pitch: 4, label: "The glazing", title: "Floor-to-ceiling glass",
          text: "A single 6-metre pane frames the valley — the room's only ornament is the weather outside." }
      ]
    },
    dining: {
      name: "Dining", img: "img/pano-dining.webp", start: 200,
      hotspots: [
        { type: "nav", to: "living",  yaw: 232, pitch: -6, label: "To living room" },
        { type: "nav", to: "bedroom", yaw: 96,  pitch: -7, label: "To bedroom" },
        { type: "info", yaw: 8, pitch: 2, label: "The table", title: "Oak, in situ",
          text: "A four-metre oak table built on site from a single felled trunk — the house designed around it." }
      ]
    },
    bedroom: {
      name: "Bedroom", img: "img/pano-bedroom.webp", start: 20,
      hotspots: [
        { type: "nav", to: "living", yaw: 12,  pitch: -6, label: "To living room" },
        { type: "nav", to: "bath",   yaw: 158, pitch: -7, label: "To bathroom" },
        { type: "info", yaw: -90, pitch: 6, label: "Morning light", title: "Due-east aspect",
          text: "The bed faces the sunrise — the first room in the house to catch the light over the ridge." }
      ]
    },
    bath: {
      name: "Bathroom", img: "img/pano-bath.webp", start: 180,
      hotspots: [
        { type: "nav", to: "bedroom", yaw: 188, pitch: -6, label: "To bedroom" },
        { type: "info", yaw: 20, pitch: 0, label: "The stone", title: "Cut from the slope",
          text: "Walls and basin in the same grey stone quarried from the mountainside the house sits on." }
      ]
    }
  };
  var ORDER = ["living", "dining", "bedroom", "bath"];

  var nameEl = document.getElementById("tourName"),
      markersEl = document.getElementById("tourMarkers"),
      fadeEl = document.getElementById("tourFade"),
      loadEl = document.getElementById("tourLoad"),
      stripEl = document.getElementById("tourStrip"),
      railEl = document.getElementById("tourRail"),
      infoEl = document.getElementById("tourInfo"),
      infoT = document.getElementById("tourInfoT"),
      infoP = document.getElementById("tourInfoP"),
      autoBtn = document.getElementById("tourAuto"),
      fsBtn = document.getElementById("tourFs");

  /* ----- graceful fallback if three.js is unavailable ----- */
  if (typeof THREE === "undefined") {
    canvas.style.display = "none";
    tour.style.background = "#0b0a08 center/cover no-repeat url('" + NODES.living.img + "')";
    if (loadEl) loadEl.classList.add("gone");
    return;
  }

  /* ----- three.js scene ----- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, 1, 1, 1100);
  var geo = new THREE.SphereGeometry(500, 64, 44);
  geo.scale(-1, 1, 1);
  var mat = new THREE.MeshBasicMaterial();
  var mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  var loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  var lon = 0, lat = 0, fov = 75;
  var targetVec = new THREE.Vector3();
  var current = "living", busy = false, firstLoaded = false;
  var autoOn = !reduce, dragging = false;
  var velLon = 0, velLat = 0;
  var pointers = {}, lastDist = 0;

  function size() {
    var w = tour.clientWidth, h = tour.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loadNode(id, instant) {
    var node = NODES[id];
    if (!node) return;
    loader.load(node.img, function (tex) {
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      if (mat.map) mat.map.dispose();
      mat.map = tex; mat.needsUpdate = true;
      lon = node.start; lat = 0; fov = 75;
      camera.updateProjectionMatrix();
      current = id;
      nameEl.textContent = node.name;
      buildMarkers(node);
      buildRail();
      if (!firstLoaded) { firstLoaded = true; loadEl.classList.add("gone"); }
      if (fadeEl) fadeEl.classList.remove("on");
      busy = false;
    }, undefined, function () { busy = false; if (fadeEl) fadeEl.classList.remove("on"); });
  }

  function goTo(id) {
    if (busy || id === current) return;
    busy = true;
    hideInfo();
    if (fadeEl && !reduce) {
      fadeEl.classList.add("on");
      setTimeout(function () { loadNode(id); }, 520);
    } else { loadNode(id); }
  }

  /* ----- hotspot markers ----- */
  var marks = [];
  var NAV_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 8l5 4-5 4"/></svg>';
  var INFO_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.6" r="0.6" fill="#fff"/></svg>';
  function buildMarkers(node) {
    markersEl.innerHTML = ""; marks = [];
    node.hotspots.forEach(function (hs) {
      var el = document.createElement("div");
      el.className = "hot hot--" + hs.type;
      el.innerHTML = '<span class="hot__ring">' + (hs.type === "nav" ? NAV_SVG : INFO_SVG) + '</span>' +
                     '<span class="hot__lab">' + hs.label + '</span>';
      markersEl.appendChild(el);
      var phi = THREE.MathUtils.degToRad(90 - hs.pitch);
      var theta = THREE.MathUtils.degToRad(hs.yaw);
      var pos = new THREE.Vector3(
        490 * Math.sin(phi) * Math.cos(theta),
        490 * Math.cos(phi),
        490 * Math.sin(phi) * Math.sin(theta)
      );
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        if (hs.type === "nav") goTo(hs.to);
        else showInfo(hs);
      });
      marks.push({ el: el, pos: pos });
    });
  }

  function projectMarkers() {
    var w = tour.clientWidth, h = tour.clientHeight;
    var fwd = targetVec.clone().normalize();
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      var dot = m.pos.clone().normalize().dot(fwd);
      if (dot < 0.16) { m.el.style.display = "none"; continue; }
      var v = m.pos.clone().project(camera);
      if (v.z > 1) { m.el.style.display = "none"; continue; }
      m.el.style.display = "flex";
      m.el.style.left = (v.x * 0.5 + 0.5) * w + "px";
      m.el.style.top = (-v.y * 0.5 + 0.5) * h + "px";
      m.el.style.opacity = Math.min(1, (dot - 0.16) * 4);
    }
  }

  /* ----- info popover ----- */
  var infoTimer;
  function showInfo(hs) {
    infoT.textContent = hs.title; infoP.textContent = hs.text;
    infoEl.classList.add("show");
    clearTimeout(infoTimer);
    infoTimer = setTimeout(hideInfo, 5200);
  }
  function hideInfo() { infoEl.classList.remove("show"); }

  /* ----- scene rail ----- */
  function buildRail() {
    railEl.innerHTML = "";
    ORDER.forEach(function (id, i) {
      var n = NODES[id];
      var cell = document.createElement("div");
      cell.className = "rcell" + (id === current ? " on" : "");
      cell.innerHTML = '<img src="' + n.img + '" alt="' + n.name + '"><span class="rcell__n">' + (i + 1) + '</span>';
      cell.addEventListener("click", function () { goTo(id); });
      railEl.appendChild(cell);
    });
  }

  /* ----- compass ----- */
  var DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  (function buildStrip() {
    var html = "";
    for (var c = 0; c < 3; c++)
      for (var i = 0; i < 8; i++)
        html += '<span class="t">' + (i % 2 === 0 ? "<b>" + DIRS[i] + "</b>" : DIRS[i]) + "</span>";
    stripEl.innerHTML = html;
  })();
  function updateCompass() {
    var lonN = ((lon % 360) + 360) % 360;
    var per = 8 * 48;                      // px for one full revolution (8 ticks × 48)
    var W = stripEl.parentNode.clientWidth;
    var tx = W / 2 - per - (lonN / 360) * per;
    stripEl.style.transform = "translateX(" + tx + "px)";
  }

  /* ----- interaction ----- */
  function onDown(e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    dragging = true; tour.classList.add("grabbing", "touched");
    velLon = velLat = 0;
    try { tour.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onMove(e) {
    if (!pointers[e.pointerId]) return;
    var ids = Object.keys(pointers);
    var prev = pointers[e.pointerId];
    if (ids.length >= 2) {
      // pinch-zoom
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastDist) { fov = Math.max(45, Math.min(85, fov - (d - lastDist) * 0.12)); camera.fov = fov; camera.updateProjectionMatrix(); }
      lastDist = d;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      return;
    }
    var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var k = 0.11 * (fov / 75);
    lon -= dx * k; lat += dy * k;
    velLon = -dx * k; velLat = dy * k;
    lat = Math.max(-85, Math.min(85, lat));
  }
  function onUp(e) {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) lastDist = 0;
    if (Object.keys(pointers).length === 0) { dragging = false; tour.classList.remove("grabbing"); }
  }
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    fov = Math.max(45, Math.min(85, fov + e.deltaY * 0.04));
    camera.fov = fov; camera.updateProjectionMatrix();
  }, { passive: false });

  autoBtn.addEventListener("click", function () {
    autoOn = !autoOn; autoBtn.classList.toggle("on", autoOn);
  });
  autoBtn.classList.toggle("on", autoOn);

  fsBtn.addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (tour.requestFullscreen) tour.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", function () {
    tour.classList.toggle("fs", !!document.fullscreenElement);
    setTimeout(size, 60);
  });
  tour.addEventListener("click", hideInfo);

  /* ----- render loop ----- */
  function frame() {
    requestAnimationFrame(frame);
    if (!dragging) {
      if (Math.abs(velLon) > 0.01 || Math.abs(velLat) > 0.01) {
        lon += velLon; lat += velLat; velLon *= 0.93; velLat *= 0.93;
        lat = Math.max(-85, Math.min(85, lat));
      } else if (autoOn && !busy) {
        lon += 0.035;
      }
    }
    var phi = THREE.MathUtils.degToRad(90 - lat);
    var theta = THREE.MathUtils.degToRad(lon);
    targetVec.set(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(targetVec);
    renderer.render(scene, camera);
    projectMarkers();
    updateCompass();
  }

  window.addEventListener("resize", size);
  size();
  loadNode("living", true);
  frame();
})();
