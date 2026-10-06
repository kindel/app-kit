#!/usr/bin/env python3
"""Validate manifest.json.

Checks, in order:

1. JSON Schema (manifest.schema.json): shape, types, allowed fields.
2. Theme ids are unique, and every app theme id is in that list.
3. Every app id has a card.json in github.com/kindel/<id>, and the
   manifest name, summary, and status match that card. A card with no
   href must not grow an entry. A card with an href must.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "manifest.json"
SCHEMA_PATH = ROOT / "manifest.schema.json"
CARD_URL = "https://raw.githubusercontent.com/kindel/{app_id}/main/card.json"


def load_json(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def schema_errors(manifest, schema) -> list[str]:
    validator = jsonschema.Draft202012Validator(schema)
    found = []
    for err in sorted(validator.iter_errors(manifest), key=lambda e: list(e.path)):
        loc = "/".join(str(part) for part in err.path) or "(root)"
        found.append(f"schema: {loc}: {err.message}")
    return found


def theme_errors(manifest) -> list[str]:
    found = []
    themes = manifest.get("themes")
    apps = manifest.get("apps")
    if not isinstance(themes, list) or not isinstance(apps, list):
        return found
    seen = []
    for theme in themes:
        if not isinstance(theme, dict):
            continue
        tid = theme.get("id")
        if not isinstance(tid, str):
            continue
        if tid in seen:
            found.append(f"duplicate theme id {tid}")
        else:
            seen.append(tid)
    known = set(seen)
    seen_apps = []
    for app in apps:
        if not isinstance(app, dict):
            continue
        app_id = app.get("id")
        if isinstance(app_id, str):
            if app_id in seen_apps:
                found.append(f"duplicate app id {app_id}")
            else:
                seen_apps.append(app_id)
        for tid in app.get("themes") or []:
            if isinstance(tid, str) and tid not in known:
                found.append(f"{app_id}: theme {tid} is not in the theme list")
    return found


def fetch_card(app_id: str):
    url = CARD_URL.format(app_id=app_id)
    req = urllib.request.Request(url, headers={"User-Agent": "kindel-app-kit-validator"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        return None, f"{app_id}: no card.json in kindel/{app_id} (HTTP {err.code})"
    except Exception as err:  # network, DNS, timeout
        return None, f"{app_id}: could not read card.json from kindel/{app_id} ({err})"
    try:
        card = json.loads(body)
    except json.JSONDecodeError as err:
        return None, f"{app_id}: card.json in kindel/{app_id} is not JSON ({err})"
    if not isinstance(card, dict):
        return None, f"{app_id}: card.json in kindel/{app_id} is not an object"
    return card, None


def card_errors(manifest, fetch=fetch_card) -> list[str]:
    found = []
    apps = manifest.get("apps")
    if not isinstance(apps, list):
        return found
    for app in apps:
        if not isinstance(app, dict) or not isinstance(app.get("id"), str):
            continue
        app_id = app["id"]
        card, err = fetch(app_id)
        if err:
            found.append(err)
            continue
        if card.get("id") != app_id:
            found.append(f"{app_id}: card id is {card.get('id')!r}")
        for field in ("name", "summary", "status"):
            if card.get(field) != app.get(field):
                found.append(f"{app_id}: {field} does not match card.json")
        href = card.get("href")
        entry = app.get("entry")
        # A truthy non-string (a number, an object) must be reported.
        # Calling rstrip or strip on it crashes the validator.
        bad_type = False
        if not isinstance(href, (str, type(None))):
            found.append(f"{app_id}: card href must be a string")
            bad_type = True
        if not isinstance(entry, (str, type(None))):
            found.append(f"{app_id}: manifest entry must be a string")
            bad_type = True
        if bad_type:
            continue
        href = href or ""
        entry = entry or ""
        if not href:
            if entry:
                found.append(f"{app_id}: card has no href, so manifest entry must be omitted")
        elif not entry:
            found.append(f"{app_id}: card href {href} needs a manifest entry")
        elif not href.rstrip("/").endswith("/" + entry.strip("/")):
            found.append(f"{app_id}: entry {entry} is not the path in card href {href}")
    return found


def validate(manifest, schema, fetch=fetch_card) -> list[str]:
    found = schema_errors(manifest, schema)
    found.extend(theme_errors(manifest))
    found.extend(card_errors(manifest, fetch=fetch))
    return found


def main(argv: list[str] | None = None) -> int:
    manifest = load_json(MANIFEST_PATH)
    schema = load_json(SCHEMA_PATH)
    found = validate(manifest, schema)
    if found:
        for msg in found:
            print(msg, file=sys.stderr)
        return 1
    print(f"{MANIFEST_PATH.name}: ok ({len(manifest['apps'])} apps)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
