#!/usr/bin/env python3
"""Optimize already-generated images and create portable, self-contained assets.

This script does not call an image model or read API credentials. Install Pillow
to run it. Public masters are in design/images/masters; older local generation
workspaces may still use output/imagegen/masters.
"""

import base64
import argparse
import hashlib
import json
from datetime import datetime, timezone
from html import escape
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "docs/generated-images/catalog.json"
MASTERS = (
    ROOT / "design/images/masters"
    if (ROOT / "design/images/masters").is_dir()
    else ROOT / "output/imagegen/masters"
)
PUBLIC = ROOT / "public/assets"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def prepare(masters: Path = MASTERS) -> None:
    catalog = json.loads(CATALOG.read_text())
    items = catalog["items"]
    if len(items) != 32 or len({item["id"] for item in items}) != 32:
        raise ValueError("The reviewed collection must contain 32 distinct assets.")
    missing = [
        item["master"] for item in items if not (masters / item["master"]).is_file()
    ]
    if missing:
        raise FileNotFoundError(f"Missing original model outputs: {', '.join(missing)}")
    records = []
    for item in items:
        master = masters / item["master"]
        original = master.read_bytes()
        target_size = tuple(item["webSize"])
        expected_size = tuple(int(value) for value in item["size"].split("x"))
        with Image.open(master) as image:
            image.load()
            if image.format != "WEBP" or image.size != expected_size:
                raise ValueError(f"Unexpected format or dimensions: {master.name}")
            image = ImageOps.exif_transpose(image).convert("RGB")
            image = image.resize(target_size, Image.Resampling.LANCZOS)
            directory = PUBLIC / item["group"]
            directory.mkdir(parents=True, exist_ok=True)
            webp = directory / f"{item['id']}.webp"
            quality = 86 if item["group"] == "avatars" else 88
            image.save(webp, "WEBP", quality=quality, method=6)
        raster = webp.read_bytes()
        width, height = target_size
        # shadcn registry:file writes UTF-8. This SVG contains the actual model
        # output as WebP bytes; it does not redraw or approximate the image.
        svg = directory / f"{item['id']}.svg"
        container = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" '
            f'height="{height}" viewBox="0 0 {width} {height}">'
            f"<title>{escape(item['alt']['en'])}</title>"
            f'<image width="{width}" height="{height}" '
            'preserveAspectRatio="xMidYMid slice" '
            'href="data:image/webp;base64,'
            f'{base64.b64encode(raster).decode("ascii")}"/></svg>\n'
        ).encode()
        svg.write_bytes(container)
        records.append(
            {
                "id": item["id"],
                "group": item["group"],
                "name": item["name"],
                "src": f"/assets/{item['group']}/{item['id']}.svg",
                "downloadSrc": f"/assets/{item['group']}/{item['id']}.webp",
                "width": width,
                "height": height,
                "alt": item["alt"],
                "webpBytes": len(raster),
                "webpSha256": digest(raster),
                "svgBytes": len(container),
                "svgSha256": digest(container),
                "master": f"output/imagegen/masters/{item['master']}",
                "masterWidth": expected_size[0],
                "masterHeight": expected_size[1],
                "masterBytes": len(original),
                "masterSha256": digest(original),
                "promptSha256": digest(item["prompt"].encode()),
            }
        )
    manifest = {
        "schemaVersion": 1,
        "version": "1.2.1",
        "collection": catalog["collection"],
        "preparedAt": datetime.now(timezone.utc).isoformat(),
        "model": catalog["model"],
        "generation": {
            "api": catalog["api"],
            "quality": catalog["quality"],
            "background": catalog["background"],
            "outputFormat": catalog["outputFormat"],
            "outputCompression": catalog["outputCompression"],
            "promptCatalog": "docs/generated-images/catalog.json",
            "tool": "imagegen/scripts/image_gen.py",
            "method": "generate and generate-batch",
            "fictionalIdentities": True,
            "runtimeGeneration": False,
        },
        "delivery": {
            "optimizedFormat": "image/webp",
            "portableContainer": "image/svg+xml with embedded image/webp",
            "externalImageRequests": False,
            "mastersIncludedInSourceArchive": False,
        },
        "items": records,
    }
    manifest_path = PUBLIC / "generated-images.json"
    if manifest_path.is_file():
        previous = json.loads(manifest_path.read_text())
        if {key: value for key, value in previous.items() if key != "preparedAt"} == {
            key: value for key, value in manifest.items() if key != "preparedAt"
        }:
            manifest["preparedAt"] = previous["preparedAt"]
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    # Keep download MIME/size metadata in sync after re-optimizing. This module
    # intentionally has no asset URLs, so importing sizes does not pull all 32
    # images into a component's source dependency graph.
    metadata = {
        item["id"]: {
            key: item[key] for key in ["width", "height", "svgBytes", "webpBytes"]
        }
        for item in records
    }
    metadata_path = ROOT / "src/demo/generated-image-metadata.ts"
    lines = [
        "// Generated by scripts/prepare-image-assets.py; do not edit sizes manually.",
        "export const generatedImageMetadata = {",
    ]
    for asset_id, values in metadata.items():
        property_name = asset_id if asset_id.isidentifier() else json.dumps(asset_id)
        lines.append(f"  {property_name}: {{")
        lines.extend(f"    {key}: {value}," for key, value in values.items())
        lines.append("  },")
    lines.append("} as const;")
    metadata_path.write_text("\n".join(lines) + "\n")
    print(
        json.dumps(
            {
                "manifest": str(manifest_path.relative_to(ROOT)),
                "assets": len(records),
                "optimizedWebpBytes": sum(item["webpBytes"] for item in records),
                "portableSvgBytes": sum(item["svgBytes"] for item in records),
                "masterBytes": sum(item["masterBytes"] for item in records),
            }
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--masters", type=Path, default=MASTERS, help="Directory containing the original WebP masters.")
    args = parser.parse_args()
    prepare(args.masters.resolve())
