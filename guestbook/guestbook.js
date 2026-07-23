(() => {
  const STORAGE = "jorjis.guestbook.world.v1";
  const MIN_Z = 0.25;
  const MAX_Z = 3;
  const GRID = 48;

  const stage = document.getElementById("stage");
  const canvas = document.getElementById("paper");
  const worldEl = document.getElementById("world");
  const toastEl = document.getElementById("toast");
  const playBtn = document.getElementById("play");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

  const state = {
    x: 0,
    y: 0,
    z: 1,
    strokes: [],
    notes: [],
  };

  let dpr = 1;
  let w = 0;
  let h = 0;
  let spaceDown = false;
  let panning = false;
  let drawing = false;
  let panOrigin = null;
  let viewOrigin = null;
  let currentStroke = null;
  let raf = 0;
  let needsPaint = true;
  let saveTimer = 0;
  let playIndex = -1;
  let playing = false;
  let toastTimer = 0;
  let pointers = new Map();
  let pinchStart = null;

  /* ---------- persistence ---------- */

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.strokes)) state.strokes = data.strokes;
      if (Array.isArray(data.notes)) state.notes = data.notes;
      if (data.view) {
        state.x = data.view.x || 0;
        state.y = data.view.y || 0;
        state.z = data.view.z || 1;
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
          view: { x: state.x, y: state.y, z: state.z },
          strokes: state.strokes.slice(-200),
          notes: state.notes.slice(-60),
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

  /* ---------- coords ---------- */

  function screenToWorld(sx, sy) {
    return {
      x: (sx - state.x) / state.z,
      y: (sy - state.y) / state.z,
    };
  }

  function clampZoom(z) {
    return Math.min(MAX_Z, Math.max(MIN_Z, z));
  }

  /* ---------- render ---------- */

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = (w * dpr) | 0;
    canvas.height = (h * dpr) | 0;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    needsPaint = true;
  }

  function applyWorldTransform() {
    worldEl.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.z})`;
  }

  function paint() {
    raf = 0;
    if (!needsPaint) return;
    needsPaint = false;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff9e6";
    ctx.fillRect(0, 0, w, h);

    ctx.translate(state.x, state.y);
    ctx.scale(state.z, state.z);

    // soft infinite grid
    const left = (-state.x) / state.z;
    const top = (-state.y) / state.z;
    const right = left + w / state.z;
    const bottom = top + h / state.z;
    const startX = Math.floor(left / GRID) * GRID;
    const startY = Math.floor(top / GRID) * GRID;

    ctx.strokeStyle = "rgba(60, 50, 20, 0.06)";
    ctx.lineWidth = 1 / state.z;
    ctx.beginPath();
    for (let x = startX; x <= right; x += GRID) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = startY; y <= bottom; y += GRID) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();

    // strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f1c16";

    for (const stroke of state.strokes) {
      if (!stroke.points || stroke.points.length < 2) continue;
      ctx.lineWidth = (stroke.width || 2.6) / state.z;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p = stroke.points[i];
        const n = stroke.points[i + 1];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    if (currentStroke && currentStroke.points.length) {
      ctx.lineWidth = (currentStroke.width || 2.6) / state.z;
      ctx.beginPath();
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
    applyWorldTransform();
  }

  function requestPaint() {
    needsPaint = true;
    if (!raf) raf = requestAnimationFrame(paint);
  }

  /* ---------- notes ---------- */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderNotes() {
    worldEl.innerHTML = state.notes
      .map(
        (note) => `
      <article class="note" data-id="${escapeHtml(note.id)}" style="left:${note.x}px;top:${note.y}px">
        <div class="note__head">
          <button type="button" class="note__play" data-play="${escapeHtml(note.id)}" aria-label="Play note">▶</button>
          <button type="button" class="note__x" data-del="${escapeHtml(note.id)}" aria-label="Remove">✕</button>
        </div>
        <textarea class="note__body" data-id="${escapeHtml(note.id)}" rows="3" placeholder="A line…">${escapeHtml(note.text || "")}</textarea>
      </article>`
      )
      .join("");
  }

  function createNote(worldX, worldY) {
    const note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: worldX,
      y: worldY,
      text: "",
    };
    state.notes.push(note);
    renderNotes();
    queueSave();
    const el = worldEl.querySelector(`textarea[data-id="${note.id}"]`);
    if (el) el.focus();
  }

  function focusNote(id) {
    worldEl.querySelectorAll(".note").forEach((n) => {
      n.classList.toggle("is-active", n.dataset.id === id);
    });
  }

  function panToNote(note) {
    const zx = state.z;
    state.x = w / 2 - (note.x + 140) * zx;
    state.y = h / 2 - (note.y + 60) * zx;
    requestPaint();
  }

  function speak(text, onend) {
    if (!window.speechSynthesis) {
      onend && onend();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text || "Empty note.");
    u.rate = 0.95;
    u.onend = () => onend && onend();
    u.onerror = () => onend && onend();
    window.speechSynthesis.speak(u);
  }

  function playOne(id) {
    const note = state.notes.find((n) => n.id === id);
    if (!note) return;
    focusNote(note.id);
    panToNote(note);
    speak(note.text);
  }

  function playNext() {
    if (!state.notes.length) {
      showToast("No notes yet. Double-click to leave one.");
      stopPlay();
      return;
    }

    playing = true;
    playBtn.classList.add("is-playing");
    playBtn.textContent = "■";
    playIndex = (playIndex + 1) % state.notes.length;
    const note = state.notes[playIndex];
    focusNote(note.id);
    panToNote(note);
    speak(note.text, () => {
      if (!playing) return;
      if (playIndex >= state.notes.length - 1) {
        stopPlay();
        showToast("That’s all for now.");
        return;
      }
      setTimeout(playNext, 350);
    });
  }

  function stopPlay() {
    playing = false;
    playIndex = -1;
    playBtn.classList.remove("is-playing");
    playBtn.textContent = "▶";
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    worldEl.querySelectorAll(".note").forEach((n) => n.classList.remove("is-active"));
  }

  function showToast(msg) {
    toastEl.hidden = false;
    toastEl.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2200);
  }

  /* ---------- camera ---------- */

  function zoomAt(sx, sy, factor) {
    const before = screenToWorld(sx, sy);
    state.z = clampZoom(state.z * factor);
    state.x = sx - before.x * state.z;
    state.y = sy - before.y * state.z;
    requestPaint();
    queueSave();
  }

  function resetView() {
    state.x = 0;
    state.y = 0;
    state.z = 1;
    requestPaint();
    queueSave();
  }

  /* ---------- pointer ---------- */

  function onPointerDown(e) {
    if (e.target.closest(".note, .map, .top")) return;

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      drawing = false;
      currentStroke = null;
      const [a, b] = [...pointers.values()];
      pinchStart = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        z: state.z,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        viewX: state.x,
        viewY: state.y,
      };
      panning = false;
      return;
    }

    if (e.button === 2 || e.button === 1 || spaceDown) {
      panning = true;
      stage.classList.add("is-panning");
      panOrigin = { x: e.clientX, y: e.clientY };
      viewOrigin = { x: state.x, y: state.y };
      stage.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;

    drawing = true;
    stage.classList.add("is-drawing");
    const p = screenToWorld(e.clientX, e.clientY);
    currentStroke = { width: 2.6, points: [p] };
    stage.setPointerCapture(e.pointerId);
    requestPaint();
  }

  function onPointerMove(e) {
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const factor = dist / Math.max(pinchStart.dist, 1);
      const world = {
        x: (pinchStart.midX - pinchStart.viewX) / pinchStart.z,
        y: (pinchStart.midY - pinchStart.viewY) / pinchStart.z,
      };
      state.z = clampZoom(pinchStart.z * factor);
      state.x = midX - world.x * state.z;
      state.y = midY - world.y * state.z;
      requestPaint();
      return;
    }

    if (panning && panOrigin) {
      state.x = viewOrigin.x + (e.clientX - panOrigin.x);
      state.y = viewOrigin.y + (e.clientY - panOrigin.y);
      requestPaint();
      return;
    }
    if (!drawing || !currentStroke) return;
    const p = screenToWorld(e.clientX, e.clientY);
    const last = currentStroke.points[currentStroke.points.length - 1];
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    if (dx * dx + dy * dy < 0.8) return;
    currentStroke.points.push(p);
    requestPaint();
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;

    if (panning) {
      panning = false;
      panOrigin = null;
      stage.classList.remove("is-panning");
      queueSave();
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!drawing) return;
    drawing = false;
    stage.classList.remove("is-drawing");
    if (currentStroke && currentStroke.points.length > 1) {
      state.strokes.push(currentStroke);
      if (state.strokes.length > 200) state.strokes.shift();
      queueSave();
    }
    currentStroke = null;
    requestPaint();
    try {
      stage.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onDblClick(e) {
    if (e.target.closest(".note, .map, .top")) return;
    const p = screenToWorld(e.clientX, e.clientY);
    createNote(p.x, p.y);
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(e.clientX, e.clientY, factor);
  }

  /* ---------- events ---------- */

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("dblclick", onDblClick);
  stage.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("contextmenu", (e) => e.preventDefault());

  worldEl.addEventListener("pointerdown", (e) => e.stopPropagation());
  worldEl.addEventListener("input", (e) => {
    const area = e.target.closest(".note__body");
    if (!area) return;
    const note = state.notes.find((n) => n.id === area.dataset.id);
    if (!note) return;
    note.text = area.value.slice(0, 280);
    queueSave();
  });

  worldEl.addEventListener("click", (e) => {
    const play = e.target.closest("[data-play]");
    if (play) {
      stopPlay();
      playOne(play.dataset.play);
      return;
    }
    const del = e.target.closest("[data-del]");
    if (del) {
      state.notes = state.notes.filter((n) => n.id !== del.dataset.del);
      renderNotes();
      queueSave();
    }
  });

  document.getElementById("zoom-in").addEventListener("click", () => {
    zoomAt(w / 2, h / 2, 1.2);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    zoomAt(w / 2, h / 2, 1 / 1.2);
  });
  document.getElementById("zoom-reset").addEventListener("click", resetView);

  playBtn.addEventListener("click", () => {
    if (playing) stopPlay();
    else playNext();
  });

  addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.target.closest("textarea, [contenteditable]")) {
      e.preventDefault();
      spaceDown = true;
      stage.style.cursor = "grab";
    }
  });
  addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      spaceDown = false;
      stage.style.cursor = "";
    }
  });

  addEventListener("resize", () => {
    resize();
    requestPaint();
  });

  load();
  resize();
  renderNotes();
  requestPaint();
})();
