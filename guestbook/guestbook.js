(() => {
  const STORAGE = "jorjis.guestbook.world.v4";
  const NOTE_MS = 2000;
  const MIN_Z = 0.35;
  const MAX_Z = 2.5;
  const PAPER = 20000;

  const stage = document.getElementById("stage");
  const paper = document.getElementById("paper");
  const world = document.getElementById("world");
  const canvas = document.getElementById("ink");
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  const playBtn = document.getElementById("play");
  const brushBtn = document.getElementById("brush");
  const hintEl = document.getElementById("hint");
  const toastEl = document.getElementById("toast");
  const playIcon = playBtn.querySelector(".i-play");
  const pauseIcon = playBtn.querySelector(".i-pause");

  const iconClose = document.getElementById("icon-close").innerHTML;
  const iconPause = document.getElementById("icon-pause").innerHTML;
  const iconPlay = document.getElementById("icon-play").innerHTML;

  const state = {
    x: innerWidth / 2,
    y: innerHeight / 2,
    z: 1,
    notes: [],
    strokes: [],
  };

  let brushOn = false;
  let dpr = 1;
  let vw = 0;
  let vh = 0;
  let needsPaint = true;
  let rafPaint = 0;

  let panning = false;
  let drawing = false;
  let panStart = null;
  let viewStart = null;
  let moved = false;
  let currentStroke = null;
  let pointers = new Map();
  let pinch = null;
  let saveTimer = 0;
  let toastTimer = 0;

  let playing = false;
  let paused = false;
  let playIndex = -1;
  let playStarted = 0;
  let playElapsed = 0;
  let rafPlay = 0;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.notes)) state.notes = data.notes;
      if (Array.isArray(data.strokes)) state.strokes = data.strokes;
      if (data.view) {
        state.x = data.view.x ?? state.x;
        state.y = data.view.y ?? state.y;
        state.z = data.view.z ?? 1;
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
          notes: state.notes.slice(-80),
          strokes: state.strokes.slice(-180),
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

  function screenToWorld(sx, sy) {
    return {
      x: (sx - state.x) / state.z,
      y: (sy - state.y) / state.z,
    };
  }

  function applyTransform() {
    const t = `translate(${state.x}px, ${state.y}px) scale(${state.z})`;
    world.style.transform = t;
    paper.style.transform = `${t} translate(${-PAPER / 2}px, ${-PAPER / 2}px)`;
    paper.style.width = PAPER + "px";
    paper.style.height = PAPER + "px";
    needsPaint = true;
    if (!rafPaint) rafPaint = requestAnimationFrame(paint);
  }

  function resizeCanvas() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    vw = innerWidth;
    vh = innerHeight;
    canvas.width = (vw * dpr) | 0;
    canvas.height = (vh * dpr) | 0;
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    needsPaint = true;
    if (!rafPaint) rafPaint = requestAnimationFrame(paint);
  }

  function paint() {
    rafPaint = 0;
    if (!needsPaint) return;
    needsPaint = false;

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.scale(state.z, state.z);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f1c16";

    const drawStroke = (stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.lineWidth = (stroke.width || 2.4) / state.z;
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
    };

    for (const stroke of state.strokes) drawStroke(stroke);
    if (currentStroke) drawStroke(currentStroke);
    ctx.restore();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderNotes() {
    const activeId =
      playing && playIndex >= 0 ? state.notes[playIndex]?.id : null;

    world.innerHTML = state.notes
      .map((note) => {
        const on = note.id === activeId;
        return `
      <article class="note${on ? " is-active" : ""}" data-id="${escapeHtml(note.id)}" style="left:${note.x}px;top:${note.y}px">
        <div class="note__rail" aria-hidden="true"><div class="note__rail-bar" data-rail="${escapeHtml(note.id)}"></div></div>
        <div class="note__head">
          <button type="button" class="icon-btn note__pause" data-pause="${escapeHtml(note.id)}" aria-label="${paused ? "Resume" : "Pause"}" title="${paused ? "Resume" : "Pause"}">
            ${paused ? iconPlay : iconPause}
          </button>
          <button type="button" class="icon-btn note__x" data-del="${escapeHtml(note.id)}" aria-label="Remove" title="Remove">
            ${iconClose}
          </button>
        </div>
        <textarea class="note__body" data-id="${escapeHtml(note.id)}" rows="3" placeholder="A line…">${escapeHtml(note.text || "")}</textarea>
      </article>`;
      })
      .join("");

    if (onPlayingNote()) updateNoteRail();
  }

  function onPlayingNote() {
    return playing && playIndex >= 0 && state.notes[playIndex];
  }

  function updateNoteRail() {
    const note = state.notes[playIndex];
    if (!note) return;
    const bar = world.querySelector(`[data-rail="${note.id}"]`);
    if (!bar) return;
    const remain = Math.max(0, 1 - playElapsed / NOTE_MS);
    bar.style.width = `${remain * 100}%`;
  }

  function updateNotePauseIcon() {
    const btn = world.querySelector(".note.is-active [data-pause]");
    if (!btn) return;
    btn.innerHTML = paused ? iconPlay : iconPause;
    btn.setAttribute("aria-label", paused ? "Resume" : "Pause");
    btn.title = paused ? "Resume" : "Pause";
  }

  function createNote(x, y) {
    const note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x,
      y,
      text: "",
    };
    state.notes.push(note);
    renderNotes();
    queueSave();
    const el = world.querySelector(`textarea[data-id="${note.id}"]`);
    if (el) el.focus();
  }

  function panToNote(note) {
    state.x = innerWidth / 2 - (note.x + 120) * state.z;
    state.y = innerHeight / 2 - (note.y + 50) * state.z;
    applyTransform();
    queueSave();
  }

  function showToast(msg) {
    toastEl.hidden = false;
    toastEl.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2000);
  }

  function setBrush(on) {
    brushOn = on;
    brushBtn.classList.toggle("is-on", on);
    brushBtn.setAttribute("aria-pressed", on ? "true" : "false");
    stage.classList.toggle("is-brush", on);
    hintEl.textContent = on
      ? "brush on · paint freely · double-click for a note"
      : "drag to move · double-click for a note";
  }

  /* -------- play / pause -------- */

  function setPlayUi() {
    if (!playing) {
      playBtn.classList.remove("is-playing");
      playIcon.hidden = false;
      pauseIcon.hidden = true;
      playBtn.setAttribute("aria-label", "Play notes");
      return;
    }
    playBtn.classList.add("is-playing");
    playIcon.hidden = !paused;
    pauseIcon.hidden = paused;
    playBtn.setAttribute("aria-label", paused ? "Resume" : "Pause");
  }

  function stopPlay() {
    playing = false;
    paused = false;
    playIndex = -1;
    playElapsed = 0;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    rafPlay = 0;
    setPlayUi();
    renderNotes();
  }

  function startNote(index) {
    if (!state.notes.length) {
      stopPlay();
      showToast("No notes yet.");
      return;
    }
    playIndex = index;
    playElapsed = 0;
    playStarted = performance.now();
    const note = state.notes[playIndex];
    renderNotes();
    panToNote(note);
    setPlayUi();
    updateNoteRail();
    if (!rafPlay) rafPlay = requestAnimationFrame(tickPlay);
  }

  function tickPlay(now) {
    rafPlay = 0;
    if (!playing || paused) return;

    playElapsed = now - playStarted;
    updateNoteRail();

    if (playElapsed >= NOTE_MS) {
      if (playIndex >= state.notes.length - 1) {
        stopPlay();
        showToast("End of notes.");
        return;
      }
      startNote(playIndex + 1);
      return;
    }

    rafPlay = requestAnimationFrame(tickPlay);
  }

  function togglePlay() {
    if (!state.notes.length) {
      showToast("Double-click the page to leave a note.");
      return;
    }

    if (!playing) {
      playing = true;
      paused = false;
      startNote(0);
      return;
    }

    if (paused) resumePlay();
    else pausePlay();
  }

  function pausePlay() {
    if (!playing || paused) return;
    paused = true;
    playElapsed = performance.now() - playStarted;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    rafPlay = 0;
    setPlayUi();
    updateNotePauseIcon();
  }

  function resumePlay() {
    if (!playing || !paused) return;
    paused = false;
    playStarted = performance.now() - playElapsed;
    setPlayUi();
    updateNotePauseIcon();
    rafPlay = requestAnimationFrame(tickPlay);
  }

  /* -------- camera -------- */

  function zoomAt(sx, sy, factor) {
    const before = screenToWorld(sx, sy);
    state.z = clampZ(state.z * factor);
    state.x = sx - before.x * state.z;
    state.y = sy - before.y * state.z;
    applyTransform();
    queueSave();
  }

  function resetView() {
    state.x = innerWidth / 2;
    state.y = innerHeight / 2;
    state.z = 1;
    applyTransform();
    queueSave();
  }

  /* -------- pointer: pan by default, draw only if brush on -------- */

  function onPointerDown(e) {
    if (e.target.closest(".note, .map, .top")) return;

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      drawing = false;
      currentStroke = null;
      const [a, b] = [...pointers.values()];
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        z: state.z,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        viewX: state.x,
        viewY: state.y,
      };
      panning = false;
      return;
    }

    // brush paints; otherwise always pan (scroll never draws)
    if (brushOn && e.button === 0) {
      drawing = true;
      const p = screenToWorld(e.clientX, e.clientY);
      currentStroke = { width: 2.4, points: [p] };
      stage.setPointerCapture(e.pointerId);
      needsPaint = true;
      if (!rafPaint) rafPaint = requestAnimationFrame(paint);
      return;
    }

    panning = true;
    moved = false;
    stage.classList.add("is-panning");
    panStart = { x: e.clientX, y: e.clientY };
    viewStart = { x: state.x, y: state.y };
    stage.setPointerCapture(e.pointerId);
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
      const worldPt = {
        x: (pinch.midX - pinch.viewX) / pinch.z,
        y: (pinch.midY - pinch.viewY) / pinch.z,
      };
      state.z = clampZ(pinch.z * (dist / pinch.dist));
      state.x = midX - worldPt.x * state.z;
      state.y = midY - worldPt.y * state.z;
      applyTransform();
      return;
    }

    if (drawing && currentStroke) {
      const p = screenToWorld(e.clientX, e.clientY);
      const last = currentStroke.points[currentStroke.points.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (dx * dx + dy * dy < 0.7) return;
      currentStroke.points.push(p);
      needsPaint = true;
      if (!rafPaint) rafPaint = requestAnimationFrame(paint);
      return;
    }

    if (!panning || !panStart) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    if (dx * dx + dy * dy > 9) moved = true;
    state.x = viewStart.x + dx;
    state.y = viewStart.y + dy;
    applyTransform();
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;

    if (drawing) {
      drawing = false;
      if (currentStroke && currentStroke.points.length > 1) {
        state.strokes.push(currentStroke);
        if (state.strokes.length > 180) state.strokes.shift();
        queueSave();
      }
      currentStroke = null;
      needsPaint = true;
      if (!rafPaint) rafPaint = requestAnimationFrame(paint);
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }

    if (!panning) return;
    panning = false;
    stage.classList.remove("is-panning");
    panStart = null;
    if (moved) queueSave();
    try {
      stage.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.92 : 1.08);
      return;
    }
    state.x -= e.deltaX;
    state.y -= e.deltaY;
    applyTransform();
    queueSave();
  }

  function onDblClick(e) {
    if (e.target.closest(".note, .map, .top")) return;
    const p = screenToWorld(e.clientX, e.clientY);
    createNote(p.x, p.y);
  }

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("dblclick", onDblClick);

  world.addEventListener("pointerdown", (e) => e.stopPropagation());
  world.addEventListener("input", (e) => {
    const area = e.target.closest(".note__body");
    if (!area) return;
    const note = state.notes.find((n) => n.id === area.dataset.id);
    if (!note) return;
    note.text = area.value.slice(0, 280);
    queueSave();
  });
  world.addEventListener("click", (e) => {
    const pause = e.target.closest("[data-pause]");
    if (pause) {
      e.stopPropagation();
      if (!playing) return;
      if (paused) resumePlay();
      else pausePlay();
      return;
    }
    const del = e.target.closest("[data-del]");
    if (!del) return;
    state.notes = state.notes.filter((n) => n.id !== del.dataset.del);
    if (playing) stopPlay();
    renderNotes();
    queueSave();
  });

  brushBtn.addEventListener("click", () => setBrush(!brushOn));
  document.getElementById("zoom-in").addEventListener("click", () => {
    zoomAt(innerWidth / 2, innerHeight / 2, 1.15);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.15);
  });
  document.getElementById("zoom-reset").addEventListener("click", resetView);
  playBtn.addEventListener("click", togglePlay);

  addEventListener("resize", () => {
    resizeCanvas();
    applyTransform();
  });

  load();
  resizeCanvas();
  renderNotes();
  applyTransform();
  setBrush(false);
})();
