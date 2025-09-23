/* public/game.js (ASCII-safe) */
(function(){
  "use strict";
// --- Fallback config loader (reads /config.json for direct CSV URL) ---
function loadConfig(){
  return fetch("/config.json", { cache: "no-store" })
    .then(function(r){ if (!r.ok) throw new Error("no config"); return r.json(); })
    .catch(function(){ return { directCSV: "" }; });
}
function fetchCsv(url){
  return fetch(url, { headers: { "cache-control": "no-cache" }}).then(function(res){
    if (!res.ok) { var e = new Error("HTTP " + res.status); e.status = res.status; throw e; }
    return res.text();
  });
}


  function norm(v){ return (v == null ? "" : String(v)).trim(); }
  function lower(v){ return norm(v).toLowerCase(); }
  function el(tag, className, html){
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function setLoading(on, msg){
    var overlay = document.getElementById("loading");
    var msgEl = document.getElementById("loading-msg");
    if (!overlay) return;
    if (on) {
      if (msgEl) msgEl.textContent = msg || "Loading game...";
      overlay.hidden = false;
    } else {
      overlay.hidden = true;
    }
  }
  function showFatal(msg){
    try {
      var box = document.createElement("div");
      box.style.background = "#241b1b";
      box.style.border = "1px solid #5c2e2e";
      box.style.color = "#f3d9d9";
      box.style.padding = "12px";
      box.style.borderRadius = "10px";
      box.style.margin = "10px 0";
      box.textContent = msg;
      (document.getElementById("game") || document.body).prepend(box);
    } catch(_) {}
  }

  var F = {
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
    dateAdded: "DATE ADDED"
  };

  function slugify(s){
    var base = lower(s).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return base || "untitled";
  }
  function buildSlug(row){
    return slugify((row[F.title] || "") + "-" + (row[F.publisher] || "") + "-" + (row[F.year] || ""));
  }
  function parsePlayers(s){
    var txt = lower(s);
    if (!txt) return {min:null,max:null};
    if (txt.indexOf("solo") !== -1) return {min:1, max: (parseInt((txt.match(/\d+/)||[])[0],10) || 1)};
    var nums = (txt.match(/\d+/g) || []).map(function(n){ return parseInt(n,10); });
    if (nums.length >= 2) return {min:nums[0], max:nums[1]};
    if (nums.length === 1) {
      if (txt.indexOf("+") !== -1) return {min:nums[0], max:null};
      return {min:nums[0], max:nums[0]};
    }
    return {min:null,max:null};
  }
  function normalizePriceType(s){
    var t = lower(s);
    if (t.indexOf("free") !== -1) return "Free";
    if (t.indexOf("name") !== -1 || t.indexOf("pay what") !== -1) return "Name Your Price";
    if (t) return "Paid";
    return "-";
  }
  function domainFromUrl(url){
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch(_){ return ""; }
  }

  function renderDetail(item, debugNote){
    var wrap = document.getElementById("game");
    wrap.innerHTML = "";
    if (!item) {
      wrap.innerHTML = "<p>Game not found.</p>" + (debugNote ? "<pre style=\"opacity:.6;white-space:pre-wrap\">" + debugNote + "</pre>" : "");
      return;
    }

    var left = el("div");
    var right = el("div");

    var img = el("img", "cover");
    img.alt = (norm(item[F.title]) || "Game") + " cover";
    img.loading = "lazy";
    img.src = norm(item[F.image]) || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    left.appendChild(img);

    var h1 = el("h1", "", norm(item[F.title]) || "Untitled");

    var pinfo = parsePlayers(item[F.players]);
    var players = (pinfo.min == null ? "?" : pinfo.min) + "-" + (pinfo.max == null ? "?" : pinfo.max) + "p";
    var meta = el("div", "meta", "<span>" + players + "</span><span>" + (norm(item[F.playtime]) || "-") + "</span><span>" + normalizePriceType(item[F.priceType]) + "</span><span>" + (norm(item[F.price]) || "-") + "</span>");

    var byline = el("div", "meta", [
      "Designer: " + (norm(item[F.designer]) || "-"),
      "Publisher: " + (norm(item[F.publisher]) || "-"),
      "Year: " + (norm(item[F.year]) || "-"),
      "Age: " + (norm(item[F.ageRange]) || "-")
    ].map(function(s){ return "<span>" + s + "</span>"; }).join(""));

    var chips = el("div", "chips");
    [norm(item[F.mech1]), norm(item[F.mech2]), norm(item[F.mode]), norm(item[F.complexity]), norm(item[F.category])]
      .filter(function(x){ return !!x; })
      .forEach(function(text){ chips.appendChild(el("span", "chip", text)); });

    var desc = el("div", "section",
      (norm(item[F.shortDesc]) ? "<p>" + norm(item[F.shortDesc]) + "</p>" : "") +
      (norm(item[F.description]) ? "<p>" + norm(item[F.description]).replace(/\n/g, "<br/>") + "</p>" : "")
    );

    var build = el("div", "section",
      "<h3>Build & Components</h3>" +
      "<p><strong>Crafting Difficulty:</strong> " + (norm(item[F.craftLevel]) || "-") + "</p>" +
      "<p><strong>Print Components:</strong> " + (norm(item[F.printComponents]) || "-") + "</p>" +
      "<p><strong>Other Components:</strong> " + (norm(item[F.otherComponents]) || "-") + "</p>"
    );

    var misc = el("div", "section",
      "<h3>Theme & Languages</h3>" +
      "<p><strong>Theme:</strong> " + (norm(item[F.theme]) || "-") + "</p>" +
      "<p><strong>Languages:</strong> " + (norm(item[F.languages]) || "-") + "</p>"
    );

    var links = el("div", "actions");
    var link1 = norm(item[F.link1]);
    var link2 = norm(item[F.link2]);
    if (link1) {
      var a1 = el("a", "btn primary", "Open on " + (domainFromUrl(link1) || "Site"));
      a1.href = link1; a1.target = "_blank"; a1.rel = "noopener";
      links.appendChild(a1);
    }
    if (link2) {
      var a2 = el("a", "btn", "Alt link (" + (domainFromUrl(link2) || "Site") + ")");
      a2.href = link2; a2.target = "_blank"; a2.rel = "noopener";
      links.appendChild(a2);
    }

    var admin = el("div", "section",
      "<h3>Meta</h3>" +
      "<p><strong>Curated lists:</strong> " + (norm(item[F.curated]) || "-") + "</p>" +
      "<p><strong>Report dead link:</strong> " + (function(){ var val = norm(item[F.deadlink]); return /^https?:\/\//i.test(val) ? "<a href=\"" + val + "\" target=\"_blank\" rel=\"noopener\">Report a dead link</a>" : (val || "-"); })() + "</p>" +
      "<p><strong>Date added:</strong> " + (norm(item[F.dateAdded]) || "-") + "</p>"
    );

    var table = el("div", "section");
    var entries = Object.entries(item || {});
    var rowsHtml = entries.map(function(kv){
      var k = kv[0], v = kv[1];
      var val = norm(v);
      var htmlVal = /^https?:\/\//i.test(val) ? "<a href=\"" + val + "\" target=\"_blank\" rel=\"noopener\">" + val + "</a>" : (val || "-");
      return "<tr><th>" + k + "</th><td>" + htmlVal + "</td></tr>";
    }).join("");
    table.innerHTML = "<h3>Full details</h3><table class=\"kv\">" + rowsHtml + "</table>";

    var wrapEl = document.getElementById("game");
    wrapEl.className = "detail";
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

    wrapEl.appendChild(left);
    wrapEl.appendChild(right);
  }

  function ensurePapa(){
    return new Promise(function(resolve, reject){
      if (window.Papa) return resolve(window.Papa);
      setTimeout(function(){
        if (window.Papa) resolve(window.Papa);
        else {
          var s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";
          s.async = true;
          s.onload = function(){ resolve(window.Papa); };
          s.onerror = function(){ reject(new Error("Failed to load PapaParse")); };
          document.head.appendChild(s);
        }
      }, 0);
    });
  }

  function loadRows(){
    return ensurePapa().then(function(Papa){
      return fetchCsv("/api/games").then(function(csv){
        var parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        return (parsed.data || []).filter(function(r){ return r && Object.values(r).some(function(v){ return (v != null && String(v).trim() !== ""); }); });
      }).catch(function(apiErr){
        return loadConfig().then(function(cfg){
          if (cfg && cfg.directCSV) {
            return fetchCsv(cfg.directCSV).then(function(csv){
              var parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
              return (parsed.data || []).filter(function(r){ return r && Object.values(r).some(function(v){ return (v != null && String(v).trim() !== ""); }); });
            });
          }
          throw apiErr;
        });
      });
    });
  }

  function start(){
    setLoading(true, "Loading game...");
    var elWrap = document.getElementById("game");
    var params = new URLSearchParams(location.search);
    var slug = params.get("slug");
    if (!slug) { elWrap.innerHTML = "<p>Missing slug.</p>"; setLoading(false); return; }

    var cacheKey = "pnp_rows_v1";
    var rows = null;
    try { var cached = sessionStorage.getItem(cacheKey); if (cached) rows = JSON.parse(cached); } catch(_){}

    function findAndRender(rowsList){
      var row = null;
      if (rowsList && rowsList.length) {
        row = rowsList.find(function(r){ return buildSlug(r) === slug; });
        if (!row) {
          try {
            var s = decodeURIComponent(slug);
            row = rowsList.find(function(r){ return buildSlug(r) === s; });
          } catch(_){}
        }
        if (!row) {
          var target = lower(slug.replace(/-/g, " "));
          row = rowsList.find(function(r){ return r && r[F.title] && r[F.title].toLowerCase().indexOf(target) !== -1; });
        }
      }
      if (!row) renderDetail(null, "No row matched slug: " + slug);
      else renderDetail(row);
      setLoading(false);
    }

    if (rows && Array.isArray(rows) && rows.length) {
      findAndRender(rows);
      loadRows().then(function(fresh){
        try { sessionStorage.setItem(cacheKey, JSON.stringify(fresh)); } catch(_){}
      }).catch(function(err){ console.warn("Background refresh failed:", err); });
    } else {
      loadRows().then(function(fresh){
        rows = fresh;
        try { sessionStorage.setItem(cacheKey, JSON.stringify(rows)); } catch(_){}
        findAndRender(rows);
      }).catch(function(e){
        console.error(e);
        showFatal("Failed to load game. " + (e && e.message || e));
        setLoading(false);
      });
    }
  }

  function onReady(fn){
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  onReady(start);
})();
