/* public/app.js v21 (ASCII-only)
   Enhancements:
   1) Auto-apply filters on change and live-search input (debounced).
   2) Remember filters between visits (localStorage).
   3) Shareable filtered URLs (read from and update the querystring).
*/
(function(){
  "use strict";
  window.__PNP_READY__ = true;

  // ---------- small helpers ----------
  function onReady(fn){ if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true}); else fn(); }
  function norm(v){ return (v == null ? "" : String(v)).trim(); }
  function lower(v){ return norm(v).toLowerCase(); }
  function splitTokens(s){ var t = norm(s); if (!t) return []; return t.split(/[,/;|]/).map(function(x){ return x.trim(); }).filter(Boolean); }
  function uniq(arr){ var m = {}; return arr.filter(function(v){ var k = v.toLowerCase(); if (m[k]) return false; m[k]=1; return true; }); }
  function uniqSort(arr){ return uniq(arr).sort(function(a,b){ a=a.toLowerCase(); b=b.toLowerCase(); return a<b?-1:a>b?1:0; }); }
  function debounce(fn, ms){ var t; return function(){ var ctx=this, args=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(ctx,args); }, ms||0); }; }

  // ---------- DOM refs & state ----------
  var RESULTS, COUNT, FORM, CLEAR, PAGER, LOADING, LOADING_MSG;
  var PAGE_SIZE = 25;
  var currentPage = 1;
  var rows = [];
  var filtered = [];
  var fdLast = null;

  // ---------- CSV column map (must match your CSV headers) ----------
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
    year: "Release Year" in ({}).constructor ? "RELEASE YEAR" : "RELEASE YEAR", // keep as exact string
    image: "IMAGE",
    curated: "CURATED LISTS",
    deadlink: "REPORT DEAD LINK",
    dateAdded: "DATE ADDED"
  };

  // ---------- UX helpers ----------
  function setLoading(on, msg){
    if (!LOADING) return;
    if (on) { if (LOADING_MSG) LOADING_MSG.textContent = msg || "Loading..."; LOADING.hidden = false; }
    else { LOADING.hidden = true; }
  }
  function domainFromUrl(u){ try { return new URL(u).hostname.replace(/^www\./,""); } catch(e){ return ""; } }
  function parsePlayers(s){
    var txt = lower(s);
    if (!txt) return {min:null,max:null};
    if (txt.indexOf("solo") !== -1) return {min:1, max: (parseInt((txt.match(/\d+/)||[])[0],10) || 1)};
    var nums = (txt.match(/\d+/g) || []).map(function(n){ return parseInt(n,10); });
    if (nums.length >= 2) return {min:nums[0], max:nums[1]};
    if (nums.length === 1) { if (txt.indexOf("+") !== -1) return {min:nums[0], max:null}; return {min:nums[0], max:nums[0]}; }
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

  // ---------- CSV loading ----------
  function ensurePapa(){
    return new Promise(function(resolve, reject){
      if (window.Papa) return resolve(window.Papa);
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";
      s.async = true;
      s.onload = function(){ resolve(window.Papa); };
      s.onerror = function(){ reject(new Error("Failed to load PapaParse")); };
      document.head.appendChild(s);
    });
  }
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
  function loadRows(){
    return ensurePapa().then(function(Papa){
      return fetchCsv("/api/games").then(function(csv){
        var parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        return parsed.data || [];
      }).catch(function(apiErr){
        return loadConfig().then(function(cfg){
          if (cfg && cfg.directCSV) {
            return fetchCsv(cfg.directCSV).then(function(csv){
              var parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
              return parsed.data || [];
            });
          }
          throw apiErr;
        });
      });
    });
  }

  // ---------- Facets ----------
  function extractFacets(list){
    var mech = [], complexity = [], theme = [], lang = [], years = [], craft = [], curated = [];
    list.forEach(function(r){
      var v;
      v = r[F.mech1]; if (v) mech.push(norm(v));
      v = r[F.complexity]; if (v) complexity.push(norm(v));
      v = r[F.theme]; if (v) theme = theme.concat(splitTokens(v));
      v = r[F.languages]; if (v) lang = lang.concat(splitTokens(v));
      v = r[F.year]; if (v) years.push(String(v));
      v = r[F.craftLevel]; if (v) craft.push(norm(v));
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
    values.forEach(function(v){ var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
    if (keep) sel.value = keep;
  }
  function buildFacets(list){
    var f = extractFacets(list);
    fillSelect("mech", f.mech, "Any mechanism");
    fillSelect("complexity", f.complexity, "Any complexity");
    fillSelect("themeSel", f.theme, "Any theme");
    fillSelect("lang", f.lang, "Any language");
    fillSelect("year", f.years, "Any year");
    fillSelect("craft", f.craft, "Any crafting difficulty");
    fillSelect("curated", f.curated, "Any curated list");
  }

  // ---------- Filter & URL state ----------
  function matchesFilters(item, fd){
    var q = lower(fd.get("q"));
    var price = lower(fd.get("price"));
    var players = lower(fd.get("players"));
    var playtime = lower(fd.get("playtime"));
    var mechSel = lower(fd.get("mech"));
    var complexitySel = lower(fd.get("complexity"));
    var themeSel = lower(fd.get("themeSel"));
    var langSel = lower(fd.get("lang"));
    var yearSel = lower(fd.get("year"));
    var craft = lower(fd.get("craft"));
    var curatedSel = lower(fd.get("curated"));
    var ageMinSel = fd.get("ageMin");

    var title = lower(item[F.title]);
    var designer = lower(item[F.designer]);
    var publisher = lower(item[F.publisher]);
    if (q && !(title.indexOf(q) !== -1 || designer.indexOf(q) !== -1 || publisher.indexOf(q) !== -1)) return false;

    var priceVal = normalizePriceType(item[F.priceType]);
    if (price && priceVal !== price) return false;

    if (players) {
      var n = parseInt(players,10);
      var p = parsePlayers(item[F.players]);
      if (!isNaN(n)) {
        if (p.min && n < p.min) return false;
        if (p.max && n > p.max) return false;
      }
    }

    var band = parseMinutesBand(item[F.playtime]);
    if (playtime && band && band !== playtime) return false;

    if (mechSel && lower(item[F.mech1]) !== mechSel) return false;
    if (complexitySel && lower(item[F.complexity]) !== complexitySel) return false;

    if (themeSel) {
      var themes = splitTokens(item[F.theme]).map(function(s){ return s.toLowerCase(); });
      if (themes.indexOf(themeSel) === -1) return false;
    }
    if (langSel) {
      var langs = splitTokens(item[F.languages]).map(function(s){ return s.toLowerCase(); });
      if (langs.indexOf(langSel) === -1) return false;
    }
    if (yearSel && lower(String(item[F.year])) !== yearSel) return false;

    if (craft && lower(item[F.craftLevel]) !== craft) return false;

    if (curatedSel) {
      var cur = splitTokens(item[F.curated]).map(function(s){ return s.toLowerCase(); });
      if (cur.indexOf(curatedSel) === -1) return false;
    }
    if (ageMinSel) {
      var want = parseInt(ageMinSel,10);
      var haveM = String(item[F.ageRange] || "").match(/\d+/);
      var have = haveM ? parseInt(haveM[0],10) : null;
      if (have != null && want != null && have > want) return false;
    }
    return true;
  }

  function formToObject(){
    var fd = new FormData(FORM), obj = {};
    fd.forEach(function(v,k){ obj[k] = v; });
    return obj;
  }
  function formToQuery(){
    var obj = formToObject();
    var params = new URLSearchParams();
    Object.keys(obj).forEach(function(k){
      var v = obj[k];
      if (v) params.set(k, v);
    });
    return params.toString();
  }
  function applyFromQuery(){
    var qs = new URLSearchParams(location.search);
    qs.forEach(function(v,k){ var el = document.getElementById(k); if (el) el.value = v; });
  }
  function restoreSavedFilters(){
    try {
      var saved = localStorage.getItem("pnp_filters_v1");
      if (!saved) return;
      var obj = JSON.parse(saved);
      Object.keys(obj).forEach(function(k){
        var el = document.getElementById(k);
        if (el) el.value = obj[k];
      });
    } catch(e){}
  }
  function saveFilters(){
    try {
      var obj = formToObject();
      localStorage.setItem("pnp_filters_v1", JSON.stringify(obj));
    } catch(e){}
  }

  // ---------- Pagination & render ----------
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
    function btn(label, tp, disabled, active){
      var a = document.createElement("a");
      a.href = "#"; a.textContent = label;
      if (active) a.className = "active";
      if (disabled) a.classList.add("disabled");
      a.addEventListener("click", function(e){ e.preventDefault(); if (disabled || tp === page) return; currentPage = tp; draw(); window.scrollTo({top:0,behavior:"smooth"}); });
      return a;
    }
    PAGER.appendChild(btn("<<", page - 1, page === 1, false));
    var windowSize = 7;
    var s = Math.max(1, page - Math.floor(windowSize/2));
    var e = Math.min(pages, s + windowSize - 1);
    if (e - s + 1 < windowSize) s = Math.max(1, e - windowSize + 1);
    if (s > 1) PAGER.appendChild(btn("1", 1, false, page===1));
    if (s > 2) { var d1 = document.createElement("span"); d1.textContent = "..."; d1.style.padding = ".45rem .5rem"; d1.style.opacity = .7; PAGER.appendChild(d1); }
    for (var i = s; i <= e; i++) PAGER.appendChild(btn(String(i), i, false, i===page));
    if (e < pages - 1) { var d2 = document.createElement("span"); d2.textContent = "..."; d2.style.padding = ".45rem .5rem"; d2.style.opacity = .7; PAGER.appendChild(d2); }
    if (e < pages) PAGER.appendChild(btn(String(pages), pages, false, page===pages));
    PAGER.appendChild(btn(">>", page + 1, page === pages, false));
  }
  function slugify(s){ var base = lower(s).replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); return base || "untitled"; }

  function render(list){
    var p = paginate(list, currentPage, PAGE_SIZE);
    RESULTS.innerHTML = "";
    COUNT.textContent = "Showing " + p.start + " - " + p.end + " of " + list.length + " games";
    var frag = document.createDocumentFragment();
    p.slice.forEach(function(item){
      var li = document.createElement("li"); li.className = "card";
      var a = document.createElement("a"); a.className = "card-link";
      var slug = slugify((item[F.title] || "") + "-" + (item[F.publisher] || "") + "-" + (item[F.year] || ""));
      a.href = "/game.html?slug=" + encodeURIComponent(slug);

      var img = document.createElement("img"); img.className="cover"; img.alt=(norm(item[F.title])||"Game")+" cover"; img.loading="lazy"; img.src = norm(item[F.image]) || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      a.appendChild(img);

      var body = document.createElement("div"); body.className="body";
      var title = document.createElement("div"); title.className="title"; title.textContent = norm(item[F.title]) || "Untitled"; body.appendChild(title);
      var meta = document.createElement("div"); meta.className="meta";
      var pinfo = parsePlayers(item[F.players]); var players = (pinfo.min==null?"?":pinfo.min) + "-" + (pinfo.max==null?"?":pinfo.max) + "p";
      var playDisplay = norm(item[F.playtime]) || "-"; var priceType = normalizePriceType(item[F.priceType]) || "-";
      meta.innerHTML = "<span>" + players + "</span><span>" + playDisplay + "</span><span>" + priceType + "</span>";
      body.appendChild(meta);
      var blurb = document.createElement("div"); blurb.className = "blurb"; blurb.textContent = (norm(item[F.shortDesc]) || "").slice(0, 120);
      body.appendChild(blurb);
      a.appendChild(body);
      li.appendChild(a);

      var actions = document.createElement("div"); actions.className="actions";
      var link1 = norm(item[F.link1]); if (link1) { var a1 = document.createElement("a"); a1.className="btn primary"; a1.href=link1; a1.target="_blank"; a1.rel="noopener"; a1.textContent = "Open on " + (domainFromUrl(link1) || "site"); actions.appendChild(a1); }
      li.appendChild(actions);
      frag.appendChild(li);
    });
    RESULTS.appendChild(frag);
    renderPager(p.page, p.pages);
  }

  function draw(){
    // filter
    var list = rows.slice();
    fdLast = new FormData(FORM);
    list = list.filter(function(r){ return matchesFilters(r, fdLast); });

    // sort
    var sortSel = fdLast.get("sort") || "relevance";
    if (sortSel === "newest") {
      list.sort(function(a,b){ var da = new Date(a[F.dateAdded]||0).getTime(); var db = new Date(b[F.dateAdded]||0).getTime(); return db-da; });
    } else if (sortSel === "title") {
      list.sort(function(a,b){ var ta=(a[F.title]||"").toLowerCase(); var tb=(b[F.title]||"").toLowerCase(); return ta<tb?-1:ta>tb?1:0; });
    } else if (sortSel === "year") {
      list.sort(function(a,b){ var ya=parseInt(a[F.year]||"0",10); var yb=parseInt(b[F.year]||"0",10); return (yb-ya)||0; });
    }

    filtered = list;
    render(filtered);

    // save filters and update shareable URL
    saveFilters();
    var q = formToQuery();
    var url = q ? ("?"+q) : location.pathname;
    try { history.replaceState(null, "", url); } catch(e){}
  }

  // ---------- boot ----------
  onReady(function init(){
    RESULTS = document.getElementById("results");
    COUNT = document.getElementById("count");
    FORM = document.getElementById("filters");
    CLEAR = document.getElementById("clear");
    PAGER = document.getElementById("pager");
    LOADING = document.getElementById("loading");
    LOADING_MSG = document.getElementById("loading-msg");

    // Restore saved filters first, then allow URL to override
    restoreSavedFilters();
    applyFromQuery();

    setLoading(true, "Loading games...");
    var cacheKey = "pnp_rows_v1";
    var usedCache = false;
    try { var cached = sessionStorage.getItem(cacheKey); if (cached) { rows = JSON.parse(cached) || []; usedCache = rows && rows.length > 0; } } catch(e){}

    (rows && rows.length ? Promise.resolve(rows) : loadRows().then(function(data){ rows = data; try { sessionStorage.setItem(cacheKey, JSON.stringify(rows)); } catch(e){}; return rows; }))
      .then(function(){
        buildFacets(rows);      // fills dropdowns, preserves current control values
        currentPage = 1;
        draw();                 // first render

        // background refresh if we started from cache
        if (usedCache) {
          loadRows().then(function(fresh){
            var freshStr = JSON.stringify(fresh||[]);
            var cacheStr = JSON.stringify(rows||[]);
            if (freshStr !== cacheStr) {
              rows = fresh;
              try { sessionStorage.setItem(cacheKey, freshStr); } catch(e){}
              buildFacets(rows);
              draw();
            }
          }).catch(function(err){ console.warn("Background refresh failed:", err); });
        }
      })
      .catch(function(e){
        console.error(e);
        var box = document.createElement("div"); box.style.background="#241b1b"; box.style.border="1px solid #5c2e2e"; box.style.color="#f3d9d9"; box.style.padding="12px"; box.style.borderRadius="10px"; box.style.margin="10px 0"; box.textContent="Failed to load games. " + (e && e.message || e); (COUNT||document.body).prepend(box);
      })
      .finally(function(){ setLoading(false); });

    if (FORM) {
      FORM.addEventListener("submit", function(e){ e.preventDefault(); currentPage = 1; draw(); });
      // Auto-apply on any dropdown change
      FORM.addEventListener("change", function(e){ if (!e.target) return; currentPage = 1; draw(); });
      // Live-search with debounce
      var q = document.getElementById("q");
      if (q) q.addEventListener("input", debounce(function(){ currentPage = 1; draw(); }, 200));
    }
    if (CLEAR) {
      CLEAR.addEventListener("click", function(){ try { FORM.reset(); } catch(e){} currentPage = 1; draw(); });
    }
  });
})();
