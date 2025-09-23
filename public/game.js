// public/game.js

const LOADING = document.getElementById("loading");
const LOADING_MSG = document.getElementById("loading-msg");
let loadingCount = 0;
function setLoading(on, msg = "Loading…") {
  if (!LOADING) return;
  if (on) {
    loadingCount++;
    LOADING_MSG && (LOADING_MSG.textContent = msg);
    LOADING.hidden = false;
  } else {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) LOADING.hidden = true;
  }
}
 (robust)
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
function buildSlug(row){
  return slugify(`${row[F.title]}-${row[F.publisher] || ""}-${row[F.year] || ""}`);
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
function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html != null) e.innerHTML = html;
  return e;
}

function renderDetail(item, debugNote) {
  const wrap = document.getElementById("game");
  wrap.innerHTML = "";
  if (!item) {
    wrap.innerHTML = `<p>Game not found.</p>${debugNote ? `<pre style="opacity:.6;white-space:pre-wrap">${debugNote}</pre>` : ""}`;
    return;
  }

  const left = el("div");
  const right = el("div");

  const img = el("img", "cover");
  img.alt = `${norm(item[F.title])} cover`;
  img.loading = "lazy";
  img.src = norm(item[F.image]) || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  left.appendChild(img);

  const h1 = el("h1", null, norm(item[F.title]) || "Untitled");

  const { min: pmin, max: pmax } = parsePlayers(item[F.players]);
  const players = `${pmin ?? "?"}–${pmax ?? "?"}p`;
  const meta = el("div", "meta", `<span>${players}</span><span>${norm(item[F.playtime]) || "-"}</span><span>${normalizePriceType(item[F.priceType])}</span><span>${norm(item[F.price]) || "-"}</span>`);

  const byline = el("div", "meta", [
    `Designer: ${norm(item[F.designer]) || "-"}`,
    `Publisher: ${norm(item[F.publisher]) || "-"}`,
    `Year: ${norm(item[F.year]) || "-"}`,
    `Age: ${norm(item[F.ageRange]) || "-"}`
  ].map(s => `<span>${s}</span>`).join(""));

  const chips = el("div", "chips");
  [norm(item[F.mech1]), norm(item[F.mech2]), norm(item[F.mode]), norm(item[F.complexity]), norm(item[F.category])]
    .filter(Boolean)
    .forEach(text => chips.appendChild(el("span", "chip", text)));

  const desc = el("div", "section",
    `${norm(item[F.shortDesc]) ? `<p>${norm(item[F.shortDesc])}</p>` : ""}` +
    `${norm(item[F.description]) ? `<p>${norm(item[F.description]).replace(/\n/g, "<br/>")}</p>` : ""}`
  );

  const build = el("div", "section", `
    <h3>Build & Components</h3>
    <p><strong>Crafting Difficulty:</strong> ${norm(item[F.craftLevel]) || "-"}</p>
    <p><strong>Print Components:</strong> ${norm(item[F.printComponents]) || "-"}</p>
    <p><strong>Other Components:</strong> ${norm(item[F.otherComponents]) || "-"}</p>
  `);

  const misc = el("div", "section", `
    <h3>Theme & Languages</h3>
    <p><strong>Theme:</strong> ${norm(item[F.theme]) || "-"}</p>
    <p><strong>Languages:</strong> ${norm(item[F.languages]) || "-"}</p>
  `);

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

  const admin = el("div", "section", `
    <h3>Meta</h3>
    <p><strong>Curated lists:</strong> ${norm(item[F.curated]) || "-"}</p>
    <p><strong>Report dead link:</strong> ${
      (function(){
        const val = norm(item[F.deadlink]);
        return /^https?:\/\//i.test(val) ? `<a href="${val}" target="_blank" rel="noopener">Report a dead link</a>` : (val || "-");
      })()
    }</p>
    <p><strong>Date added:</strong> ${norm(item[F.dateAdded]) || "-"}</p>
  `);

  const table = el("div", "section");
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

async function load() {
  setLoading(true, "Loading game…");
  const cacheKey = "pnp_rows_v1";

  const elWrap = document.getElementById("game");
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) { elWrap.innerHTML = "<p>Missing slug.</p>"; return; }

  try {
    let rows;
    try { const cached = sessionStorage.getItem(cacheKey); if (cached) rows = JSON.parse(cached); } catch {}
    if (!rows) {
      const res = await fetch("/api/games", { headers: { "cache-control": "no-cache" }});
      if (!res.ok) throw new Error("API error " + res.status);
      const csv = await res.text();
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      rows = (parsed.data || []).filter(r => r && Object.values(r).some(v => (v ?? "").toString().trim() !== ""));
      try { sessionStorage.setItem(cacheKey, JSON.stringify(rows)); } catch {}
    }

    // Primary match: exact slug
    let row = rows.find(r => buildSlug(r) === slug);

    // Fallback 1: decode and compare
    if (!row) {
      const s = decodeURIComponent(slug);
      row = rows.find(r => buildSlug(r) === s);
    }

    // Fallback 2: match on title if publisher/year missing
    if (!row) {
      const target = lower(slug.replace(/-/g, " "));
      row = rows.find(r => lower(r[F.title]).includes(target));
    }

    if (!row) {
      renderDetail(null, `No row matched slug: ${slug}`);
      return;
    }

    renderDetail(row);
  } catch (e) {
    console.error(e);
    elWrap.innerHTML = "<p>Failed to load game.</p>";
  } finally { setLoading(false); }
}

// faster Back link
const back = document.querySelector('a.back');
if (back) back.addEventListener('click', (e) => { e.preventDefault(); setLoading(true, "Returning…"); if (history.length > 1) { history.back(); } else { location.href = "/"; } });

load();
