"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "analytics.js"), "utf8");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (source.includes("document.cookie") || source.includes(".cookie")) {
  fail("analytics.js must not touch cookies");
}

function storage(initial) {
  const data = Object.assign({}, initial || {});
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    data: data
  };
}

function load(gtag, store) {
  const sandbox = {
    gtag: gtag,
    localStorage: store || storage()
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "analytics.js" });
  return sandbox;
}

function saved(store) {
  const raw = store.data["kld-company-set"];
  if (!raw) return [];
  return JSON.parse(raw);
}

// No gtag: do not throw, and still remember the company id for the next event.
{
  const store = storage();
  const sandbox = load(undefined, store);
  sandbox.kldTrack("kld_company", { app: "biq", company: "generic", source: "url" });
  sandbox.kldTrack("app_view", { app: "biq" });
  if (JSON.stringify(saved(store)) !== JSON.stringify(["generic"])) {
    fail("missing gtag should still store the company id, got " + JSON.stringify(saved(store)));
  }
}

// Empty params are omitted. Zero stays. A later gtag sees the earlier company.
{
  const calls = [];
  const store = storage({ "kld-company-set": JSON.stringify(["generic"]) });
  const sandbox = load(function () { calls.push([].slice.call(arguments)); }, store);
  sandbox.kldTrack("custom", { kept: 0, empty: "", missing: null, also: undefined, name: "nope" });
  const params = calls[0][2];
  if (calls[0][0] !== "event" || calls[0][1] !== "custom") fail("custom event was not sent");
  if (params.kept !== 0 || "empty" in params || "missing" in params || "also" in params) {
    fail("empty params were not dropped: " + JSON.stringify(params));
  }
  sandbox.kldTrack("kld_company", {
    app: "porridge",
    company: "blue-origin",
    previous_company: "",
    source: "picker",
    note: null
  });
  const company = calls[1][2];
  if (calls[1][1] !== "kld_company") fail("kld_company was not sent");
  if (company.company !== "blue-origin" || company.previous_company || company.note) {
    fail("kld_company params drifted: " + JSON.stringify(company));
  }
  if (company.kld_company_set_count !== 2 || company.app !== "porridge" || company.source !== "picker") {
    fail("set count or source drifted: " + JSON.stringify(company));
  }
  if (JSON.stringify(saved(store)) !== JSON.stringify(["generic", "blue-origin"])) {
    fail("storage should be company ids only, got " + JSON.stringify(saved(store)));
  }
}

// The same company does not grow the set. A bad source is omitted.
{
  const calls = [];
  const store = storage({ "kld-company-set": JSON.stringify(["generic", "blue-origin"]) });
  const sandbox = load(function () { calls.push([].slice.call(arguments)); }, store);
  sandbox.kldTrack("kld_company", {
    app: "facet",
    company: "generic",
    previous_company: "a@b.c",
    source: "dropdown"
  });
  const params = calls[0][2];
  if (params.kld_company_set_count !== 2) fail("repeat company changed the count: " + params.kld_company_set_count);
  if ("previous_company" in params || "source" in params) {
    fail("invalid previous company or source was sent: " + JSON.stringify(params));
  }
  if (JSON.stringify(saved(store)) !== JSON.stringify(["generic", "blue-origin"])) {
    fail("storage changed on a repeat: " + JSON.stringify(saved(store)));
  }
}

// app_view fires once per load. Junk already in the key is not kept.
{
  const calls = [];
  const store = storage({ "kld-company-set": JSON.stringify(["generic", "a@b.c", 3, "blue-origin"]) });
  const sandbox = load(function () { calls.push([].slice.call(arguments)); }, store);
  sandbox.kldTrack("app_view", { app: "facet" });
  sandbox.kldTrack("app_view", { app: "biq" });
  if (calls.length !== 1 || calls[0][1] !== "app_view" || calls[0][2].app !== "facet") {
    fail("app_view should fire once, got " + JSON.stringify(calls));
  }
  sandbox.kldTrack("kld_company", { app: "facet", company: "amazon", previous_company: "generic", source: "url" });
  if (calls[1][2].kld_company_set_count !== 3) fail("junk ids were counted: " + calls[1][2].kld_company_set_count);
  if (JSON.stringify(saved(store)) !== JSON.stringify(["generic", "blue-origin", "amazon"])) {
    fail("storage kept a non-id: " + JSON.stringify(saved(store)));
  }
  if (calls[1][2].previous_company !== "generic" || calls[1][2].source !== "url") {
    fail("url source was not kept: " + JSON.stringify(calls[1][2]));
  }
}

// Repeating a company that is already stored still drops junk beside it.
{
  const calls = [];
  const store = storage({ "kld-company-set": JSON.stringify(["generic", "a@b.c", "generic"]) });
  const sandbox = load(function () { calls.push([].slice.call(arguments)); }, store);
  sandbox.kldTrack("kld_company", { app: "biq", company: "generic", source: "url" });
  if (calls[0][2].kld_company_set_count !== 1) {
    fail("dirty repeat counted junk: " + calls[0][2].kld_company_set_count);
  }
  if (JSON.stringify(saved(store)) !== JSON.stringify(["generic"])) {
    fail("dirty set was not rewritten on a repeat: " + JSON.stringify(saved(store)));
  }
}

