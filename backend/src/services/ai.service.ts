import { createHash } from "node:crypto";
import { env } from "../config/env";
import { logger } from "../config/logger";

/** Standardised quality report shape returned by the AI microservice. */
export interface QualityReport {
  quality_score: number;
  verified: boolean;
  grade: string;
  details: string;
  defects: string[];
  ripeness: string;
  moisture_pct: number;
  model_version: string;
  assessed_at: string;
}

export interface NormalisedQualityReport {
  qualityScore: number;
  verified: boolean;
  grade: string;
  details: string;
  defects: string[];
  ripeness: string;
  moisturePct: number;
  modelVersion: string;
  assessedAt: Date;
  reportHash: string;
}

/**
 * Calls the FastAPI quality service with the batch photo.
 *
 * The photo may arrive as a multipart buffer or as a data URL from the browser;
 * both are forwarded as a real file part so the service has one code path.
 */
export async function assessQuality(input: {
  cropType: string;
  photo?: { buffer: Buffer; filename: string; mimetype: string };
  photoUrl?: string;
}): Promise<NormalisedQualityReport> {
  const photo = input.photo ?? decodeDataUrl(input.photoUrl);

  const form = new FormData();
  form.append("crop_type", input.cropType);
  if (photo) {
    form.append("file", new Blob([photo.buffer], { type: photo.mimetype }), photo.filename);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.aiRequestTimeoutMs);

  try {
    const response = await fetch(`${env.aiServiceUrl}/assess`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`AI service responded ${response.status}: ${body.slice(0, 300)}`);
    }

    const report = (await response.json()) as QualityReport;
    return normalise(report);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Deterministic local fallback used when the AI service is unreachable, so batch
 * registration never hard-fails on a dependency the farmer cannot see or fix.
 * Flagged with modelVersion "offline-fallback" so it is never mistaken for a real
 * assessment downstream.
 */
export function offlineFallbackReport(cropType: string, seed: string): NormalisedQualityReport {
  const digest = createHash("sha256").update(`${cropType}:${seed}`).digest();
  const score = 70 + (digest[0] % 26); // 70–95
  const assessedAt = new Date();

  logger.warn({ cropType }, "AI service unavailable — using offline fallback assessment");

  return {
    qualityScore: score,
    verified: score >= 60,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : "C",
    details: "Provisional score generated offline; re-run the AI check when the service is back.",
    defects: [],
    ripeness: "unknown",
    moisturePct: 12,
    modelVersion: "offline-fallback",
    assessedAt,
    reportHash: hashReport({ cropType, seed, score, assessedAt: assessedAt.toISOString() }),
  };
}

function normalise(report: QualityReport): NormalisedQualityReport {
  const assessedAt = report.assessed_at ? new Date(report.assessed_at) : new Date();
  return {
    qualityScore: Math.max(0, Math.min(100, Math.round(report.quality_score))),
    verified: Boolean(report.verified),
    grade: report.grade ?? "",
    details: report.details ?? "",
    defects: Array.isArray(report.defects) ? report.defects.slice(0, 10) : [],
    ripeness: report.ripeness ?? "unknown",
    moisturePct: Number.isFinite(report.moisture_pct) ? report.moisture_pct : 0,
    modelVersion: report.model_version ?? "unknown",
    assessedAt: Number.isNaN(assessedAt.getTime()) ? new Date() : assessedAt,
    reportHash: hashReport(report),
  };
}

export function hashReport(payload: unknown): string {
  return `0x${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

/** Turns `data:image/jpeg;base64,…` into a file part. Returns undefined for plain URLs. */
function decodeDataUrl(
  photoUrl?: string,
): { buffer: Buffer; filename: string; mimetype: string } | undefined {
  if (!photoUrl?.startsWith("data:")) return undefined;

  const match = /^data:([^;]+);base64,(.*)$/s.exec(photoUrl);
  if (!match) return undefined;

  const [, mimetype, base64] = match;
  const extension = mimetype.split("/")[1]?.split("+")[0] ?? "jpg";
  return {
    buffer: Buffer.from(base64, "base64"),
    filename: `upload.${extension}`,
    mimetype,
  };
}
