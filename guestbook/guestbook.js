(() => {
  const KEY = "jorjis.guestbook.lines.v2";
  const MAX = 160;
  const LIMIT = 50;

  const noteEl = document.getElementById("note");
  const addBtn = document.getElementById("add");
  const countEl = document.getElementById("count");
  const errorEl = document.getElementById("error");
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const nowEl = document.getElementById("now");

  function daysAgo(days, hour, minute) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }

  const SAMPLES = [
    {
      id: "sample-1",
      text: "Passed through. Left the door ajar.",
      at: daysAgo(18, 21, 14),
    },
    {
      id: "sample-2",
      text: "Quiet page. Loud internet.",
      at: daysAgo(3, 9, 42),
    },
  ];

  let notes = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw == null) {
        localStorage.setItem(KEY, JSON.stringify(SAMPLES));
        return SAMPLES.slice();
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, LIMIT) : [];
    } catch {
      return SAMPLES.slice();
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

  function tickClock() {
    const now = new Date();
    nowEl.dateTime = now.toISOString();
    nowEl.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })
      .format(now)
      .replace(",", " ·");
  }

  function formatWhen(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return "";
    }
  }

  function showError(msg) {
    errorEl.hidden = !msg;
    errorEl.textContent = msg || "";
  }

  function updateCount() {
    countEl.textContent = String(MAX - noteEl.value.length);
    noteEl.style.height = "auto";
    noteEl.style.height = `${noteEl.scrollHeight}px`;
  }

  function render() {
    emptyEl.hidden = notes.length > 0;
    listEl.innerHTML = notes
      .map(
        (n) => `
      <li class="item">
        <time class="item__when" datetime="${escapeHtml(n.at)}">${escapeHtml(
          formatWhen(n.at)
        )}</time>
        <p class="item__text">${escapeHtml(n.text)}</p>
        <button type="button" class="item__remove" data-id="${escapeHtml(n.id)}">
          remove
        </button>
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

  tickClock();
  setInterval(tickClock, 30_000);
  updateCount();
  render();
})();
