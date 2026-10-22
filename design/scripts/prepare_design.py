#!/usr/bin/env python3
"""Build public design indexes and a deterministic bundle from reviewed local files."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DESIGN = ROOT / "design"


def sha(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def load(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text())


def write(relative: str, value: dict | list | str) -> None:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    if not target.exists() or target.read_text() != text:
        target.write_text(text)


def copy_exact(source: str, destination: str) -> None:
    target = ROOT / destination
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = (ROOT / source).read_bytes()
    if not target.exists() or target.read_bytes() != payload:
        target.write_bytes(payload)


def asset(relative: str) -> dict:
    payload = (ROOT / relative).read_bytes()
    return {"file": relative, "bytes": len(payload), "sha256": sha(payload)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", action="store_true", help="also create the public design ZIP")
    args = parser.parse_args()

    state = load(".figma/state.json")
    mappings = load(".figma/code-connect-manifest.json")
    images = load(".figma/native-generated-images-1.2.1.json")
    exports = load("design/exports/manifest.json")
    file_url = "https://www.figma.com/design/" + state["fileKey"]
    catalog = (ROOT / "src/lib/catalog.ts").read_text()
    labels = {
        p: {"en": en, "es": es}
        for p, en, es in re.findall(
            r'\{\s*path:\s*"([^"]*)",\s*en:\s*"([^"]*)",\s*es:\s*"([^"]*)"', catalog
        )
    }
    labels[""] = {"en": "Landing", "es": "Inicio"}
    route_rows = []
    for route, node in state["entities"]["routeScreens"].items():
        if not isinstance(node, str) or not re.fullmatch(r"\d+:\d+", node):
            raise ValueError(f"Invalid recorded root for {route}")
        route_rows.append({
            "route": route,
            "labels": labels.get(route, {"en": route, "es": route}),
            "nodeId": node,
            "figmaUrl": f"{file_url}?node-id={node.replace(':', '-')}",
            "sourceEntryPoint": "src/components/app-page.tsx",
            "routeCatalog": "src/lib/catalog.ts",
        })
    route_rows.sort(key=lambda row: row["route"])
    if len(route_rows) != 69 or len({r["nodeId"] for r in route_rows}) != 69:
        raise ValueError("Expected the 69 distinct, frozen route roots")
    write("design/maps/routes.json", {
        "schemaVersion": 1,
        "scope": "Recorded 1.2.1 native route index; not a fresh full-route audit",
        "stateSha256": sha((ROOT / ".figma/state.json").read_bytes()),
        "routes": route_rows,
    })
    route_markdown = [
        "# Native route map",
        "",
        "The 69 exact roots from the frozen 1.2.1 handoff. This index is not a new full native audit.",
        "Source routing starts in [`app-page.tsx`](../../src/components/app-page.tsx), with names in",
        "[`catalog.ts`](../../src/lib/catalog.ts). Open the Figma links subject to the file's sharing permissions.",
        "",
        "| Route | English / Español | Native Figma root |",
        "| --- | --- | --- |",
    ]
    for row in route_rows:
        name = row["labels"]
        route_markdown.append(
            f"| `{row['route'] or '/'}` | {name['en']} / {name['es']} | "
            f"[{row['nodeId']}]({row['figmaUrl']}) |"
        )
    write("design/maps/routes.md", "\n".join(route_markdown) + "\n")

    component_rows = []
    for item in mappings["templates"]:
        for field in ["file", "source"]:
            is_local = field == "file" or item[field].startswith(("src/", "bin/", "./", "../", ".figma/"))
            if is_local and not (ROOT / item[field]).is_file():
                raise ValueError(f"Missing mapped {field}: {item[field]}")
        component_rows.append({
            "name": item["nativeName"],
            "nodeId": item["node"],
            "figmaUrl": item["url"],
            "source": item["source"],
            "sourceKind": "local" if item["source"].startswith(("src/", "bin/")) else "dependency",
            "export": item["export"],
            "template": item["file"],
            "kind": item["kind"],
            "axes": item.get("axes", {}),
            "status": "local-unpublished",
        })
    write("design/maps/components.json", {
        "schemaVersion": 1,
        "scope": "Prepared local Code Connect source associations; not cloud registrations",
        "count": len(component_rows),
        "components": component_rows,
    })

    copy_exact("tokens/aureform.tokens.json", "design/tokens/aureform.tokens.json")
    copy_exact("src/styles/tokens.css", "design/tokens/tokens.css")
    proofs = []
    for item in images["proofs"]:
        record = asset(item["path"])
        if record["sha256"] != item["sha256"] or record["bytes"] != item["bytes"]:
            raise ValueError(f"Changed historical proof: {item['path']}")
        proofs.append({
            **record, "nodeId": item["nodeId"], "scope": item["scope"],
            "review": item["ownerReview"], "checkpoint": "1.2.1",
        })
    if len(proofs) != 7:
        raise ValueError("Expected seven accepted scoped image proofs")
    write("design/proofs/manifest.json", {
        "schemaVersion": 1, "scope": "Frozen, scoped 1.2.1 image evidence",
        "freshFullRouteVisualMatrix": False, "proofs": proofs,
    })

    for item in exports["exports"]:
        payload = (ROOT / item["file"]).read_bytes()
        if sha(payload) != item["sha256"] or len(payload) != item["bytes"]:
            raise ValueError(f"Changed downloaded export: {item['file']}")
        svg = ET.fromstring(payload)
        if svg.tag != "{http://www.w3.org/2000/svg}svg":
            raise ValueError(f"Not an SVG: {item['file']}")
        for element in svg.iter():
            for key, value in element.attrib.items():
                if key.endswith("href") and not value.startswith(("#", "data:")):
                    raise ValueError(f"External asset in {item['file']}")
        if b"/api/mcp/asset/" in payload:
            raise ValueError(f"Temporary Figma URL in {item['file']}")

    public_inputs = [
        ".figma/state.json", "tokens/aureform.tokens.json", "src/styles/tokens.css",
        "design/exports/manifest.json",
    ]
    write("design/reports/source-index.json", {
        "schemaVersion": 1,
        "nativeFigIncluded": False,
        "routeRoots": len(route_rows),
        "codeConnectMappings": len(component_rows),
        "downloadedSvgExports": len(exports["exports"]),
        "frozenImageProofs": len(proofs),
        "inputs": [asset(path) for path in public_inputs],
    })

    if args.bundle:
        allowed = ["exports", "figma", "maps", "proofs", "rebuild-plugin", "reports", "releases", "scripts", "tokens"]
        files = [DESIGN / "README.md", DESIGN / "README.es.md", DESIGN / "release-1.3.0.json"]
        for directory in allowed:
            files.extend(p for p in (DESIGN / directory).rglob("*") if p.is_file())
        files.extend(ROOT / item["file"] for item in proofs)
        files.extend(sorted((ROOT / ".figma/code-connect").glob("*.figma.ts")))
        files.extend(sorted((ROOT / ".figma").glob("Softphone*.figma.ts")))
        files.extend(sorted((ROOT / ".figma").glob("CommunicationsSetup*.figma.ts")))
        files.extend(sorted((ROOT / "docs/communications").glob("*.md")))
        files.extend(sorted((ROOT / "docs/communications").glob("*.json")))
        files.extend(sorted((ROOT / "public/assets/integrations").glob("*")))
        files.extend(sorted((ROOT / "public/assets/communications").glob("*")))
        files.extend(sorted((DESIGN / "assets/provider-brands").glob("*")))
        files.extend([
            ROOT / ".figma/code-connect/figma.config.json",
            ROOT / "docs/figma-distribution.md", ROOT / "docs/figma-distribution.es.md",
            ROOT / "LICENSE", ROOT / "LICENSE.md", ROOT / "NOTICE", ROOT / "THIRD_PARTY_NOTICES.md",
            ROOT / "src/assets/fonts/Manrope-OFL.txt", ROOT / "src/assets/fonts/InstrumentSerif-OFL.txt",
        ])
        paths = sorted({p.relative_to(ROOT).as_posix() for p in files if p.is_file()})
        paths = [p for p in paths if "__pycache__" not in p and not p.endswith((".pyc", ".map"))]
        target = DESIGN / "downloads/aureform-design-snapshots.zip"
        target.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in paths:
                info = zipfile.ZipInfo(path, date_time=(2026, 10, 19, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                archive.writestr(info, (ROOT / path).read_bytes())
        with zipfile.ZipFile(target) as archive:
            if archive.testzip() is not None:
                raise ValueError("ZIP integrity failed")
            if archive.namelist() != paths:
                raise ValueError("Unexpected ZIP paths")
        write("design/downloads/checksums.json", {
            "schemaVersion": 1,
            "scope": "Selected design snapshots, native starter plugin, local Code Connect templates, Communications research documents and original provider artwork",
            "nativeFigIncluded": False,
            "files": len(paths),
            "bundle": asset(target.relative_to(ROOT).as_posix()),
        })

    print(json.dumps({
        "recordedRouteRoots": len(route_rows), "localCodeConnectMappings": len(component_rows),
        "downloadedSvgExports": len(exports["exports"]), "frozenImageProofs": len(proofs),
        "nativeFigIncluded": False, "bundleCreated": args.bundle,
    }, indent=2))


if __name__ == "__main__":
    main()
