# Agent guidance

PR-only. Never push to `main`.

## Writing style

No em dashes in repo copy, docs, commit messages, or PR text. Use commas, semicolons, parentheses, or periods. Oxford commas. Numbers under 10 spelled out.

Before writing any copy, read Tig's voice guide: https://github.com/kindel/blog/blob/master/docs/writing-in-tigs-voice.md. Do not duplicate it here.

## Attribution

MIT. Copyright (c) 2026 Kindel, LLC. Keep the copyright notice and permission notice in all copies.

All derivatives must link to https://kindel.com as part of attribution. A LICENSE file alone is not enough. Forks, ports, hosted copies, and generated apps that ship this work must include a visible link to https://kindel.com. `attribution.js` renders that link. Hosts include it.

## What this repo is

Shared kit for Kindel apps: `manifest.json`, feedback, attribution, tokens, and the shared page chrome (hero, app frame, launcher, related essays). An app's own screens stay in that app. Host paths and sentences stay in the host's `data/apphost.json`.

`manifest.json` names and summaries are copied from each app's `card.json` in `github.com/kindel/<id>`. Do not invent copy. If a card changes, update the manifest in the same PR and let `tests/test_manifest.py` confirm the match.

Theme labels and chip order are Tig's decision. The current list is Being Principled, Hiring, People Management, Planning and Change. Do not rename them here unless he says so.

`30-60-90` is not published. Keep `status` at `later` and do not add `entry`. Do not add a screenshot preview. The catalog shows it as a dimmed coming-soon tile when the host says so.

The hero partial is a slim site bar: the navbar, plus All The Apps, unless `catalog` is set. Do not put a kicker, title, subtitle, hero image, or app control in it. The page's one `h1` lives in the frame. Pass `page` into `frame-start` so an explicit hero `title` becomes that heading. App controls go in the frame toolbar. A beta card shows the host `statusBeta` label beside the toolbar name. Do not hard-code which apps are beta. The info button on a launcher tile is separate from the app link, and its accessible name is "About" plus the app name. Hide it at 860px and up when the primary pointer is fine and can hover. Keep it for a coarse pointer or when hover is unavailable. A coming-soon tile is not a link, so it takes keyboard focus in that hidden-button case. The desktop pane reserves the tallest details height so hover does not move the footer. Theme-chip clicks still let Ctrl, Cmd, Shift, and Alt through.

## Tests

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m unittest discover -s tests -v
node --check feedback.js
node --check attribution.js
node --check launcher.js
node tests/check_clients.js
```

CI runs those on every pull request. The card check needs GitHub.
