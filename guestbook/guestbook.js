(() => {
  const WRITE_KEY = "jorjis.page.write";
  const DRAW_KEY = "jorjis.page.draw";

  const writeEl = document.getElementById("write");
  const canvas = document.getElementById("draw");
  const clearBtn = document.getElementById("clear");
  const modeBtns = [...document.querySelectorAll("[data-mode]")];
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });

  let mode = "write";
  let drawing = false;
  let dirty = false;
  let lastX = 0;
  let lastY = 0;
  let pts = null;
  let raf = 0;
  let writeTimer = 0;
  let drawTimer = 0;

  /* -------- write -------- */

  function loadWrite() {
    try {
      const html = localStorage.getItem(WRITE_KEY);
      if (html) writeEl.innerHTML = html;
    } catch {
      /* ignore */
    }
  }

  function saveWrite() {
    try {
      const html = writeEl.innerHTML.trim();
      if (!html || html === "<br>") localStorage.removeItem(WRITE_KEY);
      else localStorage.setItem(WRITE_KEY, writeEl.innerHTML);
    } catch {
      /* ignore */
    }
  }

  function queueWriteSave() {
    clearTimeout(writeTimer);
    writeTimer = setTimeout(saveWrite, 200);
  }

  /* -------- draw -------- */

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth;
    const h = innerHeight;
    canvas.width = (w * dpr) | 0;
    canvas.height = (h * dpr) | 0;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f1c16";
    ctx.lineWidth = w < 600 ? 2.2 : 2.8;
  }

  function loadDraw() {
    const data = localStorage.getItem(DRAW_KEY);
    if (!data) {
      dirty = false;
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, innerWidth, innerHeight);
      dirty = true;
    };
    img.src = data;
  }

  function saveDraw() {
    if (!dirty) {
      localStorage.removeItem(DRAW_KEY);
      return;
    }
    try {
      localStorage.setItem(DRAW_KEY, canvas.toDataURL("image/png"));
    } catch {
      /* ignore */
    }
  }

  function queueDrawSave() {
    clearTimeout(drawTimer);
    drawTimer = setTimeout(saveDraw, 180);
  }

  function paint() {
    raf = 0;
    if (!pts || pts.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }

    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    pts = [last];
  }

  function down(e) {
    if (mode !== "draw" || (e.button != null && e.button !== 0)) return;
    if (e.target.closest(".nav")) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    dirty = true;
    lastX = e.clientX;
    lastY = e.clientY;
    pts = [{ x: lastX, y: lastY }];
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(lastX + 0.01, lastY + 0.01);
    ctx.stroke();
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    pts.push({ x: e.clientX, y: e.clientY });
    if (!raf) raf = requestAnimationFrame(paint);
  }

  function up(e) {
    if (!drawing) return;
    drawing = false;
    if (raf) {
      cancelAnimationFrame(raf);
      paint();
    }
    pts = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    queueDrawSave();
  }

  function clearDraw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    dirty = false;
    localStorage.removeItem(DRAW_KEY);
  }

  /* -------- mode -------- */

  function setMode(next) {
    mode = next;
    modeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.mode === next));

    const drawingMode = next === "draw";
    canvas.hidden = !drawingMode;
    clearBtn.hidden = !drawingMode;
    writeEl.hidden = drawingMode;

    if (drawingMode) {
      size();
      loadDraw();
    } else {
      writeEl.focus();
    }
  }

  /* -------- wire -------- */

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  writeEl.addEventListener("input", queueWriteSave);
  clearBtn.addEventListener("click", clearDraw);

  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  let resizeTimer = 0;
  addEventListener("resize", () => {
    if (mode !== "draw") return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      size();
      loadDraw();
    }, 100);
  });

  loadWrite();
  writeEl.focus();
})();
