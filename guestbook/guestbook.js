(() => {
  const STORAGE_KEY = "jorjis.guestbook.v1";
  const MAX_NOTE = 280;
  const MAX_NAME = 40;

  const nameEl = document.getElementById("name");
  const noteEl = document.getElementById("note");
  const submitBtn = document.getElementById("submit");
  const errorEl = document.getElementById("error");
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("count");
  const clearMarkBtn = document.getElementById("clear-mark");
  const pad = document.getElementById("pad");
  const hint = document.getElementById("hint");
  const canvas = document.getElementById("pen");
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

  let entries = load();
  let drawing = false;
  let hasMark = false;
  let lastX = 0;
  let lastY = 0;
  let pending = null;
  let raf = 0;
  let dpr = 1;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* quota / private mode */
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWhen(ts) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(ts));
    } catch {
      return "";
    }
  }

  function lineWidth() {
    return canvas.clientWidth <= 420 ? 2.25 : 2.75;
  }

  function resizeCanvas() {
    const rect = pad.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    const snapshot = hasMark ? canvas.toDataURL() : null;

    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2017e2";
    ctx.lineWidth = lineWidth();

    if (snapshot) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = snapshot;
    }
  }

  function clearMark() {
    const rect = pad.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasMark = false;
    hint.classList.remove("is-gone");
    pad.classList.remove("is-drawing");
  }

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function flushStroke() {
    raf = 0;
    if (!pending || !drawing) {
      pending = null;
      return;
    }

    const { x, y } = pending;
    pending = null;
    const midX = (lastX + x) / 2;
    const midY = (lastY + y) / 2;
    ctx.quadraticCurveTo(lastX, lastY, midX, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    lastX = x;
    lastY = y;
  }

  function queueStroke(x, y) {
    pending = { x, y };
    if (!raf) raf = requestAnimationFrame(flushStroke);
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = pointerPos(e);
    drawing = true;
    hasMark = true;
    lastX = x;
    lastY = y;
    hint.classList.add("is-gone");
    pad.classList.add("is-drawing");
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = pointerPos(e);
    queueStroke(x, y);
  }

  function onPointerUp(e) {
    if (!drawing) return;
    drawing = false;
    pending = null;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function markDataUrl() {
    if (!hasMark) return "";
    const out = document.createElement("canvas");
    const w = 320;
    const h = Math.max(
      1,
      Math.round((canvas.clientHeight / Math.max(canvas.clientWidth, 1)) * w)
    );
    out.width = w;
    out.height = h;
    const octx = out.getContext("2d");
    octx.fillStyle = "#fffcf7";
    octx.fillRect(0, 0, w, h);
    octx.drawImage(canvas, 0, 0, w, h);
    return out.toDataURL("image/jpeg", 0.72);
  }

  function showError(message) {
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function render() {
    countEl.textContent = entries.length
      ? `${entries.length} ${entries.length === 1 ? "note" : "notes"}`
      : "";

    emptyEl.hidden = entries.length > 0;
    listEl.innerHTML = entries
      .map(
        (entry) => `
      <article class="entry">
        <div class="entry__meta">
          <h3 class="entry__name">${escapeHtml(entry.name)}</h3>
          <time class="entry__when" datetime="${escapeHtml(entry.at)}">${escapeHtml(
            formatWhen(entry.at)
          )}</time>
        </div>
        <p class="entry__body">${escapeHtml(entry.note)}</p>
        ${
          entry.mark
            ? `<img class="entry__mark" src="${entry.mark}" alt="" loading="lazy" />`
            : ""
        }
      </article>`
      )
      .join("");
  }

  function submit() {
    const name = nameEl.value.trim().slice(0, MAX_NAME) || "Anonymous";
    const note = noteEl.value.trim().slice(0, MAX_NOTE);

    if (!note) {
      showError("A note needs at least one sentence.");
      noteEl.focus();
      return;
    }

    showError("");
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      note,
      mark: markDataUrl(),
      at: new Date().toISOString(),
    };

    entries = [entry, ...entries].slice(0, 40);
    save();
    render();

    noteEl.value = "";
    clearMark();
    noteEl.focus();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);

  clearMarkBtn.addEventListener("click", clearMark);
  submitBtn.addEventListener("click", submit);

  noteEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 80);
  });

  resizeCanvas();
  render();
})();
