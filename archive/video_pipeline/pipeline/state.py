from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from .common import atomic_json, canonical_hash, read_json

STAGES = ("validated", "stills", "planned", "clips", "tts", "rendered", "complete")


class Checkpoint:
    def __init__(self, path: Path, lesson_id: str, manifest: dict):
        self.path = path
        self.lesson_id = lesson_id
        self.manifest_hash = canonical_hash(manifest)
        self.data: dict[str, Any] = {}
        if path.exists():
            value = read_json(path)
            if isinstance(value, dict) and value.get("lesson_id") == lesson_id:
                self.data = value
        if self.data.get("manifest_hash") != self.manifest_hash:
            self.data = {"lesson_id": lesson_id, "manifest_hash": self.manifest_hash, "stages": {}}

    def current(self, stage: str, fingerprint: str) -> bool:
        row = self.data.get("stages", {}).get(stage, {})
        return row.get("status") == "complete" and row.get("fingerprint") == fingerprint

    def record(self, stage: str, fingerprint: str, artifacts: list[str] | None = None, details: dict | None = None) -> None:
        self.data.setdefault("stages", {})[stage] = {
            "status": "complete", "fingerprint": fingerprint,
            "artifacts": artifacts or [], "details": details or {},
            "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        self.data["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        atomic_json(self.path, self.data)
