// public/app.js
const RESULTS = document.getElementById("results");
const COUNT = document.getElementById("count");
const FORM = document.getElementById("filters");
const CLEAR = document.getElementById("clear");
const PAGER = document.getElementById("pager");

const PAGE_SIZE = 25;
let currentPage = 1;

const F = {
  title: "GAME TITLE",
  designer: "DESIGNER",
  publisher: "PUBLISHER",
  priceType: "FREE OR PAID",
  price: "PRICE",
  players: "NUMBER OF PLAYERS",
  playtime: "PLAYTIME",
  ageRange: "AGE RANGE",
  theme: "THEME",
  mech1: "MAIN MECHANISM",
  mech2: "SECONDARY MECHANISM",
  complexity: "GAMEPLAY COMPLEXITY",
  mode: "GAMEPLAY MODE",
  category: "GAME CATEGORY",
  craftLevel: "PNP CRAFTING CHALLENGE LEVEL",
  shortDesc: "ONE-SENTENCE SHORT DESCRIPTION",
  description: "GAME DESCRIPTION",
  link1: "DOWNLOAD LINK",
  link2: "SECONDARY DOWNLOAD LINK",
  printComponents: "PRINT COMPONENTS",
  otherComponents: "OTHER COMPONENTS",
  languages: "LANGUAGES",
  year: "RELEASE YEAR",
  image: "IMAGE",
  curated: "CURATED LISTS",
  deadlink: "REPORT DEAD LINK",
  dateAdded: "DATE ADDED",
};

let rows = [];
let filtered = [];

function norm(v) { return (v ?? "").toString().trim(); }
function lower(v) { return norm(v).toLowerCase(); }

function slugify(s) {
  const base = norm(s).toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "untitled";
}

function domainFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ""; }
}

function parsePlayers(s) {
  const txt = lower(s);
  if (!txt) return { min: null, max: null };
  if (txt.includes("solo")) return { min: 1, max: parseInt((txt.match(/\d+/)||[])[0]) || 1 };
  const nums = (txt.match(/\d+/g) || []).map(n => parseInt(n, 10));
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) {
    if (txt.includes("+")) return { min: nums[0], max: null };
    return { min: nums[0], max: nums[0] };
  }
  return { min: null, max: null };
}

function parseMinutesBand(s) {
  const txt = lower(s);
  const nums = (txt.match(/\d+/g) || []).map(n => parseInt(n, 10));
  let m = null;
  if (nums.length >= 1) m = nums[0];
  if (m == null) return "";
  if (m <= 30) return "short";
  if (m <= 60) return "medium";
  return "long";
}

function normalizePriceType(s) {
  const t = lower(s);
  if (t.includes("free")) return "free";
  if (t.includes("name") || t.includes("pay what")) return "name your price";
  if (t) return "paid";
  return "";
}

function matchesFilters(item, fd) {
  const q = lower(fd.get("q"));
  const price = lower(fd.get("price"));
  const players = lower(fd.get("players"));
  const playtime = lower(fd.get("playtime"));
  const mech = lower(fd.get("mechanism"));
  const theme = lower(fd.get("theme"));
  const mode = lower(fd.get("mode"));

  const title = lower(item[F.title]);
  const designer = lower(item[F.designer]);
  const publisher = lower(item[F.publisher]);
  const mechanisms = [lower(item[F.mech1]), lower(item[F.mech2])].filter(Boolean).join(", ");
  const priceVal = normalizePriceType(item[F.priceType]);
  const { min: pmin, max: pmax } = parsePlayers(item[F.players]);
  const band = parseMinutesBand(item[F.playtime]);
  const themeVal = lower(item[F.theme]);
  const modeVal = lower(item[F.mode]);

  if (q && !(title.includes(q) || designer.includes(q) || publisher.includes(q))) return false;
  if (price && priceVal !== price) return false;

  if (players) {
    const n = parseInt(players, 10);
    if (!Number.isNaN(n)) {
      if (pmin && n < pmin) return false;
      if (pmax && n > pmax) return false;
    }
  }

  if (playtime && band && band !== playtime) return false;
  if (mech && !mechanisms.includes(mech)) return false;
  if (theme && !(themeVal && themeVal.includes(theme))) return false;
  if (mode && !(modeVal && modeVal.includes(mode))) return false;

  return true;
}

