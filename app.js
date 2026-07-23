const FILES = {
  "about/intro.txt": `ABOUT ME

Name: Jorjis Hasan
Role: Full-stack engineer

I build, ship, and scale software for founders.
Six years in — still obsessed with the quiet details
that make a product feel inevitable.

My apps Cornflix and Algokid serve ~40k people a day.
I care about craft, latency, and interfaces that age well.

Based wherever the work is interesting.
Open to serious collaborations.`,

  "work/cornflix.txt": `WORK / CORNFLIX

Product: Cornflix
Type: consumer media platform
Reach: tens of thousands of daily users

A streaming experience designed for habit —
fast cold starts, opinionated UX, and a surface
that feels more living-room than dashboard.

Stack: React · Node · modern delivery pipelines
Role: builder / product engineer`,

  "work/algokids.txt": `WORK / ALGOKIDS

Product: AlgoKids (Algokid)
Type: education · interactive learning
Reach: part of a ~40k daily-user portfolio

Teaching algorithms and computational thinking
without the intimidation. Soft edges, hard ideas.

Built for curiosity. Tuned for retention.`,

  "work/engagements.txt": `WORK / ENGAGEMENTS

Freej Almarar — Full-Stack Engineer
Sep 2023 – Present
Backend refactor (Express, tRPC, Drizzle, MySQL).
API architecture, DevOps, bilingual CMS.
Scaled toward 100k+ requests / day.

Zeer Studio — Founding Engineer
2021 – 2026
60+ sites & extensions. AI integrations
(OpenAI, Claude) from prototype to production.

HackerRank — SDE Intern
2021 – 2022
Problem design · top 0.1% JavaScript.`,

  "craft/stack.txt": `CRAFT / STACK

Languages
  TypeScript · JavaScript · Python · SQL

Frontend
  React · Next.js · Radix · Motion

Backend
  Node · tRPC · GraphQL · Express
  Drizzle · MySQL · Postgres

Cloud & delivery
  AWS · Railway · Netlify · CI/CD

Taste
  Less chrome. More intention.
  Interfaces should feel like rooms, not dashboards.`,

  "craft/principles.txt": `CRAFT / PRINCIPLES

01  Ship something you would use at 2 a.m.
02  Latency is a design material.
03  Prefer fewer features done with gravity.
04  Typography is half the product.
05  Automate the tedious; handcraft the memorable.
06  Leave every codebase quieter than you found it.

A good system disappears.
A great one feels slightly alive.`,

  "correspondence/contact.txt": `CORRESPONDENCE

For work, ideas, or a proper hello —

Email
  speak.jorjis@gmail.com

Web
  https://jorjishasan.com

Elsewhere
  github.com/jorjishasan
  linkedin.com/in/jorjishasan
  twitter.com/jorjis_hasan
  instagram.com/jorjishasan

Prefer email for anything substantial.
DMs are for weather and jokes.`,

  "reading/currently.txt": `READING / CURRENTLY

On rotation —
  systems design essays
  product postmortems
  quiet fiction with sharp sentences

Listening —
  late-night instrumentals
  whatever keeps the cursor moving

Watching —
  cinema that trusts the audience

Suggestions welcome. Send a link
with one sentence on why it matters.`,

  "guestbook/sign.txt": `GUESTBOOK

Leave a mark if you passed through.

If this directory found you —
say hello, send a film, or tell me
what you're building.

The best notes arrive without agenda.

— j.h.`,
};

const TREE = {
  name: "jorjis hasan",
  children: [
    {
      name: "about",
      children: [{ name: "intro.txt", file: "about/intro.txt" }],
    },
    {
      name: "work",
      children: [
        { name: "cornflix.txt", file: "work/cornflix.txt" },
        { name: "algokids.txt", file: "work/algokids.txt" },
        { name: "engagements.txt", file: "work/engagements.txt" },
      ],
    },
    {
      name: "craft",
      children: [
        { name: "stack.txt", file: "craft/stack.txt" },
        { name: "principles.txt", file: "craft/principles.txt" },
      ],
    },
    {
      name: "correspondence",
      children: [{ name: "contact.txt", file: "correspondence/contact.txt" }],
    },
    {
      name: "reading",
      children: [{ name: "currently.txt", file: "reading/currently.txt" }],
    },
    {
      name: "guestbook",
      children: [{ name: "sign.txt", file: "guestbook/sign.txt" }],
    },
  ],
};

