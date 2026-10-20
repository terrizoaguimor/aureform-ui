#!/usr/bin/env python3
"""Scan the files Git will publish, including the contents of release ZIPs.

Only paths, detector names and line numbers are printed. Secret values are
never included in a report. This does not replace GitHub secret scanning.
"""

import json
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

ROOT = Path(__file__).resolve().parent.parent
DETECTORS = {
    "OpenAI API key": re.compile(rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}"),
    "GitHub token": re.compile(rb"\b(?:gh[pousr]_[A-Za-z0-9_]{25,}|github_pat_[A-Za-z0-9_]{25,})"),
    "AWS access key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "Slack token": re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,}"),
    "Stripe secret key": re.compile(rb"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}"),
    "Signed JWT": re.compile(rb"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{16,}"),
    "Private key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "Credential in URL": re.compile(rb"https?://[^/\s\"<>:@]+:[^/\s\"<>@]{8,}@"),
    "Signed download URL": re.compile(rb"[?&](?:X-Amz-Signature|X-Goog-Signature|access_token|refresh_token)=[A-Za-z0-9_%.-]{16,}", re.I),
    "Private deployment metadata": re.compile(rb"https?://[^\s/\"<>]+\.chatgpt\.site\b|https?://git\.chatgpt-team\.site\b|appgprj_[A-Za-z0-9_-]{12,}"),
}
PRIVATE_DIRS = {".openai", ".config", ".codex", ".claude", ".cursor", ".cloudflare", ".wrangler", "node_modules", "artifacts", "test-results", "playwright-report"}
PRIVATE_NAMES = {".npmrc", "id_rsa", "id_ed25519"}
PRIVATE_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".log"}
findings = []
scanned = 0
archive_entries = 0


def private_path(name):
    parts = PurePosixPath(name.rsplit("!", 1)[-1]).parts
    leaf = parts[-1] if parts else ""
    return (
        any(part in PRIVATE_DIRS for part in parts)
        or leaf in PRIVATE_NAMES
        or (leaf.startswith(".env") and leaf != ".env.example")
        or (leaf.startswith(".dev.vars") and leaf != ".dev.vars.example")
        or PurePosixPath(leaf).suffix in PRIVATE_SUFFIXES
        or bool(re.match(r"(?:credentials|service-account|cookies|storage-state).*\.json$", leaf, re.I))
    )


def scan(name, data):
    global scanned
    scanned += 1
    if private_path(name):
        findings.append({"path": name, "detector": "Private file"})
    for detector, pattern in DETECTORS.items():
        for match in pattern.finditer(data):
            findings.append({"path": name, "detector": detector, "line": data[: match.start()].count(b"\n") + 1})


result = subprocess.run(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    cwd=ROOT, check=True, capture_output=True,
)
names = sorted(set(result.stdout.decode().split("\0")) - {""})
for name in names:
    path = ROOT / name
    if not path.is_file():
        continue
    if path.is_symlink():
        findings.append({"path": name, "detector": "Symbolic link; inspect before publication"})
        continue
    scan(name, path.read_bytes())
    if path.suffix == ".zip":
        try:
            with ZipFile(path) as archive:
                for entry in archive.infolist():
                    if entry.is_dir():
                        continue
                    archive_entries += 1
                    internal = PurePosixPath(entry.filename)
                    if internal.is_absolute() or ".." in internal.parts or "\\" in entry.filename:
                        findings.append({"path": f"{name}!{entry.filename}", "detector": "Unsafe archive path"})
                        continue
                    if entry.file_size > 200 * 1024 * 1024:
                        findings.append({"path": f"{name}!{entry.filename}", "detector": "Oversized archive entry"})
                        continue
                    scan(f"{name}!{entry.filename}", archive.read(entry))
        except BadZipFile:
            findings.append({"path": name, "detector": "Invalid ZIP"})

print(json.dumps({
    "status": "failed" if findings else "passed",
    "gitFiles": len(names),
    "scannedFilesAndArchiveEntries": scanned,
    "archiveEntries": archive_entries,
    "findings": findings,
}, indent=2))
sys.exit(1 if findings else 0)
