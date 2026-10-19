"""Preserve actual Figma PNG exports without resizing or changing RGBA pixels."""

import argparse
import hashlib
import json
import pathlib
import struct

from PIL import Image, PngImagePlugin


def digest(data):
    return hashlib.sha256(data).hexdigest()


def preserve_export(source, destination, node_id, kind, native_bounds=None):
    original = source.read_bytes()
    if not original.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"Not a PNG export: {source.name}")
    with Image.open(source) as image:
        image.load()
        rgba = image.convert("RGBA")
        pixel_hash = digest(rgba.tobytes())
        encoded = (
            rgba.convert("RGB")
            if rgba.getchannel("A").getextrema() == (255, 255)
            else rgba
        )
        metadata = PngImagePlugin.PngInfo()
        if "srgb" in image.info:
            metadata.add(b"sRGB", bytes([image.info["srgb"]]))
        if "gamma" in image.info:
            metadata.add(
                b"gAMA", struct.pack(">I", round(image.info["gamma"] * 100000))
            )
        options = {
            "optimize": True,
            "compress_level": 9,
            "pnginfo": metadata,
        }
        if "icc_profile" in image.info:
            options["icc_profile"] = image.info["icc_profile"]
        encoded.save(destination, **options)
        size = image.size
    with Image.open(destination) as check:
        check.load()
        if check.size != size or digest(check.convert("RGBA").tobytes()) != pixel_hash:
            raise ValueError(f"Export pixels changed: {source.name}")
    content = destination.read_bytes()
    proof = {
        "nodeId": node_id,
        "kind": kind,
        "path": destination.as_posix(),
        "dimensions": {"width": size[0], "height": size[1]},
        "originalBytes": len(original),
        "originalSha256": digest(original),
        "bytes": len(content),
        "sha256": digest(content),
        "rgbaPixelSha256": pixel_hash,
        "pixelIdentical": True,
        "transformation": "Lossless PNG re-encoding; no resizing or quantization.",
    }
    if native_bounds:
        proof["nativeBounds"] = native_bounds
        proof["exportScale"] = {
            "x": size[0] / native_bounds["width"],
            "y": size[1] / native_bounds["height"],
        }
        proof["exportNote"] = (
            "Dimensions are the actual Figma export. Large review boards are "
            "scaled by Figma's render service; this script preserves every pixel."
        )
    return proof


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=pathlib.Path)
    arguments = parser.parse_args()
    library = json.loads(pathlib.Path(".figma/native-saas-library-1.2.json").read_text())
    view_structure = json.loads(
        pathlib.Path(".figma/native-saas-views-1.2.json").read_text()
    )
    view_bounds = {
        view["nodeId"]: {"width": view["width"], "height": view["height"]}
        for view in view_structure["views"]
    }
    destination = pathlib.Path(".figma/proofs/saas-1.2")
    destination.mkdir(parents=True, exist_ok=True)
    names = {
        "onboarding": "onboarding",
        "settings/workspace": "workspace",
        "customers/detail": "detail",
        "imports": "imports",
        "customers": "customers",
        "settings/team": "team",
    }
    components = {
        "WorkspaceStatus": "workspace-status",
        "OnboardingFlow": "onboarding-flow",
        "MemberManagement": "member-management",
        "DataWorkbench": "data-workbench",
        "ImportWizard": "import-wizard",
        "RecordDetail": "record-detail",
        "WorkspaceSettingsTemplate": "workspace-settings",
        "RowActions": "row-actions",
        "DeleteDialog": "delete-dialog",
    }
    proofs = []
    for view in library["views"]:
        for mode, node_id in view["nodes"].items():
            name = f'{names[view["path"]]}-{mode.lower()}.png'
            proof = preserve_export(
                arguments.source / name,
                destination / name,
                node_id,
                "view",
                view_bounds[node_id],
            )
            proof.update({"route": view["path"], "mode": mode})
            proofs.append(proof)
    for frame in library["reviewFrames"]:
        name = f'component-{components[frame["name"]]}.png'
        proof = preserve_export(
            arguments.source / name,
            destination / name,
            frame["id"],
            "component-review",
            {"width": frame["width"], "height": frame["height"]},
        )
        proof["component"] = frame["name"]
        proof["variants"] = len(frame["instances"])
        proofs.append(proof)
    if library.get("releaseCover"):
        cover = library["releaseCover"]
        proofs.append(
            preserve_export(
                arguments.source / "cover-1.2.png",
                destination / "cover-1.2.png",
                cover["id"],
                "release-cover",
                {"width": cover["width"], "height": cover["height"]},
            )
        )
    manifest = {
        "version": "1.2.0",
        "fileKey": library["fileKey"],
        "status": "exported-lossless-pixel-verification",
        "visualReviewStatus": "owner-review-required",
        "proofs": proofs,
    }
    (destination / "export-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "exports": len(proofs),
                "pixelIdentical": all(proof["pixelIdentical"] for proof in proofs),
                "bytes": sum(proof["bytes"] for proof in proofs),
                "visualReviewStatus": manifest["visualReviewStatus"],
            }
        )
    )


if __name__ == "__main__":
    main()
