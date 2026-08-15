"""Request and response schemas for the AI quality service."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AssessmentResponse(BaseModel):
    """
    Standardised quality report.

    Field names are snake_case because this is the wire contract the Node backend
    normalises from; changing them is a breaking API change.
    """

    quality_score: int = Field(..., ge=0, le=100, description="Overall quality, 0–100")
    verified: bool = Field(..., description="True when the score clears the pass threshold")
    grade: str = Field(..., description="Letter grade: A, B, C or D")
    details: str = Field(..., description="Human-readable summary for the farmer")
    defects: list[str] = Field(default_factory=list, description="Detected issues, if any")
    ripeness: str = Field(..., description="Ripeness classification")
    moisture_pct: float = Field(..., ge=0, le=100, description="Estimated moisture content")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence in the score")
    model_version: str
    assessed_at: datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "quality_score": 92,
                "verified": True,
                "grade": "A",
                "details": "High grade, ripeness optimal",
                "defects": [],
                "ripeness": "optimal",
                "moisture_pct": 11.4,
                "confidence": 0.94,
                "model_version": "agri-vision-sim-1.2.0",
                "assessed_at": "2026-08-09T10:15:00Z",
            }
        }
    }


class BatchAssessmentItem(BaseModel):
    crop_type: str = Field(..., description="Crop name, e.g. 'Wheat'")
    reference: str = Field(..., description="Stable reference (batch code) used as the scoring seed")


class BatchAssessmentRequest(BaseModel):
    items: list[BatchAssessmentItem] = Field(..., min_length=1, max_length=100)


class BatchAssessmentResponse(BaseModel):
    count: int
    model_version: str
    assessed_at: datetime
    reports: list[AssessmentResponse]


class HealthResponse(BaseModel):
    status: str
    service: str
    model_version: str
    supported_crops: list[str]
    uptime_seconds: float
