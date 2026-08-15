import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)

# A tiny valid PNG (1×1, hand-crafted header) — enough for the simulator to fingerprint.
TINY_PNG = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model_version"].startswith("agri-vision")
    assert "Potatoes" in body["supported_crops"]


def test_assess_with_photo():
    response = client.post(
        "/assess",
        data={"crop_type": "Potatoes"},
        files={"file": ("potatoes.jpg", TINY_PNG, "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()

    assert 0 <= body["quality_score"] <= 100
    assert body["verified"] == (body["quality_score"] >= 60)
    assert body["grade"] in {"A", "B", "C", "D"}
    assert body["details"]
    assert body["ripeness"]
    assert 0 <= body["moisture_pct"] <= 100
    assert 0 <= body["confidence"] <= 1
    assert body["model_version"].startswith("agri-vision")
    assert body["assessed_at"]


def test_assessment_is_deterministic():
    first = client.post(
        "/assess",
        data={"crop_type": "Wheat"},
        files={"file": ("w.jpg", TINY_PNG, "image/jpeg")},
    ).json()
    second = client.post(
        "/assess",
        data={"crop_type": "Wheat"},
        files={"file": ("w.jpg", TINY_PNG, "image/jpeg")},
    ).json()
    assert first["quality_score"] == second["quality_score"]
    assert first["details"] == second["details"]
    assert first["ripeness"] == second["ripeness"]


def test_assess_without_photo_still_scores():
    response = client.post("/assess", data={"crop_type": "Tomatoes"})
    assert response.status_code == 200
    body = response.json()
    assert body["quality_score"] >= 40
    assert body["confidence"] < 0.9  # lower confidence without pixels


def test_assess_rejects_non_image():
    response = client.post(
        "/assess",
        data={"crop_type": "Wheat"},
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 415


def test_assess_rejects_oversized_upload():
    big = b"\x00" * (9 * 1024 * 1024)
    response = client.post(
        "/assess",
        data={"crop_type": "Wheat"},
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert response.status_code == 413


def test_batch_assessment():
    response = client.post(
        "/assess/batch",
        json={
            "items": [
                {"crop_type": "Potatoes", "reference": "AGT-001"},
                {"crop_type": "Wheat", "reference": "AGT-002"},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert len(body["reports"]) == 2


def test_crops_catalogue():
    response = client.get("/crops")
    assert response.status_code == 200
    names = {crop["name"] for crop in response.json()["crops"]}
    assert {"Potatoes", "Wheat", "Tomatoes", "Mangoes"} <= names
