"""Related-essay links stay on kindel.com for Essays-category posts."""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATED = re.compile(
    r"https?://(?:www\.)?blog\.kindel\.com/\d{4}/\d{2}/\d{2}/([a-z0-9]+(?:-[a-z0-9]+)*)/?",
    re.I,
)
SKIP_DIRS = {".git", ".venv", "__pycache__", "node_modules"}


def snapshot():
    return json.loads((ROOT / "data" / "essay_slugs.json").read_text())


class EssayLinkTests(unittest.TestCase):
    def test_snapshot_names_essays_and_skips_other_posts(self):
        data = snapshot()
        self.assertEqual(data["category_id"], 448)
        self.assertEqual(data["category_slug"], "essays")
        slugs = data["by_slug"]
        self.assertEqual(slugs["tenets"], "tenets")
        self.assertNotIn("prompt-to-metal", slugs)
        self.assertNotIn("after-21-years-goodbye-microsoft", slugs)
        self.assertNotIn("principal-engineer-tenets-unless-you-know-better-ones", slugs)
        self.assertTrue(data["by_id"])

    def test_related_partial_rewrites_through_the_catalog(self):
        related = (ROOT / "layouts/partials/app-kit/related.html").read_text()
        href = (ROOT / "layouts/partials/app-kit/essay-href.html").read_text()
        catalog = (ROOT / "layouts/partials/app-kit/essay-catalog.html").read_text()
        hugo = (ROOT / "hugo.toml").read_text()
        self.assertIn('partial "app-kit/essay-href.html"', related)
        self.assertIn("https://kindel.com/essays/", href)
        self.assertIn("blog.kindel.com", href)
        self.assertIn("try (urls.Parse", href)
        self.assertIn("EscapedFragment", href)
        self.assertIn("categories=448", catalog)
        self.assertIn("essay_slugs", catalog)
        self.assertIn("$posts = slice", catalog)
        self.assertIn('source = "data"', hugo)

    def test_repo_has_no_blog_permalink_for_an_essay(self):
        slugs = snapshot()["by_slug"]
        hits = []
        for path in ROOT.rglob("*"):
            if not path.is_file() or any(part in SKIP_DIRS for part in path.parts):
                continue
            if path.suffix.lower() not in {".html", ".md", ".js", ".json", ".toml", ".py", ".css"}:
                continue
            if path.name == "essay_slugs.json":
                continue
            text = path.read_text(errors="replace")
            for match in DATED.finditer(text):
                if match.group(1).lower() in slugs:
                    hits.append(f"{path.relative_to(ROOT)}: {match.group(0)}")
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
