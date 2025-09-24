/* public/app.js v20 (ASCII-only) */
(function(){
  "use strict";
  window.__PNP_READY__ = true;

  function onReady(fn){ if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true}); else fn(); }
  function norm(v){ return (v == null ? "" : String(v)).trim(); }
  function lower(v){ return norm(v).toLowerCase(); }
  function splitTokens(s){ var t = norm(s); if (!t) return []; return t.split(/[,/;|]/).map(function(x){ return x.trim(); }).filter(Boolean); }
  function uniq(arr){ var m = {}; return arr.filter(function(v){ var k = v.toLowerCase(); if (m[k]) return false; m[k]=1; return true; }); }
  function uniqSort(arr){ return uniq(arr).sort(function(a,b){ a=a.toLowerCase(); b=b.toLowerCase(); return a<b?-1:a>b?1:0; }); }

  var RESULTS, COUNT, FORM, CLEAR, PAGER, LOADING, LOADING_MSG;
  var PAGE_SIZE = 25;
  var currentPage = 1;
  var rows = [];
  var filtered = [];
  var fdLast = null;

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

  // Existing loading and utility functions...
  
  function setLoading(on, msg){
    if (!LOADING) return;
    if (on) { if (LOADING_MSG) LOADING_MSG.textContent = msg || "Loading..."; LOADING.hidden = false; }
    else { LOADING.hidden = true; }
  }

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

  // Existing functions for CSV loading, etc...

  // New function: live filter updates
  function fetchResults() {
    const formData = new FormData(FORM);
    const queryParams = new URLSearchParams(formData).toString();
    setLoading(true, "Applying filters...");

    fetch(`/search?${queryParams}`)
      .then(response => response.json())
      .then(data => {
        rows = data.results || [];
        filtered = rows; // Update filtered list
        render(filtered); // Render new results
        COUNT.textContent = `${data.count} games found`;
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching filtered results:', err);
        setLoading(false);
      });
  }

  // Add event listeners to the filter inputs for live updates
  function addLiveFilterListeners() {
    FORM.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('change', () => {
        clearTimeout(fdLast);
        fdLast = setTimeout(fetchResults, 500); // Wait 500ms after user stops typing
      });
    });
  }

  // Call addLiveFilterListeners on document ready
  onReady(function init(){
    RESULTS = document.getElementById("results");
    COUNT = document.getElementById("count");
    FORM = document.getElementById("filters");
    CLEAR = document.getElementById("clear");
    PAGER = document.getElementById("pager");
    LOADING = document.getElementById("loading");
    LOADING_MSG = document.getElementById("loading-msg");

    setLoading(true, "Loading games...");

    loadRows().then(function(data){
      rows = data;
      buildFacets(rows);
      currentPage = 1;
      draw();
      addLiveFilterListeners();  // Adding live filter functionality
    }).catch(function(e){
      console.error(e);
      setLoading(false);
    });

    if (CLEAR) {
      CLEAR.addEventListener("click", function(){ try { FORM.reset(); } catch(e){} currentPage = 1; draw(); });
    }
  });

  // Existing pagination and rendering functions...

})();