const expanded = new Set(["about", "work", "correspondence"]);

const treeEl = document.getElementById("tree");
const viewer = document.getElementById("viewer");
const viewerTitle = document.getElementById("viewer-title");
const viewerBody = document.getElementById("viewer-body");
const viewerClose = document.getElementById("viewer-close");
const statusPath = document.getElementById("status-path");
const clockEl = document.getElementById("clock");

function linkify(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(
      /\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi,
      '<a href="mailto:$1">$1</a>'
    )
    .replace(
      /\b((?:github|linkedin|twitter|instagram)\.com\/[^\s]+)/gi,
      '<a href="https://$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

function openFile(path) {
  const content = FILES[path];
  if (!content) return;

  viewerTitle.textContent = path;
  viewerBody.innerHTML = linkify(content);
  viewer.hidden = false;
  statusPath.textContent = `~/${path}`;
  document.body.style.overflow = "hidden";
  viewerClose.focus();
}

function closeViewer() {
  if (viewer.hidden) return;
  viewer.hidden = true;
  document.body.style.overflow = "";
  statusPath.textContent = "select a file";
}

function toggleFolder(name) {
  if (expanded.has(name)) expanded.delete(name);
  else expanded.add(name);
  renderTree();
}

function renderTree() {
  const lines = [];
  lines.push(`<span class="root">${TREE.name}</span>`);

  const folders = TREE.children;
  folders.forEach((folder, folderIndex) => {
    const isLastFolder = folderIndex === folders.length - 1;
    const branch = isLastFolder ? "└──" : "├──";
    const open = expanded.has(folder.name);
    const mark = open ? "▾" : "▸";

    lines.push(
      `<span class="pipe">${branch}</span> <span class="folder" role="button" tabindex="0" data-folder="${folder.name}" aria-expanded="${open}"><span class="mark">${mark}</span> ${folder.name}/</span>`
    );

    if (open && folder.children) {
      const childPrefix = isLastFolder ? "    " : "│   ";
      folder.children.forEach((child, childIndex) => {
        const isLastChild = childIndex === folder.children.length - 1;
        const childBranch = isLastChild ? "└──" : "├──";
        const [base, ext] = child.name.includes(".")
          ? [
              child.name.slice(0, child.name.lastIndexOf(".")),
              child.name.slice(child.name.lastIndexOf(".")),
            ]
          : [child.name, ""];

        lines.push(
          `<span class="pipe">${childPrefix}${childBranch}</span> <span class="file" role="button" tabindex="0" data-file="${child.file}">${base}<span class="ext">${ext}</span></span>`
        );
      });
    }
  });

  treeEl.innerHTML = lines.join("\n");
}

treeEl.addEventListener("click", (event) => {
  const folder = event.target.closest("[data-folder]");
  const file = event.target.closest("[data-file]");
  if (folder) toggleFolder(folder.dataset.folder);
  if (file) openFile(file.dataset.file);
});

treeEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const folder = event.target.closest("[data-folder]");
  const file = event.target.closest("[data-file]");
  if (!folder && !file) return;
  event.preventDefault();
  if (folder) toggleFolder(folder.dataset.folder);
  if (file) openFile(file.dataset.file);
});

viewerClose.addEventListener("click", closeViewer);
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) closeViewer();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeViewer();
});

document.querySelectorAll("[data-cmd]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const map = {
      about: "about/intro.txt",
      work: "work/engagements.txt",
      craft: "craft/principles.txt",
      contact: "correspondence/contact.txt",
    };
    const path = map[btn.dataset.cmd];
    if (path) openFile(path);
  });
});

function tickClock() {
  const now = new Date();
  clockEl.textContent = now
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

tickClock();
setInterval(tickClock, 30_000);
renderTree();
