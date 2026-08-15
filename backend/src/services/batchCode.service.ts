import { BatchModel } from "../models/Batch";

const PREFIX = "AGT";

/**
 * Generates the next human-facing batch code (AGT-001, AGT-002, …).
 *
 * Codes are short and speakable because farmers read them aloud over the phone.
 * Uniqueness is ultimately enforced by the unique index on `batchCode`; the retry
 * loop absorbs the race between two concurrent registrations picking the same
 * number.
 */
export async function nextBatchCode(): Promise<string> {
  const latest = await BatchModel.findOne({ batchCode: new RegExp(`^${PREFIX}-\\d+$`) })
    .sort({ createdAt: -1 })
    .select("batchCode")
    .lean();

  const lastNumber = latest ? Number(latest.batchCode.split("-")[1]) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${PREFIX}-${String(next).padStart(3, "0")}`;
}

/** Runs `create` with fresh codes until the unique index accepts one. */
export async function withUniqueBatchCode<T>(
  create: (batchCode: string) => Promise<T>,
  attempts = 5,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = await nextBatchCode();
    try {
      return await create(code);
    } catch (error) {
      const isDuplicate =
        typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
      if (!isDuplicate) throw error;
      lastError = error;
    }
  }

  throw lastError ?? new Error("Could not allocate a unique batch code");
}
