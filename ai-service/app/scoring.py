"""
Deterministic scoring engine for the simulated quality assessment.

Every crop has a profile: a baseline score, the defects that model is likely to
flag, and how it talks about ripeness. The per-image score is derived from a
SHA-256 fingerprint of the image bytes, which makes reports stable across calls
without any real computer vision — and keeps the demo honest: a different photo
of the same batch gives a different (but plausible) report, so the pipeline is
tested with real variety.
"""

from __future__ import annotations

import hashlib
import math
import os
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .models import AssessmentResponse

# Score at or above which a batch is marked verified. Mirrors QUALITY_THRESHOLD
# in the backend and `qualityThreshold` in AgriSupplyChain.sol — the three must
# move together or the layers will disagree about what "verified" means.
QUALITY_THRESHOLD = int(os.getenv("QUALITY_THRESHOLD", "60"))


@dataclass(frozen=True)
class CropProfile:
    base_score: int
    score_spread: int
    defects: list[str]
    ripeness_labels: list[str]
    note_templates: list[str]
    moisture_range: tuple[float, float] = (9.0, 16.0)


CROP_PROFILES: dict[str, CropProfile] = {
    "Potatoes": CropProfile(
        base_score=88,
        score_spread=9,
        defects=["minor bruising", "surface soil", "small green patches"],
        ripeness_labels=["firm, ready for market", "cured and shelf-stable"],
        note_templates=[
            "High grade, firm skin, minimal blemishes.",
            "Uniform size grading, good skin set.",
            "Clean lot, no sprouting detected.",
        ],
        moisture_range=(78.0, 84.0),
    ),
    "Wheat": CropProfile(
        base_score=90,
        score_spread=8,
        defects=["slight moisture elevation", "light weed seeds", "immature grains"],
        ripeness_labels=["harvest-ready, moisture within range", "fully matured grains"],
        note_templates=[
            "Excellent grain fill, moisture within range.",
            "Uniform kernel size, low foreign matter.",
            "Strong test weight, clean sample.",
        ],
        moisture_range=(9.0, 14.0),
    ),
    "Tomatoes": CropProfile(
        base_score=85,
        score_spread=11,
        defects=["soft spots", "cracking around the stem", "minor sunscald", "over-ripe fruit"],
        ripeness_labels=["optimal for transport", "breaker stage", "table-ripe"],
        note_templates=[
            "Ripeness optimal, transport within 48 hours.",
            "Good firmness, minimal cracking.",
            "Consistent red colour, field heat handled well.",
        ],
        moisture_range=(92.0, 95.0),
    ),
    "Rice": CropProfile(
        base_score=88,
        score_spread=7,
        defects=["paddy husk debris", "chalky grains", "slight moisture elevation"],
        ripeness_labels=["fully dried, mill-ready", "storage-safe moisture"],
        note_templates=[
            "Clean paddy, milling yield looks strong.",
            "Uniform grain size, low chalk content.",
            "Well-dried lot, safe for storage.",
        ],
        moisture_range=(11.0, 15.0),
    ),
    "Onions": CropProfile(
        base_score=84,
        score_spread=10,
        defects=["thin necks not fully cured", "surface soil", "split bulbs"],
        ripeness_labels=["cured, good storage potential", "semi-cured"],
        note_templates=[
            "Good size grading, a little surface soil.",
            "Well-cured necks, good storage potential.",
            "Uniform bulbs, minimal sprouting.",
        ],
        moisture_range=(86.0, 90.0),
    ),
    "Mangoes": CropProfile(
        base_score=86,
        score_spread=12,
        defects=["sap burn on skin", "minor blemish spots", "uneven ripening"],
        ripeness_labels=["ripe and ready", "slightly firm, will ripen in transit"],
        note_templates=[
            "Sweet aroma, consistent colour, market-ready.",
            "Firm fruit with good shelf life.",
            "High-quality pulp, minimal sap burn.",
        ],
        moisture_range=(80.0, 86.0),
    ),
}


def assess_image(
    crop_type: str,
    image_bytes: bytes,
    model_version: str,
) -> AssessmentResponse:
    """Produces the standardised report for one image of one crop."""
    profile = CROP_PROFILES.get(crop_type, CROP_PROFILES["Tomatoes"])
    fingerprint = _fingerprint(crop_type, image_bytes)

    score = _score_from_fingerprint(profile, fingerprint)
    passed = score >= QUALITY_THRESHOLD

    # Images that carry no pixels (registration without a photo) are scored with
    # lower confidence so callers can tell the difference at a glance.
    confidence = 0.91 if image_bytes else 0.62

    defects = _defects_from_fingerprint(profile, fingerprint)
    ripeness = _pick(profile.ripeness_labels, fingerprint, 1)
    moisture = round(profile.moisture_range[0] + fingerprint[8] / 255 * (profile.moisture_range[1] - profile.moisture_range[0]), 1)
    note = _pick(profile.note_templates, fingerprint, 2)

    if defects:
        note = f"{note} Flagged: {defects[0]}."

    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D"

    return AssessmentResponse(
        quality_score=score,
        verified=passed,
        grade=grade,
        details=note,
        defects=defects,
        ripeness=ripeness,
        moisture_pct=moisture,
        confidence=round(confidence, 2),
        model_version=model_version,
        assessed_at=datetime.now(timezone.utc),
    )


def _fingerprint(crop_type: str, image_bytes: bytes) -> bytes:
    """Stable 32-byte digest combining crop type and image content."""
    return hashlib.sha256(f"{crop_type}::{len(image_bytes)}".encode() + image_bytes).digest()


def _score_from_fingerprint(profile: CropProfile, fingerprint: bytes) -> int:
    """Maps the digest to a score near the crop's baseline, with a light bias so a
    handful of batches never all land on the same number."""
    raw = int.from_bytes(fingerprint[:4], "big")
    spread = profile.score_spread * 2
    offset = (raw % spread) - profile.score_spread  # -spread..+spread
    score = profile.base_score + offset
    return max(40, min(98, score))


def _defects_from_fingerprint(profile: CropProfile, fingerprint: bytes) -> list[str]:
    """0–2 defects per batch, derived from the digest."""
    flags = int.from_bytes(fingerprint[4:6], "big")
    selected: list[str] = []
    for index, defect in enumerate(profile.defects):
        if (flags >> index) % 3 == 0:  # roughly one-third of lots flag any given defect
            selected.append(defect)
    return selected[:2]


def _pick(options: list[str], fingerprint: bytes, salt: int) -> str:
    index = int.from_bytes(fingerprint[8 + salt : 12 + salt], "big") % len(options)
    return options[index]
