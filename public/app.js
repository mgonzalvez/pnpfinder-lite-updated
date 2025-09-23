/* public/app.js (ASCII-safe) */
(function(){
  "use strict";

// === Facet helpers ===
function splitTokens(s){
  var t = (s == null ? "" : String(s));
  if (!t) return [];
  return t.split(/[,/;|]/).map(function(x){ return x.trim(); }).filter(Boolean);
}
function uniqSort(arr){
  var m = {}; var out = [];
  arr.forEach(function(v){ var k = v.toLowerCase(); if (!m[k]) { m[k]=true; out.push(v); } });
  out.sort(function(a,b){ a=a.toLowerCase(); b=b.toLowerCase(); return a<b?-1:a>b?1:0; });
  return out;
}
function parseMinAge(s){
  var m = String(s||"").match(/\d+/); return m ? parseInt(m[0],10) : null;
}
function extractFacets(list){
  var mech = [], complexity = [], theme = [], lang = [], years = [], craft = [], curated = [];
  list.forEach(function(r){
    var v;
    v = r[F.mech1]; if (v) mech.push(v);
    v = r[F.complexity]; if (v) complexity.push(v);
    v = r[F.theme]; if (v) theme = theme.concat(splitTokens(v));
    v = r[F.languages]; if (v) lang = lang.concat(splitTokens(v));
    v = r[F.year]; if (v) years.push(String(v));
    v = r[F.craftLevel]; if (v) craft.push(v);
    v = r[F.curated]; if (v) curated = curated.concat(splitTokens(v));
  });
  return {
    mech: uniqSort(mech),
    complexity: uniqSort(complexity),
    theme: uniqSort(theme),
    lang: uniqSort(lang),
    years: uniqSort(years).sort(function(a,b){ return parseInt(b,10)-parseInt(a,10); }),
    craft: uniqSort(craft),
    curated: uniqSort(curated)
  };
}
function fillSelect(id, values, anyLabel){
  var sel = document.getElementById(id); if (!sel) return;
  var keep = sel.value;
  sel.innerHTML = "";
  var opt0 = document.createElement("option"); opt0.value = ""; opt0.textContent = anyLabel || "Any";
  sel.appendChild(opt0);
  values.forEach(function(v){
    var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o);
  });
  if (keep) sel.value = keep;
}

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


  // Global beacon so index fallback knows we started
  window.__PNP_READY__ = true;

  // Error beacons: show a readable message on page
  function showFatal(msg) {
    try {
      var box = document.createElement("div");
      box.style.background = "#241b1b";
      box.style.border = "1px solid #5c2e2e";
      box.style.color = "#f3d9d9";
      box.style.padding = "12px";
      box.style.borderRadius = "10px";
      box.style.margin = "10px 0";
      box.textContent = msg;
      (document.getElementById("count") || document.body).prepend(box);
    } catch (_) {}
  }
  window.addEventListener("error", function(e){ showFatal("Runtime error: " + (e.message || "Unknown")); });
  window.addEventListener("unhandledrejection", function(e){ showFatal("Promise error: " + (e.reason && (e.reason.message || e.reason.toString()) || "Unknown")); });

  function onReady(fn){
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  onReady(function init(){
    var RESULTS = document.getElementById("results");
    var COUNT = document.getElementById("count");
    var FORM = document.getElementById("filters");
    var CLEAR = document.getElementById("clear");
    var PAGER = document.getElementById("pager");

    var LOADING = document.getElementById("loading");
    var LOADING_MSG = document.getElementById("loading-msg");
    var loadingCount = 0;
    function setLoading(on, msg){
      if (!LOADING) return;
      if (on) {
        loadingCount++;
        if (LOADING_MSG) LOADING_MSG.textContent = msg || "Loading...";
        LOADING.hidden = false;
      } else {
        loadingCount = Math.max(0, loadingCount - 1);
        if (loadingCount === 0) LOADING.hidden = true;
      }
    }

    var PAGE_SIZE = 25;
    var currentPage = 1;
    var rows = [];
    var filtered = [];
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

    function norm(v){ return (v == null ? "" : String(v)).trim(); }
    function lower(v){ return norm(v).toLowerCase(); }
    function textOrDash(v){ var s = norm(v); return s ? s : "-"; }

    function slugify(s){
      var base = lower(s).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      return base || "untitled";
    }
    function domainFromUrl(u){ try { return new URL(u).hostname.replace(/^www\./,""); } catch(_) { return ""; } }

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
    function parseMinutesBand(s){
      var txt = lower(s);
      var nums = (txt.match(/\d+/g) || []).map(function(n){ return parseInt(n,10); });
      var m = nums.length ? nums[0] : null;
      if (m == null) return "";
      if (m <= 30) return "short";
      if (m <= 60) return "medium";
      return "long";
    }
    function normalizePriceType(s){
      var t = lower(s);
      if (t.indexOf("free") !== -1) return "free";
      if (t.indexOf("name") !== -1 || t.indexOf("pay what") !== -1) return "name your price";
      if (t) return "paid";
      return "";
    }

    function matchesFilters(item, fd){
      var q = lower(fd.get("q"));
      var price = lower(fd.get("price"));
      var players = lower(fd.get("players"));
      var playtime = lower(fd.get("playtime"));
      var mech = lower(fd.get("mechanism"));
      var theme = lower(fd.get("theme"));
      var mode = lower(fd.get("mode"));

      var title = lower(item[F.title]);
      var designer = lower(item[F.designer]);
      var publisher = lower(item[F.publisher]);
      var mechanisms = [lower(item[F.mech1]), lower(item[F.mech2])].filter(Boolean).join(", ");
      var priceVal = normalizePriceType(item[F.priceType]);
      var p = parsePlayers(item[F.players]);
      var band = parseMinutesBand(item[F.playtime]);
      var themeVal = lower(item[F.theme]);
      var modeVal = lower(item[F.mode]);

      if (q && !(title.indexOf(q) !== -1 || designer.indexOf(q) !== -1 || publisher.indexOf(q) !== -1)) return false;
      if (price && priceVal !== price) return false;

      if (players) {
        var n = parseInt(players,10);
        if (!isNaN(n)) {
          if (p.min && n < p.min) return false;
          if (p.max && n > p.max) return false;
        }
      }
      if (playtime && band && band !== playtime) return false;
      if (mech && mechanisms.indexOf(mech) === -1) return false;
      if (theme && !(themeVal && themeVal.indexOf(theme) !== -1)) return false;
      if (mode && !(modeVal && modeVal.indexOf(mode) !== -1)) return false;

      return true;
    }

    function paginate(list, page, pageSize){
      var total = list.length;
      var pages = Math.max(1, Math.ceil(total / pageSize));
      var p = Math.min(Math.max(1, page), pages);
      var start = (p - 1) * pageSize;
      var end = Math.min(start + pageSize, total);
      return { slice: list.slice(start, end), page: p, pages: pages, start: start + 1, end: end };
    }

    function renderPager(page, pages){
      PAGER.innerHTML = "";
      if (pages <= 1) return;
      function makeBtn(label, targetPage, disabled, active){
        var a = document.createElement("a");
        a.href = "#";
        a.textContent = label;
        if (active) a.className = "active";
        if (disabled) a.classList.add("disabled");
        a.addEventListener("click", function(e){
          e.preventDefault();
          if (disabled || targetPage === page) return;
          currentPage = targetPage;
          draw();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        return a;
      }
      PAGER.appendChild(makeBtn("<<", page - 1, page === 1, false));

      var windowSize = 7;
      var start = Math.max(1, page - Math.floor(windowSize/2));
      var end = Math.min(pages, start + windowSize - 1);
      if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

      if (start > 1) PAGER.appendChild(makeBtn("1", 1, false, page===1));
      if (start > 2) { var d1 = document.createElement("span"); d1.textContent = "..."; d1.style.padding = ".45rem .5rem"; d1.style.opacity = .7; PAGER.appendChild(d1); }
      for (var i = start; i <= end; i++) PAGER.appendChild(makeBtn(String(i), i, false, i===page));
      if (end < pages - 1) { var d2 = document.createElement("span"); d2.textContent = "..."; d2.style.padding = ".45rem .5rem"; d2.style.opacity = .7; PAGER.appendChild(d2); }
      if (end < pages) PAGER.appendChild(makeBtn(String(pages), pages, false, page===pages));

      PAGER.appendChild(makeBtn(">>", page + 1, page === pages, false));
    }

    function render(list){
      var p = paginate(list, currentPage, PAGE_SIZE);
      RESULTS.innerHTML = "";
      COUNT.textContent = "Showing " + p.start + " - " + p.end + " of " + list.length + " game" + (list.length === 1 ? "" : "s");
      var frag = document.createDocumentFragment();

      p.slice.forEach(function(item){
        var li = document.createElement("li");
        li.className = "card";

        var a = document.createElement("a");
        var slug = slugify((item[F.title] || "") + "-" + (item[F.publisher] || "") + "-" + (item[F.year] || ""));
        a.href = "/game.html?slug=" + encodeURIComponent(slug);
        a.className = "card-link";

        var cover = norm(item[F.image]);
        var img = document.createElement("img");
        img.className = "cover";
        img.alt = (norm(item[F.title]) || "Game") + " cover";
        img.loading = "lazy";
        img.src = cover || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
        a.appendChild(img);

        var body = document.createElement("div");
        body.className = "body";

        var title = document.createElement("div");
        title.className = "title";
        title.textContent = norm(item[F.title]) || "Untitled";
        body.appendChild(title);

        var meta = document.createElement("div");
        meta.className = "meta";
        var pinfo = parsePlayers(item[F.players]);
        var players = (pinfo.min == null ? "?" : pinfo.min) + "-" + (pinfo.max == null ? "?" : pinfo.max) + "p";
        var priceType = normalizePriceType(item[F.priceType]) || "-";
        var playDisplay = textOrDash(item[F.playtime]);
        meta.innerHTML = "<span>" + players + "</span><span>" + playDisplay + "</span><span>" + priceType + "</span>";
        body.appendChild(meta);

        var blurb = document.createElement("div");
        blurb.className = "blurb";
        blurb.textContent = (norm(item[F.shortDesc]) || "").slice(0, 120);
        body.appendChild(blurb);

        a.appendChild(body);
        li.appendChild(a);

        var actions = document.createElement("div");
        actions.className = "actions";
        var link1 = norm(item[F.link1]);
        if (link1) {
          var a1 = document.createElement("a");
          a1.className = "btn primary";
          a1.href = link1; a1.target = "_blank"; a1.rel = "noopener";
          try { a1.textContent = "Open on " + domainFromUrl(link1); } catch(_){ a1.textContent = "Open link"; }
          actions.appendChild(a1);
        }
        li.appendChild(actions);

        frag.appendChild(li);
      });

      RESULTS.appendChild(frag);
      renderPager(p.page, p.pages);
    }

    function draw(){
      var list = rows.slice();
      if (FORM) {
        var fd = new FormData(FORM);
        list = list.filter(function(r){ return matchesFilters(r, fd); });
      }
      filtered = list;
      render(filtered);
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
          var parsed = Papa.parse(csv, { header: true, skipEmptyLines: true }); return parsed.data || [];
        }).catch(function(apiErr){
          return loadConfig().then(function(cfg){
            if (cfg && cfg.directCSV) {
              return fetchCsv(cfg.directCSV).then(function(csv){
                var parsed = Papa.parse(csv, { header: true, skipEmptyLines: true }); return parsed.data || [];
              });
            }
            throw apiErr;
          });
        });
      });
    }

    function initData(){
      setLoading(true, "Loading games...");
      var cacheKey = "pnp_rows_v1";
      var usedCache = false;
      Promise.resolve().then(function(){
        var cached = null;
        try { cached = sessionStorage.getItem(cacheKey); } catch(_){}
        if (cached) {
          try { rows = JSON.parse(cached) || []; usedCache = true; } catch(_){ rows = []; }
        }
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          return loadRows().then(function(data){
            rows = data;
            try { sessionStorage.setItem(cacheKey, JSON.stringify(rows)); } catch(_){}
          });
        }
      }).then(function(){
        draw();
        if (usedCache) {
          return loadRows().then(function(fresh){
            var freshStr = JSON.stringify(fresh || []);
            var cacheStr = JSON.stringify(rows || []);
            if (freshStr !== cacheStr) {
              rows = fresh;
              try { sessionStorage.setItem(cacheKey, freshStr); } catch(_){}
              draw();
            }
          }).catch(function(err){ console.warn("Background refresh failed:", err); });
        }
      }).catch(function(e){
        console.error(e);
        showFatal("Failed to load games. " + (e && e.message || e));
      }).finally(function(){
        setLoading(false);
      });
    }

    if (FORM) {
      FORM.addEventListener("submit", function(e){
        e.preventDefault();
        currentPage = 1;
        draw();
      });
    }
    if (CLEAR) {
      CLEAR.addEventListener("click", function(){
        try { FORM.reset(); } catch(_){}
        currentPage = 1;
        draw();
      });
    }
    if (RESULTS) {
      RESULTS.addEventListener("click", function(e){
        var a = e.target.closest && e.target.closest("a.card-link");
        if (a) setLoading(true, "Opening game...");
      });
    }

    // Start
    initData();
  });
})();
