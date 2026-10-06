# app-kit

Shared files for Kindel apps, so a host other than kindel.com can mount the same manifest, feedback client, attribution link, and brand tokens.

The page shell stays with the host. This repo does not ship Hugo layouts for an app.

## Files

| File | What it is |
|------|------------|
| `manifest.json` | Apps, theme list, entry paths, route templates, and preview crops. |
| `previews/` | WebP crops of each published app's first screen. |
| `manifest.schema.json` | Schema for that file. |
| `feedback.js` | Feedback form client. |
| `attribution.js` | Renders the required attribution link. |
| `attribution.css` | Styles for that link. |
| `tokens.css` | `--kld-*` custom properties. |
| `hugo.toml` | Mounts the files when this repo is a Hugo module. |

Names and summaries in `manifest.json` are copied from each app's `card.json` (`github.com/kindel/<id>`). Do not invent them. `30-60-90` is not published: status `later`, no `entry`, and no `preview`.

Each published app has `preview.src` (a file in `previews/`) and `preview.alt` (what that crop shows). The crops are the built app, not a mock. A host mounts `previews` at `static/images/app-kit` and prefixes `src` with that public path.

Theme labels, in chip order: Being Principled, Hiring, People Management, Planning and Change. Tig can still change the names and the order.

## Feedback

`feedback.js` binds the markup kindel.com already uses (`.app-feedback-toggle`, `.app-feedback-form-inner`, and the fields `message`, `email`, and `website`). The POST body is `app`, `message`, `email`, `website`, and `page`.

The endpoint, first match wins:

1. `data-endpoint` on the form.
2. `window.KindelFeedback.endpoint`, set before this script runs.
3. `/api/app-feedback`, the kindel.com path.

```html
<script>
  window.KindelFeedback = { endpoint: "/api/app-feedback" };
</script>
<script src="/js/app-kit/feedback.js" defer></script>
```

## Attribution

MIT derivatives link to https://kindel.com. A LICENSE file is not enough. Drop an empty element where the link should go, and load the script and the CSS:

```html
<link rel="stylesheet" href="/css/app-kit/attribution.css">
<p data-kld-attribution></p>
<script src="/js/app-kit/attribution.js" defer></script>
```

That renders "Built on Kindel apps" pointing at https://kindel.com. The destination is fixed. `KindelAttribution.render(element)` does the same from script.

## Tokens

Link `tokens.css` from the host. The values match `kindelwww` `static/css/custom.css`.

## Hugo module

```toml
[[module.imports]]
  path = "github.com/kindel/app-kit"
```

With no mounts of your own, `hugo.toml` in this repo places the files at:

- `data/appkit/manifest.json`
- `static/js/app-kit/feedback.js`
- `static/js/app-kit/attribution.js`
- `static/css/app-kit/attribution.css`
- `static/css/app-kit/tokens.css`
- `static/images/app-kit/` (the `previews/` directory)

A host that sets mounts on the import replaces those. Point them at the same targets, or the files will not land.

The manifest `entry` is a path relative to the host's app base. kindel.com uses `/kld/apps/`, so Porridge's entry `porridge/` is `/kld/apps/porridge/`. Route templates append to that base. Porridge's `principle` route is `{company}/{slug}/` and its `set` route is `?c={company}`.

Plain files are also on jsDelivr once they are on the default branch, for example `https://cdn.jsdelivr.net/gh/kindel/app-kit@main/feedback.js`.

## Tests

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m unittest discover -s tests -v
node tests/check_clients.js
```

The manifest test fetches each app's `card.json` from GitHub. It checks the schema, that every theme id on an app is in the theme list, and that every app id has a card whose name, summary, and status match.
