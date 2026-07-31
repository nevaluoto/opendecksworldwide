(function () {
  var canvas = document.getElementById("globe-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var size = canvas.clientWidth || 630;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  var R = size / 2 - 6;
  var cx = size / 2;
  var cy = size / 2;
  // Orthographic projection of a lat/lon point onto the screen — a straight-on
  // front view (no axial tilt), spinning live around the vertical axis.
  function toScreen(latDeg, lonDeg, rotY) {
    var lat = (latDeg * Math.PI) / 180;
    var lon = (lonDeg * Math.PI) / 180 + rotY;
    var x0 = Math.cos(lat) * Math.sin(lon);
    var y0 = Math.sin(lat);
    var z0 = Math.cos(lat) * Math.cos(lon);
    return { x: cx + x0 * R, y: cy - y0 * R, z: z0 };
  }

  var dots = (window.__globeDots || []).filter(function (d) {
    return typeof d.lat === "number" && typeof d.lon === "number";
  });

  // The dark palette's near-white/pale colors read fine against the near-black
  // dark background, but disappear against the light theme's near-white page
  // background — so light mode gets its own darker, saturated set of hues.
  var PALETTES = {
    dark: {
      outer: "139, 92, 246",
      meridian: "139, 92, 246",
      latitude: "34, 211, 238",
      border: "226, 232, 255",
      dot: "232, 121, 249",
    },
    light: {
      outer: "109, 40, 217",
      meridian: "109, 40, 217",
      latitude: "8, 116, 130",
      border: "30, 41, 59",
      dot: "163, 15, 129",
    },
  };
  function palette() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? PALETTES.light
      : PALETTES.dark;
  }

  // Real country borders (Natural Earth, via /borders.json, built from the
  // world-atlas package at build time) — loaded async, drawn once available.
  var borders = [];
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  fetch("/borders.json")
    .then(function (r) { return r.json(); })
    .then(function (loops) {
      borders = loops;
      frame(); // repaint immediately rather than waiting for the next rAF tick
    })
    .catch(function () {});

  function drawGraticule(rotY, pal) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(" + pal.outer + ", 0.5)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    for (var m = 0; m < 12; m++) {
      var lon0 = m * 30;
      ctx.beginPath();
      for (var lat = -90; lat <= 90; lat += 6) {
        var p = toScreen(lat, lon0, rotY);
        if (lat === -90) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      var midZ = toScreen(0, lon0, rotY).z;
      ctx.strokeStyle = "rgba(" + pal.meridian + ", " + (0.1 + Math.max(0, midZ) * 0.3) + ")";
      ctx.stroke();
    }

    for (var latD = -60; latD <= 60; latD += 30) {
      ctx.beginPath();
      for (var lon = 0; lon <= 360; lon += 6) {
        var p2 = toScreen(latD, lon, rotY);
        if (lon === 0) ctx.moveTo(p2.x, p2.y);
        else ctx.lineTo(p2.x, p2.y);
      }
      ctx.strokeStyle = "rgba(" + pal.latitude + ", 0.22)";
      ctx.stroke();
    }
  }

  function drawBorders(rotY, pal) {
    ctx.lineWidth = 0.75;
    borders.forEach(function (loop) {
      var pts = loop.map(function (pt) { return toScreen(pt[0], pt[1], rotY); });
      var maxZ = -Infinity;
      for (var i = 0; i < pts.length; i++) if (pts[i].z > maxZ) maxZ = pts[i].z;
      if (maxZ < -0.08) return; // whole loop is on the far side — skip it

      ctx.beginPath();
      pts.forEach(function (p, i) {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = "rgba(" + pal.border + ", " + (0.3 + Math.max(0, maxZ) * 0.55) + ")";
      ctx.stroke();
    });
  }

  function drawDots(rotY, pal) {
    dots.forEach(function (d) {
      var p = toScreen(d.lat, d.lon, rotY);
      if (p.z < -0.15) return;
      var alpha = 0.35 + Math.max(0, p.z) * 0.65;
      var radius = 2.1 + Math.max(0, p.z) * 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + pal.dot + ", " + alpha + ")";
      ctx.shadowColor = "rgba(" + pal.dot + ", 0.9)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  var rotY = 0;
  function frame() {
    var pal = palette();
    ctx.clearRect(0, 0, size, size);
    drawGraticule(rotY, pal);
    drawBorders(rotY, pal);
    drawDots(rotY, pal);
    rotY += 0.0025;
  }

  // Paint immediately so something is visible even if requestAnimationFrame
  // never fires (e.g. a backgrounded/hidden tab at load).
  frame();

  // Repaint on theme toggle rather than waiting for the next animation tick —
  // theme.js's own click listener (registered earlier in base.njk) flips the
  // data-theme attribute first, so it's already updated by the time this runs.
  var themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) themeToggle.addEventListener("click", frame);

  if (reduceMotion) {
    return;
  }

  var lastTime = 0;
  function loop(t) {
    if (!lastTime || t - lastTime > 40) {
      frame();
      lastTime = t;
    }
    if (!document.hidden) requestAnimationFrame(loop);
    else setTimeout(function () { requestAnimationFrame(loop); }, 500);
  }
  requestAnimationFrame(loop);
})();
