"""
AgriChain Trace — AI quality assessment microservice (simulation).

This service stands in for a real crop-vision model. It accepts a photo of a
harvested batch and returns the same standardised JSON contract a production
model would, so the rest of the stack can be built and tested end to end without
an ML dependency.

Scoring is deterministic: the same image bytes and crop type always produce the
same report. That makes demos repeatable and integration tests stable. Swapping
in a real model means replacing `assess_image` and nothing else.
"""

from __future__ import annotations

import hashlib
import io
import logging
import os
import time
from datetime import datetime, timezone
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import (
    AssessmentResponse,
    BatchAssessmentRequest,
    BatchAssessmentResponse,
    HealthResponse,
)
from .scoring import CROP_PROFILES, assess_image

logger = logging.getLogger("agrichain.ai")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

MODEL_VERSION = "agri-vision-sim-1.2.0"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 8 * 1024 * 1024))
ALLOWED_MIME_PREFIX = "image/"

app = FastAPI(
    title="AgriChain Trace — AI Quality Service",
    description=(
        "Simulated crop quality assessment. Returns a standardised quality report "
        "for a batch photo so the traceability pipeline has a verifiable score."
    ),
    version=MODEL_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STARTED_AT = time.time()


@app.get("/health", response_model=HealthResponse, tags=["ops"])
def health() -> HealthResponse:
    """Liveness probe used by docker-compose and the backend health endpoint."""
    return HealthResponse(
        status="ok",
        service="agrichain-ai",
        model_version=MODEL_VERSION,
        supported_crops=sorted(CROP_PROFILES.keys()),
        uptime_seconds=round(time.time() - STARTED_AT, 1),
    )


@app.post("/assess", response_model=AssessmentResponse, tags=["quality"])
async def assess(
    crop_type: Annotated[str, Form(description="Crop name, e.g. 'Potatoes'")] = "Unknown",
    file: Annotated[UploadFile | None, File(description="Batch photo")] = None,
) -> AssessmentResponse:
    """
    Assess a single batch photo.

    The photo is optional: a farmer with a poor connection may register a batch
    without one, and the service still returns a (lower-confidence) report rather
    than blocking the registration.
    """
    payload = b""
    filename = None

    if file is not None:
        if file.content_type and not file.content_type.startswith(ALLOWED_MIME_PREFIX):
            raise HTTPException(
                status_code=415,
                detail=f"Expected an image, received '{file.content_type}'.",
            )

        payload = await _read_capped(file)
        filename = file.filename

    report = assess_image(
        crop_type=crop_type,
        image_bytes=payload,
        model_version=MODEL_VERSION,
    )

    logger.info(
        "assessed crop=%s file=%s bytes=%d score=%d verified=%s",
        crop_type,
        filename,
        len(payload),
        report.quality_score,
        report.verified,
    )

    return report


@app.post("/assess/batch", response_model=BatchAssessmentResponse, tags=["quality"])
def assess_batch(request: BatchAssessmentRequest) -> BatchAssessmentResponse:
    """
    Score several batches at once from their metadata alone.

    Used by the backend when re-scoring historical records that have no photo on
    hand — for example after a model upgrade.
    """
    reports = [
        assess_image(
            crop_type=item.crop_type,
            image_bytes=item.reference.encode("utf-8"),
            model_version=MODEL_VERSION,
        )
        for item in request.items
    ]

    return BatchAssessmentResponse(
        count=len(reports),
        model_version=MODEL_VERSION,
        assessed_at=datetime.now(timezone.utc),
        reports=reports,
    )


@app.get("/crops", tags=["quality"])
def crops() -> JSONResponse:
    """Crop profiles the simulator knows about, with their scoring characteristics."""
    return JSONResponse(
        {
            "model_version": MODEL_VERSION,
            "crops": [
                {
                    "name": name,
                    "base_score": profile.base_score,
                    "typical_defects": profile.defects,
                    "ripeness_labels": profile.ripeness_labels,
                }
                for name, profile in sorted(CROP_PROFILES.items())
            ],
        }
    )


async def _read_capped(file: UploadFile) -> bytes:
    """Reads an upload in chunks, rejecting anything past the size cap."""
    buffer = io.BytesIO()
    total = 0

    while chunk := await file.read(64 * 1024):
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Photo is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )
        buffer.write(chunk)

    return buffer.getvalue()


def image_fingerprint(payload: bytes) -> str:
    """Stable identifier for an uploaded image — used in logs and report hashes."""
    return hashlib.sha256(payload).hexdigest()[:16]
