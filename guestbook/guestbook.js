(() => {
  const STORAGE = "jorjis.guestbook.notes.v3";
  const NOTE_MS = 2000;
  const MIN_Z = 0.35;
  const MAX_Z = 2.5;
  const PAPER = 20000; // virtual world extent for infinite feel

  const stage = document.getElementById("stage");
  const paper = document.getElementById("paper");
  const world = document.getElementById("world");
  const progress = document.getElementById("progress");
  const progressBar = document.getElementById("progress-bar");
  const playBtn = document.getElementById("play");
  const toastEl = document.getElementById("toast");

  const state = {
    x: innerWidth / 2,
    y: innerHeight / 2,
    z: 1,
    notes: [],
  };

  let panning = false;
  let panStart = null;
  let viewStart = null;
  let moved = false;
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
        })
      );
    } catch {
      /* ignore */
    }
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 200);
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
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderNotes() {
    world.innerHTML = state.notes
      .map(
        (note) => `
      <article class="note" data-id="${escapeHtml(note.id)}" style="left:${note.x}px;top:${note.y}px">
        <div class="note__head">
          <button type="button" class="note__x" data-del="${escapeHtml(note.id)}" aria-label="Remove">✕</button>
        </div>
        <textarea class="note__body" data-id="${escapeHtml(note.id)}" rows="3" placeholder="A line…">${escapeHtml(note.text || "")}</textarea>
      </article>`
      )
      .join("");
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

  function focusNote(id) {
    world.querySelectorAll(".note").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.id === id);
    });
  }

  function clearFocus() {
    world.querySelectorAll(".note").forEach((el) => el.classList.remove("is-active"));
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

  /* -------- play / pause highlight -------- */

  function setPlayUi() {
    if (!playing) {
      playBtn.textContent = "▶";
      playBtn.classList.remove("is-playing");
      playBtn.setAttribute("aria-label", "Play notes");
      progress.hidden = true;
      progressBar.style.width = "0%";
      return;
    }
    playBtn.classList.add("is-playing");
    playBtn.textContent = paused ? "▶" : "❚❚";
    playBtn.setAttribute("aria-label", paused ? "Resume" : "Pause");
    progress.hidden = false;
  }

  function stopPlay() {
    playing = false;
    paused = false;
    playIndex = -1;
    playElapsed = 0;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    rafPlay = 0;
    clearFocus();
    setPlayUi();
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
    focusNote(note.id);
    panToNote(note);
    setPlayUi();
    if (!rafPlay) rafPlay = requestAnimationFrame(tickPlay);
  }

  function tickPlay(now) {
    rafPlay = 0;
    if (!playing || paused) return;

    playElapsed = now - playStarted;
    const t = Math.min(1, playElapsed / NOTE_MS);
    progressBar.style.width = `${(1 - t) * 100}%`;

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

    if (paused) {
      paused = false;
      playStarted = performance.now() - playElapsed;
      setPlayUi();
      rafPlay = requestAnimationFrame(tickPlay);
      return;
    }

    paused = true;
    playElapsed = performance.now() - playStarted;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    rafPlay = 0;
    setPlayUi();
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

  /* -------- pan only (no draw) -------- */

  function onPointerDown(e) {
    if (e.target.closest(".note, .map, .top, .progress")) return;

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
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
      const world = {
        x: (pinch.midX - pinch.viewX) / pinch.z,
        y: (pinch.midY - pinch.viewY) / pinch.z,
      };
      state.z = clampZ(pinch.z * (dist / pinch.dist));
      state.x = midX - world.x * state.z;
      state.y = midY - world.y * state.z;
      applyTransform();
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
    // trackpad scroll = pan; ctrl/meta+scroll or pinch = zoom
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
    const del = e.target.closest("[data-del]");
    if (!del) return;
    state.notes = state.notes.filter((n) => n.id !== del.dataset.del);
    if (playing) stopPlay();
    renderNotes();
    queueSave();
  });

  document.getElementById("zoom-in").addEventListener("click", () => {
    zoomAt(innerWidth / 2, innerHeight / 2, 1.15);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.15);
  });
  document.getElementById("zoom-reset").addEventListener("click", resetView);
  playBtn.addEventListener("click", togglePlay);

  addEventListener("resize", applyTransform);

  load();
  renderNotes();
  applyTransform();
})();
