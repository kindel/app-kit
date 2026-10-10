# app-kit

Shared files for Kindel apps, so a host other than kindel.com can mount the same manifest, feedback client, attribution link, brand tokens, and app chrome.

## Files

| File | What it is |
|------|------------|
| `manifest.json` | Apps, theme list, entry paths, and route templates. |
| `manifest.schema.json` | Schema for that file. |
| `feedback.js` | Feedback form client. |
| `layouts/partials/app-kit/feedback.html` | Give Feedback on this App markup. |
| `attribution.js` | Renders the required attribution link. |
| `attribution.css` | Styles for that link. |
| `tokens.css` | `--kld-*` custom properties. |
| `chrome.css` | Launcher, app frame, feedback, and related-essay styles. |
| `launcher.js` | Theme chips, the desktop detail pane, and the mobile sheet. |
| `layouts/partials/app-kit/` | Hero, frame, launcher, summary, related essays, feedback. |
| `data/essay_slugs.json` | Offline list of Essays-category slugs for the related-essay links. |
| `hugo.toml` | Mounts the files when this repo is a Hugo module. |

Names and summaries in `manifest.json` are copied from each app's `card.json` (`github.com/kindel/<id>`). Do not invent them. `30-60-90` is not published: status `later`, and no `entry`.

Theme labels, in chip order: Being Principled, Hiring, People Management, Planning and Change. Tig can still change the names and the order.

## Page chrome

Partials live under `layouts/partials/app-kit/`. A host that already has `site-navigation` can call `app-kit/hero.html` for the slim dark bar. The bar is the site navbar. Pass `catalog` true on the apps catalog. The hero does not take app controls, and it does not render a kicker, title, subtitle, or hero image.

`app-kit/frame-start.html` opens the app surface and its toolbar (icon, name, optional controls). Pass `page` as well as `card` so the frame can read a title the hero stashed. When the hero call set `title`, that title is the page's one `h1` at the top of the frame, and an explicit `subtitle` sits under it. Otherwise the toolbar name is the `h1`. When `card.status` is `beta`, the toolbar shows the host's `statusBeta` label beside the name. Live and later apps do not. `app-kit/frame-end.html` closes the frame. Optional `nameHref` makes the name a link. Optional `controls` is HTML for that app's own toolbar controls.

`app-kit/summary.html` prints the card summary. `app-kit/related.html` prints the card's related essays. A post in the WordPress Essays category (slug essays, id 448) is linked at https://kindel.com/essays/<slug>/. Other blog links stay on blog.kindel.com. The offline slug list is `data/essay_slugs.json`; the note in that file says how to refresh it. `app-kit/feedback.html` is the footer form. Pass `facet` true and it adds the host's `facetFixLead` above the button. `facetFixLink` is the link text. The destination is `{appBase}facet/`, and Facet's icon sits inline before those words. The icon is `{iconBase}facet.svg` (the SVG from kindel/facet, mounted beside `facet.png`), 18px, vertically centered, and decorative (`alt=""`). `app-kit/launcher.html` is the icon grid. Call it from the catalog shortcode with the shortcode context. A card with `unlisted` set to true is left out of that grid. The host can still mount the card and open the app page.

Words and host paths (`appBase`, `iconBase`, chip label, feedback sentences, `facetFixLead`, `facetFixLink`, sheet labels) come from the host's `data/apphost.json`, not from these partials. Each app still ships its own `icon.png`. The host mounts that file where `iconBase` points (kindel.com uses `/images/tools/`).

`launcher.js` keeps unmodified primary clicks on a theme chip in the page, and lets Ctrl, Cmd, Shift, and Alt clicks follow the chip href. The chips are one segmented category bar. The selected category is paper on the wash tray, and the icons sit on a wash board with the name centered under each icon. The app tile is a normal link, so those modified clicks open it in a new tab with no script involved. The info button is a separate control, `aria-label` "About" plus the app name. On a wide screen with a fine pointer that can hover, that button is hidden: pointing at an icon, or focusing it, fills the pane. A coarse pointer, or a screen that cannot hover, keeps the button. The pane reserves the height of the tallest details, so moving between apps does not move the footer.

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
- `static/js/app-kit/launcher.js`
- `static/css/app-kit/attribution.css`
- `static/css/app-kit/tokens.css`
- `static/css/app-kit/chrome.css`
- `layouts/partials/app-kit/` (hero, frame, launcher, feedback, related essays)
- `data/essay_slugs.json`

A host that sets mounts on the import replaces those. Point them at the same targets, or the files will not land.

The manifest `entry` is a path relative to the host's app base. kindel.com uses `/kld/apps/`, so Porridge's entry `porridge/` is `/kld/apps/porridge/`. Route templates append to that base. Porridge's `principle` route is `{company}/{slug}/` and its `set` route is `?c={company}`.

Plain files are also on jsDelivr once they are on the default branch, for example `https://cdn.jsdelivr.net/gh/kindel/app-kit@main/feedback.js`.

## Tests

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m unittest discover -s tests -v
node --check launcher.js
node tests/check_clients.js
```

The manifest test fetches each app's `card.json` from GitHub. It checks the schema, that every theme id on an app is in the theme list, and that every app id has a card whose name, summary, status, and unlisted flag match.
