// public/app.js
const RESULTS = document.getElementById("results");
const COUNT = document.getElementById("count");
const FORM = document.getElementById("filters");
const CLEAR = document.getElementById("clear");

// CSV header mapping: adjust ONLY if your sheet headers change.
// These keys match your provided CSV exactly.
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

function domainFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ""; }
}

// Parse "NUMBER OF PLAYERS" like "1-4", "1–4", "1+", "Solo", "2 to 5", etc.
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

// Parse PLAYTIME like "30-60", "45m", "90 minutes"
function parseMinutesBand(s) {
  const txt = lower(s);
  const nums = (txt.match(/\d+/g) || []).map(n => parseInt(n, 10));
  let m = null;
  if (nums.length >= 1) m = nums[0];
  if (m == null) return ""; // unknown
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

  // text search in title/designer/publisher
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

function render(list) {
  RESULTS.innerHTML = "";
  COUNT.textContent = `${list.length} game${list.length === 1 ? "" : "s"} found`;
  const frag = document.createDocumentFragment();

  list.forEach(item => {
    const li = document.createElement("li");
    li.className = "card";

    // Cover
    const cover = norm(item[F.image]);
    const img = document.createElement("img");
    img.className = "cover";
    img.alt = `${norm(item[F.title])} cover`;
    img.loading = "lazy";
    img.src = cover || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    li.appendChild(img);

    const body = document.createElement("div");
    body.className = "body";

    // Title
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = norm(item[F.title]) || "Untitled";
    body.appendChild(title);

    // Meta (players, time, price)
    const meta = document.createElement("div");
    meta.className = "meta";
    const { min: pmin, max: pmax } = parsePlayers(item[F.players]);
    const players = `${pmin ?? "?"}–${pmax ?? "?"}p`;
    let playDisplay = textOrDash(item[F.playtime]);
    const priceType = normalizePriceType(item[F.priceType]);
    meta.innerHTML = `<span>${players}</span><span>${playDisplay}</span><span>${priceType || "-"}</span>`;
    body.appendChild(meta);

    // Blurb
    const blurb = document.createElement("div");
    blurb.textContent = norm(item[F.shortDesc]).slice(0, 200);
    body.appendChild(blurb);

    // Chips (mechanisms, mode, complexity, category)
    const chips = document.createElement("div");
    chips.className = "chips";
    const mech1 = norm(item[F.mech1]); const mech2 = norm(item[F.mech2]);
    [mech1, mech2, norm(item[F.mode]), norm(item[F.complexity]), norm(item[F.category])]
      .filter(Boolean).slice(0,5).forEach(label => {
        const c = document.createElement("span");
        c.className = "chip"; c.textContent = label;
        chips.appendChild(c);
      });
    body.appendChild(chips);

    // Actions (download links)
    const actions = document.createElement("div");
    actions.className = "actions";
    const link1 = norm(item[F.link1]);
    const link2 = norm(item[F.link2]);

    if (link1) {
      const a1 = document.createElement("a");
      a1.className = "btn primary";
      a1.href = link1; a1.target = "_blank"; a1.rel = "noopener";
      a1.textContent = `Open on ${domainFromUrl(link1) || "Site"}`;
      actions.appendChild(a1);
    }
    if (link2) {
      const a2 = document.createElement("a");
      a2.className = "btn";
      a2.href = link2; a2.target = "_blank"; a2.rel = "noopener";
      a2.textContent = `Alt link (${domainFromUrl(link2) || "Site"})`;
      actions.appendChild(a2);
    }
    body.appendChild(actions);

    li.appendChild(body);
    frag.appendChild(li);
  });

  RESULTS.appendChild(frag);
}

async function load() {
  const res = await fetch("/api/games", { headers: { "cache-control": "no-cache" }});
  const csv = await res.text();
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  rows = parsed.data;
  filtered = rows;
  render(filtered);
}

FORM.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(FORM);
  filtered = rows.filter(r => matchesFilters(r, fd));
  render(filtered);
});

CLEAR.addEventListener("click", () => {
  FORM.reset();
  filtered = rows;
  render(filtered);
});

load();