// link is a real source. A display name is normalized to its id.
{
  const calls = [];
  const store = storage();
  const sandbox = load(function () { calls.push([].slice.call(arguments)); }, store);
  sandbox.kldTrack("kld_company", { app: "biq", company: "Blue Origin", source: "link" });
  if (calls[0][2].company !== "blue-origin" || calls[0][2].kld_company_set_count !== 1) {
    fail("display name was not normalized: " + JSON.stringify(calls[0][2]));
  }
  sandbox.kldTrack("kld_company", { app: "biq", company: "dawn", previous_company: "amazon", source: "link" });
  if (calls[1][2].source !== "link" || calls[1][2].kld_company_set_count !== 2) {
    fail("link source failed: " + JSON.stringify(calls[1][2]));
  }
}

// A JSON-encoded or quoted company is unwrapped, never sent with quote marks.
{
  const calls = [];
  const store = storage();
  const sandbox = load(function () { calls.push([].slice.call(arguments)); }, store);
  sandbox.kldTrack("kld_company", { app: "porridge", company: JSON.stringify("amazon"), source: "url" });
  sandbox.kldTrack("kld_company", { app: "porridge", company: " 'Blue-Origin' ", previous_company: "\"amazon\"", source: "picker" });
  if (calls[0][2].company !== "amazon") fail("quoted company was sent raw: " + JSON.stringify(calls[0][2]));
  if (calls[1][2].company !== "blue-origin" || calls[1][2].previous_company !== "amazon") {
    fail("quoted ids were not cleaned: " + JSON.stringify(calls[1][2]));
  }
  if (JSON.stringify(saved(store)) !== JSON.stringify(["amazon", "blue-origin"])) {
    fail("quoted id was stored: " + JSON.stringify(saved(store)));
  }
}

// A blank or junk company sends nothing and stores nothing.
{
  const calls = [];
  const store = storage();
  const sandbox = load(function () { calls.push([].slice.call(arguments)); }, store);
  ["", "  ", "\"\"", null, undefined, "a@b.c", 7].forEach(function (company) {
    sandbox.kldTrack("kld_company", { app: "biq", company: company, source: "url" });
  });
  sandbox.kldTrack("kld_company", { app: "biq", source: "url" });
  if (calls.length) fail("blank company was sent: " + JSON.stringify(calls));
  if (saved(store).length) fail("blank company was stored: " + JSON.stringify(saved(store)));
}

// A missing app comes from the script tag, the page, or the path.
function loadPage(opts) {
  const calls = [];
  const attrs = opts.attrs || {};
  const sandbox = {
    gtag: function () { calls.push([].slice.call(arguments)); },
    localStorage: storage(),
    location: { pathname: opts.path || "/" },
    document: {
      currentScript: { getAttribute: (n) => (opts.script || {})[n] || null },
      documentElement: { getAttribute: (n) => attrs[n] || null },
      querySelector: (sel) => (opts.meta && sel === 'meta[name="kld-app"]'
        ? { getAttribute: (n) => (n === "content" ? opts.meta : null) }
        : null)
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "analytics.js" });
  return { sandbox, calls };
}

{
  const cases = [
    [{ script: { "data-app": "facet" }, path: "/kld/apps/biq/" }, "facet"],
    [{ attrs: { "data-kld-app": "BIQ" } }, "biq"],
    [{ meta: "porridge" }, "porridge"],
    [{ path: "/kld/apps/biq/examples/" }, "biq"],
    [{ path: "/facet/index.html" }, "facet"],
    [{ path: "/kld/apps/porridge/amazon/" }, "porridge"]
  ];
  cases.forEach(function (c) {
    const page = loadPage(c[0]);
    page.sandbox.kldTrack("app_view", {});
    page.sandbox.kldTrack("kld_company", { company: "generic", source: "url" });
    if (page.calls[0][2].app !== c[1] || page.calls[1][2].app !== c[1]) {
      fail("app was not derived for " + JSON.stringify(c[0]) + ": " + JSON.stringify(page.calls));
    }
  });
  // A passed app wins, and is normalized.
  const page = loadPage({ path: "/kld/apps/biq/" });
  page.sandbox.kldTrack("app_view", { app: " Porridge " });
  if (page.calls[0][2].app !== "porridge") fail("passed app lost: " + JSON.stringify(page.calls));
  // No clue at all: the event still goes, without an app.
  const bare = loadPage({ path: "/about/" });
  bare.sandbox.kldTrack("app_view", { app: "" });
  if ("app" in bare.calls[0][2]) fail("blank app was sent: " + JSON.stringify(bare.calls));
}

console.log("analytics: ok");
