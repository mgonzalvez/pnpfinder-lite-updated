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

  const left = document.createElement("div");
  const right = document.createElement("div");

  const img = document.createElement("img");
  img.className = "cover";
  img.alt = `${norm(item[F.title])} cover`;
  img.loading = "lazy";
  img.src = norm(item[F.image]) || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  left.appendChild(img);

  const h1 = document.createElement("h1");
  h1.textContent = norm(item[F.title]) || "Untitled";

  const { min: pmin, max: pmax } = parsePlayers(item[F.players]);
  const players = `${pmin ?? "?"}–${pmax ?? "?"}p`;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<span>${players}</span><span>${norm(item[F.playtime]) || "-"}</span><span>${normalizePriceType(item[F.priceType])}</span><span>${norm(item[F.price]) || "-"}</span>`;

  const byline = document.createElement("div");
  byline.className = "meta";
  byline.innerHTML = [
    `Designer: ${norm(item[F.designer]) || "-"}`,
    `Publisher: ${norm(item[F.publisher]) || "-"}`,
    `Year: ${norm(item[F.year]) || "-"}`,
    `Age: ${norm(item[F.ageRange]) || "-"}`
  ].map(s => `<span>${s}</span>`).join("");

  const chips = document.createElement("div");
  chips.className = "chips";
  [norm(item[F.mech1]), norm(item[F.mech2]), norm(item[F.mode]), norm(item[F.complexity]), norm(item[F.category])]
    .filter(Boolean)
    .forEach(text => {
      const s = document.createElement("span");
      s.className = "chip";
      s.textContent = text;
      chips.appendChild(s);
    });

  const desc = document.createElement("div");
  desc.className = "section";
  const short = norm(item[F.shortDesc]);
  const long = norm(item[F.description]);
  desc.innerHTML = `${short ? `<p>${short}</p>` : ""}${long ? `<p>${long.replace(/\n/g, "<br/>")}</p>` : ""}`;

  const build = document.createElement("div");
  build.className = "section";
  build.innerHTML = `
    <h3>Build & Components</h3>
    <p><strong>Crafting Difficulty:</strong> ${norm(item[F.craftLevel]) || "-"}</p>
    <p><strong>Print Components:</strong> ${norm(item[F.printComponents]) || "-"}</p>
    <p><strong>Other Components:</strong> ${norm(item[F.otherComponents]) || "-"}</p>
  `;

  const misc = document.createElement("div");
  misc.className = "section";
  misc.innerHTML = `
    <h3>Theme & Languages</h3>
    <p><strong>Theme:</strong> ${norm(item[F.theme]) || "-"}</p>
    <p><strong>Languages:</strong> ${norm(item[F.languages]) || "-"}</p>
  `;

  const links = document.createElement("div");
  links.className = "actions";
  const link1 = norm(item[F.link1]);
  const link2 = norm(item[F.link2]);
  if (link1) {
    const a1 = document.createElement("a");
    a1.className = "btn primary";
    a1.href = link1; a1.target = "_blank"; a1.rel = "noopener";
    try { a1.textContent = `Open on ${new URL(link1).hostname.replace(/^www\./,'')}`; } catch { a1.textContent = "Open link"; }
    links.appendChild(a1);
  }
  if (link2) {
    const a2 = document.createElement("a");
    a2.className = "btn";
    a2.href = link2; a2.target = "_blank"; a2.rel = "noopener";
    try { a2.textContent = `Alt link (${new URL(link2).hostname.replace(/^www\./,'')})`; } catch { a2.textContent = "Alt link"; }
    links.appendChild(a2);
  }

  const admin = document.createElement("div");
  admin.className = "section";
  const curated = norm(item[F.curated]);
  const dead = norm(item[F.deadlink]);
  const dateAdded = norm(item[F.dateAdded]);
  const deadLinkHtml = dead && /^https?:\/\//i.test(dead) ? `<a href="${dead}" target="_blank" rel="noopener">Report a dead link</a>` : (dead || "-");
  admin.innerHTML = `
    <h3>Meta</h3>
    <p><strong>Curated lists:</strong> ${curated || "-"}</p>
    <p><strong>Report dead link:</strong> ${deadLinkHtml}</p>
    <p><strong>Date added:</strong> ${dateAdded || "-"}</p>
  `;

  const table = document.createElement("div");
  table.className = "section";
  const entries = Object.entries(item || {});
  const rows = entries.map(([k, v]) => {
    const val = (v ?? "").toString().trim();
    const htmlVal = /^https?:\/\//i.test(val) ? `<a href="${val}" target="_blank" rel="noopener">${val}</a>` : (val || "-");
    return `<tr><th>${k}</th><td>${htmlVal}</td></tr>`;
  }).join("");
  table.innerHTML = `<h3>Full details</h3><table class="kv">${rows}</table>`;

  right.appendChild(h1);
  right.appendChild(meta);
  right.appendChild(byline);
  right.appendChild(chips);
  right.appendChild(desc);
  right.appendChild(build);
  right.appendChild(misc);
  right.appendChild(links);
  right.appendChild(admin);
  right.appendChild(table);

  wrap.className = "detail";
  wrap.appendChild(left);
  wrap.appendChild(right);
}

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
