(() => {
  // Ink stays on this device only — never shared to a public wall.
  const STORAGE = "jorjis.guestbook.ink.v1";
  const MIN_Z = 0.35;
  const MAX_Z = 2.8;
  const MAX_STROKES = 160;
  const GRID = 56;

  const canvas = document.getElementById("page");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

  const view = {
    x: 0,
    y: 0,
    z: 1,
    strokes: [],
  };

  let dpr = 1;
  let w = 0;
  let h = 0;
  let drawing = false;
  let stroke = null;
  let raf = 0;
  let dirty = true;
  let saveTimer = 0;
  let pointers = new Map();
  let pinch = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.strokes)) view.strokes = data.strokes.slice(-MAX_STROKES);
      if (data.view) {
        view.x = data.view.x || 0;
        view.y = data.view.y || 0;
        view.z = data.view.z || 1;
      }
    } catch {
      /* ignore */
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE,
        JSON.stringify({
          view: { x: view.x, y: view.y, z: view.z },
          strokes: view.strokes.slice(-MAX_STROKES),
        })
      );
    } catch {
      /* ignore */
    }
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 220);
  }

  function clampZ(z) {
    return Math.min(MAX_Z, Math.max(MIN_Z, z));
  }

  function toWorld(sx, sy) {
    return {
      x: (sx - view.x) / view.z,
      y: (sy - view.y) / view.z,
    };
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = (w * dpr) | 0;
    canvas.height = (h * dpr) | 0;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
    requestDraw();
  }

  function requestDraw() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function drawStroke(s) {
    const pts = s.points;
    if (!pts || pts.length < 2) return;
    ctx.lineWidth = (s.width || 2.6) / view.z;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const n = pts[i + 1];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  function draw() {
    raf = 0;
    if (!dirty) return;
    dirty = false;

    ctx.fillStyle = "#fff9e6";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.z, view.z);

    const left = -view.x / view.z;
    const top = -view.y / view.z;
    const right = left + w / view.z;
    const bottom = top + h / view.z;
    const x0 = Math.floor(left / GRID) * GRID;
    const y0 = Math.floor(top / GRID) * GRID;

    ctx.strokeStyle = "rgba(60, 50, 20, 0.05)";
    ctx.lineWidth = 1 / view.z;
    ctx.beginPath();
    for (let x = x0; x <= right; x += GRID) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = y0; y <= bottom; y += GRID) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1712";
    for (const s of view.strokes) drawStroke(s);
    if (stroke) drawStroke(stroke);

    ctx.restore();
  }

  function zoomAt(sx, sy, factor) {
    const before = toWorld(sx, sy);
    view.z = clampZ(view.z * factor);
    view.x = sx - before.x * view.z;
    view.y = sy - before.y * view.z;
    dirty = true;
    requestDraw();
    queueSave();
  }

  function onPointerDown(e) {
    if (e.target.closest(".bar, .zoom")) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // two fingers = pan/zoom, never ink
    if (pointers.size === 2) {
      drawing = false;
      stroke = null;
      const [a, b] = [...pointers.values()];
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        z: view.z,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        viewX: view.x,
        viewY: view.y,
      };
      return;
    }

    if (e.button !== 0) return;
    drawing = true;
    const p = toWorld(e.clientX, e.clientY);
    stroke = { width: 2.6, points: [p, { x: p.x + 0.01, y: p.y + 0.01 }] };
    canvas.setPointerCapture(e.pointerId);
    dirty = true;
    requestDraw();
  }

  function onPointerMove(e) {
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const world = {
        x: (pinch.midX - pinch.viewX) / pinch.z,
        y: (pinch.midY - pinch.viewY) / pinch.z,
      };
      view.z = clampZ(pinch.z * (dist / pinch.dist));
      view.x = midX - world.x * view.z;
      view.y = midY - world.y * view.z;
      dirty = true;
      requestDraw();
      return;
    }

    if (!drawing || !stroke) return;
    const p = toWorld(e.clientX, e.clientY);
    const last = stroke.points[stroke.points.length - 1];
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    if (dx * dx + dy * dy < 0.6) return;
    stroke.points.push(p);
    dirty = true;
    requestDraw();
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      if (pinch) queueSave();
      pinch = null;
    }

    if (!drawing) return;
    drawing = false;
    if (stroke && stroke.points.length > 2) {
      view.strokes.push(stroke);
      if (view.strokes.length > MAX_STROKES) view.strokes.shift();
      queueSave();
    }
    stroke = null;
    dirty = true;
    requestDraw();
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onWheel(e) {
    e.preventDefault();
    // scroll always pans — never draws
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
      return;
    }
    view.x -= e.deltaX;
    view.y -= e.deltaY;
    dirty = true;
    requestDraw();
    queueSave();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  document.getElementById("zoom-in").addEventListener("click", () => {
    zoomAt(w / 2, h / 2, 1.15);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    zoomAt(w / 2, h / 2, 1 / 1.15);
  });

  addEventListener("resize", resize);

  load();
  resize();
})();
