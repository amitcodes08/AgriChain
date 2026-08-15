import type {
  Batch,
  BatchStats,
  BatchStatus,
  Farmer,
  Paged,
  RegisterBatchInput,
  RegisterBatchResult,
  TraceMap,
  WalletSummary,
} from "./types";

/**
 * Thin typed client for the AgriChain REST API.
 *
 * Every call funnels through `request()` so error handling is uniform: the API
 * returns `{ success, message, errors }` on failure, and a farmer should see
 * that message rather than "500 Internal Server Error".
 */

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "") + "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Paged<unknown>["meta"];
  /** Present only on failures — see `backend/src/middleware/error.ts`. */
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message: string }>;
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    // A network-level failure is the common case in a field demo — say so plainly.
    throw new ApiError("Cannot reach the AgriChain server. Is the backend running?", 0);
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Envelope<T>) : ({} as Envelope<T>);

  if (!response.ok || payload.success === false) {
    // Zod issues arrive as `error.details[{ field, message }]` — keyed by field so
    // the form can put each message under the input that caused it.
    const fieldErrors = Object.fromEntries(
      (payload.error?.details ?? [])
        .filter((issue) => issue.field && issue.field !== "(root)")
        .map((issue) => [issue.field as string, issue.message]),
    );
    throw new ApiError(
      payload.error?.message ?? payload.message ?? `Request failed (${response.status}).`,
      response.status,
      fieldErrors,
    );
  }

  return payload;
}

function jsonRequest<T>(path: string, method: string, body: unknown) {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* -------------------------------------------------------------------------- */
/* Batches                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Registers a batch. Sent as multipart so the photo streams straight through to
 * the AI service without a base64 round-trip.
 */
export async function registerBatch(input: RegisterBatchInput): Promise<RegisterBatchResult> {
  const form = new FormData();
  form.append("farmerWallet", input.farmerWallet);
  form.append("cropType", input.cropType);
  form.append("quantityKg", String(input.quantityKg));
  form.append("pricePerKg", String(input.pricePerKg));
  if (input.notes) form.append("notes", input.notes);
  if (input.harvestDate) form.append("harvestDate", input.harvestDate);
  if (input.originName) form.append("origin[name]", input.originName);
  if (input.photo) form.append("photo", input.photo);

  const { data } = await request<RegisterBatchResult>("/register-batch", { method: "POST", body: form });
  return data;
}

export interface BatchQuery {
  farmerWallet?: string;
  status?: BatchStatus;
  cropType?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "value";
}

export async function getBatches(query: BatchQuery = {}): Promise<Paged<Batch>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== null) params.set(key, String(value));
  }

  const response = await request<Batch[]>(`/get-batches?${params.toString()}`);
  return {
    data: response.data,
    meta: response.meta ?? { total: response.data.length, page: 1, limit: response.data.length, pages: 1 },
  };
}

export async function getBatchStats(farmerWallet?: string): Promise<BatchStats> {
  const suffix = farmerWallet ? `?farmerWallet=${encodeURIComponent(farmerWallet)}` : "";
  const { data } = await request<BatchStats>(`/batches/stats${suffix}`);
  return data;
}

export async function updateBatchStatus(payload: {
  batchId: string;
  status: BatchStatus;
  note?: string;
  buyerWallet?: string;
  location?: { name?: string };
}): Promise<Batch> {
  const { data } = await jsonRequest<{ batch: Batch }>("/update-status", "POST", payload);
  return data.batch;
}

/** Re-runs the AI check on a batch that registered without a usable report. */
export async function assessBatch(batchId: string, photo?: File | null): Promise<Batch> {
  const form = new FormData();
  form.append("batchId", batchId);
  if (photo) form.append("photo", photo);

  const { data } = await request<{ batch: Batch }>(`/batches/${encodeURIComponent(batchId)}/assess`, {
    method: "POST",
    body: form,
  });
  return data.batch;
}

/* -------------------------------------------------------------------------- */
/* Farmer                                                                     */
/* -------------------------------------------------------------------------- */

export async function getFarmer(wallet: string): Promise<Farmer> {
  const { data } = await request<Farmer>(`/farmers/${wallet}`);
  return data;
}

export async function upsertFarmer(input: {
  name: string;
  walletAddress: string;
  village?: string;
  district?: string;
  state?: string;
}): Promise<Farmer> {
  const { data } = await jsonRequest<Farmer>("/farmers", "PUT", input);
  return data;
}

export async function getWallet(wallet: string): Promise<WalletSummary> {
  const { data } = await request<WalletSummary>(`/farmers/${wallet}/wallet`);
  return data;
}

export async function getTraceMap(wallet: string): Promise<TraceMap> {
  const { data } = await request<TraceMap>(`/farmers/${wallet}/trace-map`);
  return data;
}
