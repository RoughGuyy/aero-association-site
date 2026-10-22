"""Prepare the public catalog used by the Cloudflare guide; no secrets or internal files."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from aero_association_agent.site_structure import navigation_index

if __name__ == "__main__":
    target = ROOT / "cloudflare/generated/catalog.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    index = navigation_index()
    target.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Public guide catalog: {len(index['entries'])} entries in {len(index['tree'])} sections")
