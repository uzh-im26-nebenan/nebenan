(() => {
  const KEY = "jorjis.guestbook.lines.v2";
  const MAX = 160;
  const LIMIT = 50;

  const noteEl = document.getElementById("note");
  const countEl = document.getElementById("count");
  const errorEl = document.getElementById("error");
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const nowEl = document.getElementById("now");

  const clockFmt = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const noteFmt = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const ago = (days, h, m) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const samples = [
    {
      id: "sample-1",
      text: "Passed through. Left the door ajar.",
      at: ago(18, 21, 14),
    },
    {
      id: "sample-2",
      text: "Quiet page. Loud internet.",
      at: ago(3, 9, 42),
    },
  ];

  let notes = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw == null) {
        localStorage.setItem(KEY, JSON.stringify(samples));
        return samples.slice();
      }
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data.slice(0, LIMIT) : [];
    } catch {
      return samples.slice();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes));
    } catch {
      error("Could not save on this device.");
    }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function error(msg) {
    errorEl.hidden = !msg;
    errorEl.textContent = msg || "";
  }

  function tick() {
    const now = new Date();
    nowEl.dateTime = now.toISOString();
    nowEl.textContent = clockFmt.format(now).replace(",", " ·");
  }

  function sync() {
    countEl.textContent = String(MAX - noteEl.value.length);
    noteEl.style.height = "auto";
    noteEl.style.height = noteEl.scrollHeight + "px";
  }

  function render() {
    emptyEl.hidden = notes.length > 0;
    listEl.innerHTML = notes
      .map(
        (n) =>
          `<li class="item"><time class="item__when" datetime="${esc(
            n.at
          )}">${esc(noteFmt.format(new Date(n.at)))}</time><p class="item__text">${esc(
            n.text
          )}</p><button type="button" class="item__remove" data-id="${esc(
            n.id
          )}">remove</button></li>`
      )
      .join("");
  }

  function add() {
    const text = noteEl.value.replace(/[\u0000-\u001F]/g, "").trim().slice(0, MAX);
    if (!text) {
      error("Write one short sentence.");
      noteEl.focus();
      return;
    }
    error("");
    notes = [
      { id: Date.now().toString(36), text, at: new Date().toISOString() },
      ...notes,
    ].slice(0, LIMIT);
    save();
    render();
    noteEl.value = "";
    sync();
    noteEl.focus();
  }

  noteEl.addEventListener("input", sync);
  noteEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      add();
    }
  });
  document.getElementById("add").addEventListener("click", add);
  listEl.addEventListener("click", (e) => {
    const id = e.target.dataset && e.target.dataset.id;
    if (!id) return;
    notes = notes.filter((n) => n.id !== id);
    save();
    render();
  });

  tick();
  setInterval(tick, 60_000);
  sync();
  render();
})();
