#!/usr/bin/env python3
"""Manifest schema, theme references, and card.json checks."""

import copy
import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))

import validate_manifest as v  # noqa: E402


def load(name):
    with (ROOT / name).open(encoding="utf-8") as fh:
        return json.load(fh)


class ManifestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = load("manifest.json")
        cls.schema = load("manifest.schema.json")

    def test_committed_manifest(self):
        errors = v.validate(self.manifest, self.schema)
        self.assertEqual(errors, [], "\n".join(errors))

    def test_theme_list_and_assignments(self):
        labels = [(t["id"], t["label"]) for t in self.manifest["themes"]]
        self.assertEqual(
            labels,
            [
                ("being-principled", "Being Principled"),
                ("hiring", "Hiring"),
                ("people-management", "People Management"),
                ("planning-and-change", "Planning and Change"),
            ],
        )
        by_id = {app["id"]: app["themes"] for app in self.manifest["apps"]}
        self.assertEqual(
            by_id,
            {
                "porridge": ["being-principled"],
                "tenets": ["being-principled"],
                "sbi": ["people-management", "being-principled"],
                "biq": ["hiring"],
                "30-60-90": ["hiring", "people-management"],
                "cbto": ["people-management"],
                "5ps": ["planning-and-change"],
                "dvfr": ["planning-and-change"],
            },
        )
        porridge = next(app for app in self.manifest["apps"] if app["id"] == "porridge")
        self.assertEqual(
            porridge["routes"],
            {"principle": "{company}/{slug}/", "set": "?c={company}"},
        )
        unpublished = next(app for app in self.manifest["apps"] if app["id"] == "30-60-90")
        self.assertNotIn("entry", unpublished)
        self.assertEqual(unpublished["status"], "later")

    def test_unknown_theme_rejected(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["apps"][0]["themes"] = ["not-a-theme"]
        errors = v.theme_errors(manifest)
        self.assertTrue(any("not-a-theme" in msg for msg in errors), errors)

    def test_duplicate_theme_rejected(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["themes"].append(dict(manifest["themes"][0]))
        errors = v.theme_errors(manifest)
        self.assertTrue(any("duplicate theme id" in msg for msg in errors), errors)

    def test_schema_rejects_extra_field_and_bad_status(self):
        extra = copy.deepcopy(self.manifest)
        extra["note"] = "nope"
        errors = v.schema_errors(extra, self.schema)
        self.assertTrue(errors, errors)

        bad = copy.deepcopy(self.manifest)
        bad["apps"][0]["status"] = "shipped"
        errors = v.schema_errors(bad, self.schema)
        self.assertTrue(any("shipped" in msg for msg in errors), errors)

    def test_missing_card_rejected(self):
        def fetch(app_id):
            if app_id == "porridge":
                return None, "porridge: no card.json in kindel/porridge (HTTP 404)"
            return {"id": app_id, "name": "n", "summary": "s", "status": "live", "href": f"/x/{app_id}/"}, None

        manifest = {
            "themes": [{"id": "hiring", "label": "Hiring"}],
            "apps": [
                {
                    "id": "porridge",
                    "name": "n",
                    "summary": "s",
                    "status": "live",
                    "themes": ["hiring"],
                    "entry": "porridge/",
                }
            ],
        }
        errors = v.card_errors(manifest, fetch=fetch)
        self.assertEqual(errors, ["porridge: no card.json in kindel/porridge (HTTP 404)"])

    def test_summary_must_match_card(self):
        def fetch(app_id):
            return {
                "id": app_id,
                "name": "Porridge",
                "summary": "different words",
                "status": "beta",
                "href": "/kld/apps/porridge/",
            }, None

        app = copy.deepcopy(self.manifest["apps"][0])
        errors = v.card_errors({"apps": [app]}, fetch=fetch)
        self.assertTrue(any("summary does not match" in msg for msg in errors), errors)

    def test_unpublished_card_rejects_entry(self):
        def fetch(app_id):
            return {
                "id": app_id,
                "name": "30-60-90",
                "summary": "s",
                "status": "later",
            }, None

        app = {
            "id": "30-60-90",
            "name": "30-60-90",
            "summary": "s",
            "status": "later",
            "themes": ["hiring"],
            "entry": "30-60-90/",
        }
        errors = v.card_errors({"apps": [app]}, fetch=fetch)
        self.assertTrue(any("must be omitted" in msg for msg in errors), errors)

    def test_non_string_href_is_reported(self):
        def fetch(app_id):
            return {
                "id": app_id,
                "name": "Porridge",
                "summary": "s",
                "status": "live",
                "href": {"url": "/kld/apps/porridge/"},
            }, None

        app = {
            "id": "porridge",
            "name": "Porridge",
            "summary": "s",
            "status": "live",
            "themes": ["being-principled"],
            "entry": "porridge/",
        }
        errors = v.card_errors({"apps": [app]}, fetch=fetch)
        self.assertEqual(errors, ["porridge: card href must be a string"])

    def test_non_string_entry_is_reported(self):
        def fetch(app_id):
            return {
                "id": app_id,
                "name": "Porridge",
                "summary": "s",
                "status": "live",
                "href": "/kld/apps/porridge/",
            }, None

        app = {
            "id": "porridge",
            "name": "Porridge",
            "summary": "s",
            "status": "live",
            "themes": ["being-principled"],
            "entry": 1,
        }
        errors = v.card_errors({"apps": [app]}, fetch=fetch)
        self.assertEqual(errors, ["porridge: manifest entry must be a string"])

    def test_published_apps_have_preview_files(self):
        later = [a for a in self.manifest["apps"] if a["id"] == "30-60-90"]
        self.assertEqual(len(later), 1)
        self.assertNotIn("preview", later[0])
        self.assertNotIn("entry", later[0])
        published = [a["id"] for a in self.manifest["apps"] if a.get("entry")]
        self.assertEqual(
            published,
            ["porridge", "tenets", "sbi", "biq", "cbto", "5ps", "dvfr"],
        )
        errors = v.preview_errors(self.manifest)
        self.assertEqual(errors, [])

    def test_missing_preview_is_rejected(self):
        manifest = {"apps": [{"id": "porridge", "entry": "porridge/"}]}
        errors = v.preview_errors(manifest)
        self.assertEqual(errors, ["porridge: published app needs a preview"])

    def test_unpublished_preview_is_rejected(self):
        manifest = {"apps": [{"id": "30-60-90", "preview": {"src": "x.webp", "alt": "x"}}]}
        errors = v.preview_errors(manifest)
        self.assertEqual(errors, ["30-60-90: unpublished app must not have a preview"])

    def test_missing_preview_file_is_rejected(self):
        manifest = {
            "apps": [
                {
                    "id": "porridge",
                    "entry": "porridge/",
                    "preview": {"src": "missing.webp", "alt": "A screen"},
                }
            ]
        }
        errors = v.preview_errors(manifest)
        self.assertEqual(errors, ["porridge: preview file previews/missing.webp is missing"])


if __name__ == "__main__":
    unittest.main()