function textOrDash(v){ const s = norm(v); return s ? s : "-"; }

function paginate(list, page, pageSize) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  return { slice: list.slice(start, end), page: p, pages, start: start + 1, end };
}

function renderPager(page, pages) {
  PAGER.innerHTML = "";
  if (pages <= 1) return;

  const makeBtn = (label, targetPage, disabled=false, active=false) => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = label;
    a.className = active ? "active" : "";
    if (disabled) a.classList.add("disabled");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (disabled || targetPage === page) return;
      currentPage = targetPage;
      draw();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return a;
  };

  PAGER.appendChild(makeBtn("«", page - 1, page === 1));

  const windowSize = 7;
  let start = Math.max(1, page - Math.floor(windowSize/2));
  let end = Math.min(pages, start + windowSize - 1);
  if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

  if (start > 1) PAGER.appendChild(makeBtn("1", 1, false, page===1));
  if (start > 2) {
    const dots = document.createElement("span"); dots.textContent = "…"; dots.style.padding = ".45rem .5rem"; dots.style.opacity = .7;
    PAGER.appendChild(dots);
  }

  for (let i = start; i <= end; i++) {
    PAGER.appendChild(makeBtn(String(i), i, false, i === page));
  }

  if (end < pages - 1) {
    const dots = document.createElement("span"); dots.textContent = "…"; dots.style.padding = ".45rem .5rem"; dots.style.opacity = .7;
    PAGER.appendChild(dots);
  }
  if (end < pages) PAGER.appendChild(makeBtn(String(pages), pages, false, page===pages));

  PAGER.appendChild(makeBtn("»", page + 1, page === pages));
}

function render(list) {
  const { slice, page, pages, start, end } = paginate(list, currentPage, PAGE_SIZE);
  RESULTS.innerHTML = "";
  COUNT.textContent = `Showing ${start}–${end} of ${list.length} game${list.length === 1 ? "" : "s"}`;
  const frag = document.createDocumentFragment();

  slice.forEach(item => {
    const li = document.createElement("li");
    li.className = "card";

    const link = document.createElement("a");
    const slug = slugify(`${item[F.title]}-${item[F.publisher] || ""}-${item[F.year] || ""}`);
    link.href = `/game.html?slug=${encodeURIComponent(slug)}`;
    link.className = "card-link";

    const cover = norm(item[F.image]);
    const img = document.createElement("img");
    img.className = "cover";
    img.alt = `${norm(item[F.title])} cover`;
    img.loading = "lazy";
    img.src = cover || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    link.appendChild(img);

    const body = document.createElement("div");
    body.className = "body";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = norm(item[F.title]) || "Untitled";
    body.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "meta";
    const { min: pmin, max: pmax } = parsePlayers(item[F.players]);
    const players = `${pmin ?? "?"}–${pmax ?? "?"}p`;
    const priceType = normalizePriceType(item[F.priceType]);
    let playDisplay = textOrDash(item[F.playtime]);
    meta.innerHTML = `<span>${players}</span><span>${playDisplay}</span><span>${priceType || "-"}</span>`;
    body.appendChild(meta);

    const blurb = document.createElement("div");
    blurb.className = "blurb";
    blurb.textContent = norm(item[F.shortDesc]).slice(0, 120);
    body.appendChild(blurb);

    link.appendChild(body);
    li.appendChild(link);
    frag.appendChild(li);
  });

  RESULTS.appendChild(frag);
  renderPager(page, pages);
}

let fdLast = null;

function draw() {
  const list = fdLast ? rows.filter(r => matchesFilters(r, fdLast)) : rows.slice();
  filtered = list;
  render(filtered);
}

async function load() {
  const res = await fetch("/api/games", { headers: { "cache-control": "no-cache" }});
  const csv = await res.text();
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  rows = parsed.data;
  fdLast = new FormData(FORM);
  currentPage = 1;
  draw();
}

FORM.addEventListener("submit", (e) => {
  e.preventDefault();
  fdLast = new FormData(FORM);
  currentPage = 1;
  draw();
});

CLEAR.addEventListener("click", () => {
  FORM.reset();
  fdLast = new FormData(FORM);
  currentPage = 1;
  draw();
});

load();
