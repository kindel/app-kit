(function () {
  "use strict";

  // Distinct company ids this browser has opened. Ids only: no name, no
  // email, and no cookie of our own. GA keeps whatever cookies it already set.
  var SET_KEY = "kld-company-set";
  var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  // Apps whose page path names them, for pages that do not pass `app`.
  var KNOWN_APPS = ["porridge", "biq", "facet"];
  var appViewed = false;
  var script = typeof document !== "undefined" && document ? document.currentScript : null;

  function slugOk(value) {
    return typeof value === "string" && value.length <= 64 && SLUG.test(value);
  }

  // Turn whatever a page hands us into a company or app id, or "".
  // Handles a JSON-encoded string ("\"amazon\""), stray quotes, case, and
  // spaces. Anything that is still not a slug becomes "", so it is not sent.
  function toId(value) {
    if (typeof value !== "string") return "";
    var v = value.trim();
    for (var i = 0; i < 3 && v.length >= 2; i++) {
      var first = v.charAt(0);
      var last = v.charAt(v.length - 1);
      if ((first === '"' || first === "'") && last === first) {
        v = v.slice(1, -1).trim();
      } else {
        break;
      }
    }
    v = v.toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return slugOk(v) ? v : "";
  }

  function attr(el, name) {
    try {
      return el && el.getAttribute ? el.getAttribute(name) || "" : "";
    } catch (e) {
      return "";
    }
  }

  // The app id for a page that did not pass one: the script tag's data-app,
  // <html data-kld-app>, <meta name="kld-app">, then the page path.
  function pageApp() {
    var id = toId(attr(script, "data-app"));
    if (id) return id;
    try {
      if (typeof document !== "undefined" && document) {
        id = toId(attr(document.documentElement, "data-kld-app"));
        if (id) return id;
        if (document.querySelector) {
          id = toId(attr(document.querySelector('meta[name="kld-app"]'), "content"));
          if (id) return id;
        }
      }
    } catch (e) {}
    try {
      var parts = String(window.location.pathname || "").toLowerCase().split("/");
      for (var i = 0; i < parts.length; i++) {
        if (KNOWN_APPS.indexOf(parts[i]) !== -1) return parts[i];
      }
    } catch (e) {}
    return "";
  }

  function readSet() {
    try {
      var raw = window.localStorage.getItem(SET_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var out = [];
      for (var i = 0; i < parsed.length; i++) {
        if (slugOk(parsed[i]) && out.indexOf(parsed[i]) === -1) out.push(parsed[i]);
      }
      return out;
    } catch (e) {
      return [];
    }
  }

  function remember(company) {
    var set = readSet();
    if (set.indexOf(company) === -1) set.push(company);
    // A repeat still rewrites. Otherwise junk next to a known id stays forever.
    try {
      var next = JSON.stringify(set);
      if (window.localStorage.getItem(SET_KEY) !== next) {
        window.localStorage.setItem(SET_KEY, next);
      }
    } catch (e) {}
    return set.length;
  }

  function kldTrack(name, params) {
    if (typeof name !== "string" || !name) return;
    if (name === "app_view" && appViewed) return;
    var src = params && typeof params === "object" ? params : {};
    var clean = {};
    Object.keys(src).forEach(function (key) {
      var value = src[key];
      if (value == null || value === "") return;
      clean[key] = value;
    });
    if (name === "app_view" || name === "kld_company") {
      var app = toId(clean.app) || pageApp();
      if (app) clean.app = app;
      else delete clean.app;
    }
    if (name === "kld_company") {
      var company = toId(clean.company);
      // No company, no event. A blank or junk company is noise in GA.
      if (!company) return;
      clean.company = company;
      var previous = toId(clean.previous_company);
      if (previous && previous !== company) clean.previous_company = previous;
      else delete clean.previous_company;
      if (clean.source !== "picker" && clean.source !== "url" && clean.source !== "link") {
        delete clean.source;
      }
      clean.kld_company_set_count = remember(company);
    }
    if (typeof window.gtag !== "function") return;
    if (name === "app_view") appViewed = true;
    window.gtag("event", name, clean);
  }

  window.kldTrack = kldTrack;
  window.kldCompanyId = toId;
})();
