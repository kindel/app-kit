"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const feedback = fs.readFileSync(path.join(root, "feedback.js"), "utf8");
if (!feedback.includes('return "/api/app-feedback";')) {
  fail("feedback.js must default to /api/app-feedback");
}
if (!feedback.includes("window.KindelFeedback")) {
  fail("feedback.js must read window.KindelFeedback.endpoint");
}
if (!feedback.includes('headers: { "Content-Type": "application/json" }')) {
  fail("feedback.js payload headers drifted");
}
if (!feedback.includes("resp.text()")) {
  fail("feedback.js must accept a 2xx with an empty body");
}
for (const key of ["app:", "message:", "email:", "website:", "page:"]) {
  if (!feedback.includes(key)) fail("feedback.js payload missing " + key);
}

const attribution = fs.readFileSync(path.join(root, "attribution.js"), "utf8");
if (!attribution.includes('var DEFAULT_HREF = "https://kindel.com";')) {
  fail("attribution href must be https://kindel.com");
}
if (!attribution.includes('var DEFAULT_TEXT = "Built on Kindel apps";')) {
  fail('attribution text must be "Built on Kindel apps"');
}
if (!attribution.includes("[data-kld-attribution]")) {
  fail("attribution.js must render [data-kld-attribution]");
}
if (attribution.includes("data-href") || attribution.includes("opts.href")) {
  fail("attribution href must stay https://kindel.com");
}

const tokens = fs.readFileSync(path.join(root, "tokens.css"), "utf8");
const expected = {
  "--kld-ink": "#17202b",
  "--kld-muted": "#59636f",
  "--kld-line": "#d8dee4",
  "--kld-paper": "#ffffff",
  "--kld-wash": "#f4f6f3",
  "--kld-sage": "#dce7dc",
  "--kld-blue": "#24445f",
  "--kld-rust": "#b5532f",
  "--kld-rust-dark": "#883a22",
  "--kld-title-size": "3rem",
  "--kld-title-gap": "calc(var(--kld-title-size) * 2)",
  "--kld-title-above-actions": "calc(var(--kld-title-size) * 2)",
  "--kld-coast-position": "right 18%"
};
for (const [name, value] of Object.entries(expected)) {
  const line = name + ": " + value + ";";
  if (!tokens.includes(line)) fail("tokens.css missing " + line);
}

console.log("clients: ok");
