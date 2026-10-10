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

const launcher = fs.readFileSync(path.join(root, "launcher.js"), "utf8");
if (!launcher.includes("event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey")) {
  fail("launcher.js must let modified theme-chip clicks follow href");
}
if (!launcher.includes('event.preventDefault()')) {
  fail("launcher.js must intercept an unmodified theme-chip click");
}
if (launcher.includes("apps-tile-open")) {
  fail("launcher.js must not bind the app tile");
}
if (!launcher.includes("minHeight")) {
  fail("launcher.js must reserve a stable pane height");
}
if (!launcher.includes("data-tile-focus")) {
  fail("launcher.js must keep a coming-soon tile focusable when the info glyph is hidden");
}
const launcherHtml = fs.readFileSync(path.join(root, "layouts/partials/app-kit/launcher.html"), "utf8");
if (!launcherHtml.includes("data-tile-focus")) {
  fail("launcher tile for an unpublished app must be focusable");
}
const unlistedGuards = launcherHtml.match(/if \$card\.unlisted \}\}\{\{ continue \}\}/g) || [];
if (unlistedGuards.length < 2) {
  fail("launcher must skip an unlisted card in the grid and in the about templates");
}
const chrome = fs.readFileSync(path.join(root, "chrome.css"), "utf8");
if (chrome.includes("tools-preview") || chrome.includes("tools-steam")) {
  fail("chrome.css still has the screenshot card");
}
if (!chrome.includes("(min-width: 860px) and (hover: hover) and (pointer: fine)")) {
  fail("chrome.css must hide the info glyph only for a fine pointer that can hover");
}
const hero = fs.readFileSync(path.join(root, "layouts/partials/app-kit/hero.html"), "utf8");
if (hero.includes("actionLabel") || hero.includes("actionHref")) {
  fail("hero partial must not render an app control");
}
if (hero.includes("allApps") || hero.includes("All The Apps") || hero.includes("kld-hero-actions")) {
  fail("hero partial must not render an All The Apps link");
}
if (chrome.includes(".kld-appbar .kld-button") || chrome.includes(".kld-appbar .kld-hero-actions")) {
  fail("chrome.css must not style an All The Apps button");
}
if (hero.includes("<h1") || hero.includes("kld-eyebrow")) {
  fail("hero partial must stay a navbar bar, without a page heading");
}
if (!hero.includes("appkitHeading")) {
  fail("hero partial must stash an explicit title for the frame");
}
const frame = fs.readFileSync(path.join(root, "layouts/partials/app-kit/frame-start.html"), "utf8");
if (!frame.includes("app-frame-toolbar") || !frame.includes("app-frame-controls")) {
  fail("frame partial needs a toolbar and a controls slot");
}
if (!frame.includes("app-frame-title") || !frame.includes("<h1")) {
  fail("frame partial must render the page h1");
}
if (!frame.includes("appkitHeading")) {
  fail("frame partial must read the title the hero stashed");
}
if (!frame.includes('eq $card.status "beta"') || !frame.includes("statusBeta") || !frame.includes("app-frame-beta")) {
  fail("frame badge must follow card status beta and the host Beta label");
}
if (frame.includes(">Beta<") || frame.includes('"Beta"') || frame.includes("tenets") || frame.includes("porridge")) {
  fail("frame badge must not hard-code the word or the app list");
}
const renderAt = frame.lastIndexOf('eq $card.status "beta"');
const branch = frame.slice(renderAt, frame.indexOf("end", renderAt));
if (!branch.includes("app-frame-beta") || !branch.includes("$statusBeta")) {
  fail("Beta badge must be rendered only in the beta status branch");
}
if (!chrome.includes(".app-frame-beta")) {
  fail("chrome.css needs the Beta badge");
}

const feedbackHtml = fs.readFileSync(path.join(root, "layouts/partials/app-kit/feedback.html"), "utf8");
if (!feedbackHtml.includes("if .facet")) {
  fail("Facet footer line must be opt-in");
}
if (!feedbackHtml.includes("facetFixLead") || !feedbackHtml.includes("facetFixLink")) {
  fail("Facet footer copy must come from apphost");
}
if (!feedbackHtml.includes('src="{{ $iconBase }}facet.svg"') || !feedbackHtml.includes('alt=""')) {
  fail("Facet footer icon must be facet.svg with an empty alt");
}
if (!feedbackHtml.includes('width="18"') || !feedbackHtml.includes('height="18"')) {
  fail("Facet footer icon must be 18 by 18");
}
const iconRuleAt = chrome.indexOf(".app-facet-fix-icon");
if (iconRuleAt < 0) fail("chrome.css needs .app-facet-fix-icon");
const iconRule = chrome.slice(iconRuleAt, iconRuleAt + 280);
if (!iconRule.includes("width: 18px") || !iconRule.includes("height: 18px") || !iconRule.includes("vertical-align: middle")) {
  fail("chrome.css must draw the Facet icon at 18px, centered on the text");
}

console.log("clients: ok");
