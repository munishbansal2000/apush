from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ContentRecord:
    uid: str
    kind: str
    source_path: Path
    pointer: str
    data: dict[str, Any]
    answer_key: str | None = None
    container_id: str | None = None

    def public(self) -> dict[str, Any]:
        value = asdict(self)
        value["source_path"] = str(self.source_path)
        return value


@dataclass
class Finding:
    record_id: str
    source_file: str
    pointer: str
    gate: str
    severity: str
    message: str
    evidence: dict[str, Any] = field(default_factory=dict)
    proposed_change: dict[str, Any] | None = None

    def public(self) -> dict[str, Any]:
        return asdict(self)
