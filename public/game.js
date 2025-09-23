// public/game.js
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

function norm(v){ return (v ?? "").toString().trim(); }
function lower(v){ return norm(v).toLowerCase(); }

function slugify(s) {
  const base = norm(s).toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "untitled";
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

function normalizePriceType(s) {
  const t = lower(s);
  if (t.includes("free")) return "Free";
  if (t.includes("name") || t.includes("pay what")) return "Name Your Price";
  if (t) return "Paid";
  return "-";
}

function domainFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ""; }
}

function makeSlugForRow(row) {
  return slugify(`${row[F.title]}-${row[F.publisher] || ""}-${row[F.year] || ""}`);
}

function renderDetail(item) {
  const el = document.getElementById("game");
  if (!item) {
    el.innerHTML = "<p>Game not found.</p>";
    return;
  }

  const { min: pmin, max: pmax } = parsePlayers(item[F.players]);
  const players = `${pmin ?? "?"}–${pmax ?? "?"}p`;
  const priceType = normalizePriceType(item[F.priceType]);
  const cover = norm(item[F.image]);
  const mech1 = norm(item[F.mech1]);
  const mech2 = norm(item[F.mech2]);
  const chips = [mech1, mech2, norm(item[F.mode]), norm(item[F.complexity]), norm(item[F.category])].filter(Boolean);
  const link1 = norm(item[F.link1]);
  const link2 = norm(item[F.link2]);
  const pub = norm(item[F.publisher]);
  const year = norm(item[F.year]);

  el.innerHTML = "";
  const left = document.createElement("div");
  const right = document.createElement("div");

  const img = document.createElement("img");
  img.className = "cover";
  img.alt = `${norm(item[F.title])} cover`;
  img.loading = "lazy";
  img.src = cover || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  left.appendChild(img);

  const h1 = document.createElement("h1");
  h1.textContent = norm(item[F.title]) || "Untitled";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<span>${players}</span><span>${norm(item[F.playtime]) || "-"}</span><span>${priceType}</span>`;

  const byline = document.createElement("div");
  byline.className = "meta";
  const designer = norm(item[F.designer]);
  byline.innerHTML = `<span>Designer: ${designer || "-"}</span><span>Publisher: ${pub || "-"}</span><span>Year: ${year || "-"}</span>`;

  const chipsEl = document.createElement("div");
  chipsEl.className = "chips";
  chips.forEach(c => {
    const s = document.createElement("span");
    s.className = "chip";
    s.textContent = c;
    chipsEl.appendChild(s);
  });

  const desc = document.createElement("div");
  desc.className = "section";
  const short = norm(item[F.shortDesc]);
  const long = norm(item[F.description]);
  desc.innerHTML = `<p>${short}</p>${long ? `<p>${long.replace(/\n/g, "<br/>")}</p>` : ""}`;

  const build = document.createElement("div");
  build.className = "section";
  build.innerHTML = `<h3>Build & Components</h3>
<p><strong>Crafting Difficulty:</strong> ${norm(item[F.craftLevel]) || "-"}</p>
<p><strong>Print Components:</strong> ${norm(item[F.printComponents]) || "-"}</p>
<p><strong>Other Components:</strong> ${norm(item[F.otherComponents]) || "-"}</p>
<p><strong>Languages:</strong> ${norm(item[F.languages]) || "-"}</p>`;

  const theme = document.createElement("div");
  theme.className = "section";
  theme.innerHTML = `<h3>Theme</h3><p>${norm(item[F.theme]) || "-"}</p>`;

  const links = document.createElement("div");
  links.className = "actions";
  if (link1) {
    const a1 = document.createElement("a");
    a1.className = "btn primary";
    a1.href = link1; a1.target = "_blank"; a1.rel = "noopener";
    a1.textContent = `Open on ${domainFromUrl(link1) || "Site"}`;
    links.appendChild(a1);
  }
  if (link2) {
    const a2 = document.createElement("a");
    a2.className = "btn";
    a2.href = link2; a2.target = "_blank"; a2.rel = "noopener";
    a2.textContent = `Alt link (${domainFromUrl(link2) || "Site"})`;
    links.appendChild(a2);
  }

  const wrap = document.getElementById("game");
  wrap.className = "detail";
  wrap.appendChild(left);
  wrap.appendChild(right);
}

async function load() {
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) {
    document.getElementById("game").innerHTML = "<p>Missing slug.</p>";
    return;
  }
  const res = await fetch("/api/games", { headers: { "cache-control": "no-cache" }});
  const csv = await res.text();
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  function makeSlugForRow(row) {
    return slugify(`${row[F.title]}-${row[F.publisher] || ""}-${row[F.year] || ""}`);
  }

  const row = rows.find(r => makeSlugForRow(r) === slug);
  renderDetail(row);
}

load();
