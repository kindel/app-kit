(function () {
  "use strict";

  // Distinct company ids this browser has opened. Ids only: no name, no
  // email, and no cookie of our own. GA keeps whatever cookies it already set.
  var SET_KEY = "kld-company-set";
  var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var appViewed = false;

  function slugOk(value) {
    return typeof value === "string" && value.length <= 64 && SLUG.test(value);
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
    if (set.indexOf(company) === -1) {
      set.push(company);
      try {
        window.localStorage.setItem(SET_KEY, JSON.stringify(set));
      } catch (e) {}
    }
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
    if (name === "kld_company" && slugOk(clean.company)) {
      if (clean.previous_company != null && !slugOk(clean.previous_company)) {
        delete clean.previous_company;
      }
      if (clean.source !== "picker" && clean.source !== "url" && clean.source !== "link") {
        delete clean.source;
      }
      clean.kld_company_set_count = remember(clean.company);
    }
    if (typeof window.gtag !== "function") return;
    if (name === "app_view") appViewed = true;
    window.gtag("event", name, clean);
  }

  window.kldTrack = kldTrack;
})();
