(() => {
  // Private by design: notes never leave this browser.
  const KEY = "jorjis.guestbook.lines.v1";
  const MAX = 160;
  const LIMIT = 50;

  const noteEl = document.getElementById("note");
  const addBtn = document.getElementById("add");
  const countEl = document.getElementById("count");
  const errorEl = document.getElementById("error");
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");

  let notes = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, LIMIT) : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes.slice(0, LIMIT)));
    } catch {
      showError("Could not save on this device.");
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clean(value) {
    return String(value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim()
      .slice(0, MAX);
  }

  function formatWhen(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(iso));
    } catch {
      return "";
    }
  }

  function showError(msg) {
    if (!msg) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }

  function updateCount() {
    countEl.textContent = String(MAX - noteEl.value.length);
  }

  function render() {
    emptyEl.hidden = notes.length > 0;
    listEl.innerHTML = notes
      .map(
        (n) => `
      <li class="item">
        <p class="item__text">${escapeHtml(n.text)}</p>
        <div class="item__meta">
          <time class="item__when" datetime="${escapeHtml(n.at)}">${escapeHtml(
            formatWhen(n.at)
          )}</time>
          <button type="button" class="item__remove" data-id="${escapeHtml(
            n.id
          )}">
            remove
          </button>
        </div>
      </li>`
      )
      .join("");
  }

  function addNote() {
    const text = clean(noteEl.value);
    if (!text) {
      showError("Write one short sentence.");
      noteEl.focus();
      return;
    }
    showError("");
    notes = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        at: new Date().toISOString(),
      },
      ...notes,
    ].slice(0, LIMIT);
    save();
    render();
    noteEl.value = "";
    updateCount();
    noteEl.focus();
  }

  noteEl.addEventListener("input", updateCount);
  noteEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      addNote();
    }
  });

  addBtn.addEventListener("click", addNote);

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]");
    if (!btn) return;
    notes = notes.filter((n) => n.id !== btn.dataset.id);
    save();
    render();
  });

  updateCount();
  render();
})();
