// public/game.js (fixed)
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

function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html != null) e.innerHTML = html;
  return e;
}

function renderDetail(item) {
  const wrap = document.getElementById("game");
  wrap.innerHTML = "";
  if (!item) {
    wrap.innerHTML = "<p>Game not found.</p>";
    return;
  }

  const left = el("div");
  const right = el("div");

  // Image
  const img = el("img", "cover");
  img.alt = `${norm(item[F.title])} cover`;
  img.loading = "lazy";
  img.src = norm(item[F.image]) || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  left.appendChild(img);

  // Title
  const h1 = el("h1", null, norm(item[F.title]) || "Untitled");

  // Meta row
  const { min: pmin, max: pmax } = parsePlayers(item[F.players]);
  const players = `${pmin ?? "?"}–${pmax ?? "?"}p`;
  const meta = el("div", "meta", `<span>${players}</span><span>${norm(item[F.playtime]) || "-"}</span><span>${normalizePriceType(item[F.priceType])}</span>`);

  // Byline
  const designer = norm(item[F.designer]) || "-";
  const publisher = norm(item[F.publisher]) || "-";
  const year = norm(item[F.year]) || "-";
  const byline = el("div", "meta", `<span>Designer: ${designer}</span><span>Publisher: ${publisher}</span><span>Year: ${year}</span>`);

  // Chips
  const chips = el("div", "chips");
  [norm(item[F.mech1]), norm(item[F.mech2]), norm(item[F.mode]), norm(item[F.complexity]), norm(item[F.category])]
    .filter(Boolean)
    .forEach(text => chips.appendChild(el("span", "chip", text)));

  // Descriptions
  const short = norm(item[F.shortDesc]);
  const long = norm(item[F.description]);
  const desc = el("div", "section", `${short ? `<p>${short}</p>` : ""}${long ? `<p>${long.replace(/\n/g, "<br/>")}</p>` : ""}`);

  // Build/Components
  const build = el("div", "section", `
    <h3>Build & Components</h3>
    <p><strong>Crafting Difficulty:</strong> ${norm(item[F.craftLevel]) || "-"}</p>
    <p><strong>Print Components:</strong> ${norm(item[F.printComponents]) || "-"}</p>
    <p><strong>Other Components:</strong> ${norm(item[F.otherComponents]) || "-"}</p>
    <p><strong>Languages:</strong> ${norm(item[F.languages]) || "-"}</p>
  `);

  // Theme
  const theme = el("div", "section", `<h3>Theme</h3><p>${norm(item[F.theme]) || "-"}</p>`);

  // Links
  const links = el("div", "actions");
  const link1 = norm(item[F.link1]);
  const link2 = norm(item[F.link2]);
  if (link1) {
    const a1 = el("a", "btn primary", `Open on ${domainFromUrl(link1) || "Site"}`);
    a1.href = link1; a1.target = "_blank"; a1.rel = "noopener";
    links.appendChild(a1);
  }
  if (link2) {
    const a2 = el("a", "btn", `Alt link (${domainFromUrl(link2) || "Site"})`);
    a2.href = link2; a2.target = "_blank"; a2.rel = "noopener";
    links.appendChild(a2);
  }

  // Assemble right column
  right.appendChild(h1);
  right.appendChild(meta);
  right.appendChild(byline);
  right.appendChild(chips);
  right.appendChild(desc);
  right.appendChild(build);
  right.appendChild(theme);
  right.appendChild(links);

  // Attach to page
  wrap.className = "detail";
  wrap.appendChild(left);
  wrap.appendChild(right);
}

async function load() {
  const slug = new URLSearchParams(location.search).get("slug");
  const elWrap = document.getElementById("game");
  if (!slug) {
    elWrap.innerHTML = "<p>Missing slug.</p>";
    return;
  }
  try {
    const res = await fetch("/api/games", { headers: { "cache-control": "no-cache" }});
    const csv = await res.text();
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    const rows = parsed.data;
    const row = rows.find(r => makeSlugForRow(r) === slug);
    renderDetail(row);
  } catch (e) {
    elWrap.innerHTML = "<p>Failed to load game.</p>";
    console.error(e);
  }
}

load();
