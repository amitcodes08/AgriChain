"use client";

import { useRef, useState } from "react";
import { CameraIcon, HandPlantingSeedIcon, QualityBadgeIcon, RobotInspectIcon } from "@/components/icons/CartoonIcons";
import { Panel } from "@/components/ui/Panel";
import { ApiError, registerBatch } from "@/lib/api";
import { CROP_EMOJI, formatTokens, gradeClasses } from "@/lib/status";
import { CROP_TYPES, type Batch, type CropType, type QualityReport } from "@/lib/types";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

interface FormState {
  cropType: CropType;
  quantityKg: string;
  pricePerKg: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  cropType: "Potatoes",
  quantityKg: "",
  pricePerKg: "",
  notes: "",
};

export interface RegisterBatchFormProps {
  wallet: string | null;
  onRegistered: (batch: Batch) => void;
}

/**
 * Register New Batch.
 *
 * The photo area is the centrepiece: dropping a picture in it runs the AI
 * quality assessment as part of registration, and the resulting grade appears
 * inline so the farmer sees the payoff immediately rather than hunting for it in
 * a list.
 */
export function RegisterBatchForm({ wallet, onRegistered }: RegisterBatchFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ batch: Batch; report: QualityReport | null; aiOnline: boolean } | null>(
    null,
  );
  const fileInput = useRef<HTMLInputElement>(null);

  const quantity = Number(form.quantityKg) || 0;
  const price = Number(form.pricePerKg) || 0;
  const estimatedValue = quantity * price;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function acceptPhoto(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("That file is not a photo. Please pick a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("That photo is larger than 8 MB. Try a smaller one.");
      return;
    }

    setError(null);
    setPhoto(file);
    // Revoke the previous object URL so repeated picks don't leak blobs.
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function clearPhoto() {
    setPhoto(null);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet) {
      setError("Connect your wallet first — a batch has to belong to someone.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    setResult(null);

    try {
      const registered = await registerBatch({
        farmerWallet: wallet,
        cropType: form.cropType,
        quantityKg: quantity,
        pricePerKg: price,
        notes: form.notes || undefined,
        photo,
      });

      setResult({
        batch: registered.batch,
        report: registered.qualityReport,
        aiOnline: registered.aiOnline,
      });
      onRegistered(registered.batch);

      setForm(EMPTY_FORM);
      clearPhoto();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fieldErrors);
      } else {
        setError("Something went wrong while registering the batch.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel
      title="Register New Batch"
      subtitle="Plant it in the ledger — one form, one photo, done."
      Icon={HandPlantingSeedIcon}
      accent="bg-sunny-100/80"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Crop type */}
          <div className="sm:col-span-2">
            <label htmlFor="cropType" className="label-cartoon">
              <span className="text-sm font-semibold text-soil-600">What did you harvest?</span>
            </label>
            <div className="relative">
              <select
                id="cropType"
                value={form.cropType}
                onChange={(event) => update("cropType", event.target.value as CropType)}
                className="input-cartoon appearance-none pr-12 text-base"
              >
                {CROP_TYPES.map((crop) => (
                  <option key={crop} value={crop}>
                    {CROP_EMOJI[crop] ?? "🌱"}  {crop}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-leaf-600">
                ▾
              </span>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantityKg" className="label-cartoon">
              <span className="text-sm font-semibold text-soil-600">How much? (kg)</span>
            </label>
            <input
              id="quantityKg"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              required
              placeholder="e.g. 1200"
              value={form.quantityKg}
              onChange={(event) => update("quantityKg", event.target.value)}
              className="input-cartoon"
            />
            {fieldErrors.quantityKg ? (
              <p className="mt-1 text-xs font-bold text-sunny-800">{fieldErrors.quantityKg}</p>
            ) : null}
          </div>

          {/* Price */}
          <div>
            <label htmlFor="pricePerKg" className="label-cartoon">
              <span className="text-sm font-semibold text-soil-600">Your price (AGRI per kg)</span>
            </label>
            <input
              id="pricePerKg"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              required
              placeholder="e.g. 18.50"
              value={form.pricePerKg}
              onChange={(event) => update("pricePerKg", event.target.value)}
              className="input-cartoon"
            />
            {fieldErrors.pricePerKg ? (
              <p className="mt-1 text-xs font-bold text-sunny-800">{fieldErrors.pricePerKg}</p>
            ) : null}
          </div>
        </div>

        {/* Photo drop zone → AI quality assessment */}
        <div>
          <span className="label-cartoon">
            <span className="text-sm font-semibold text-soil-600">Add a photo for the AI quality check</span>
          </span>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptPhoto(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`group relative overflow-hidden rounded-cartoon border transition-all duration-300 ${
              dragging
                ? "border-sky-400 bg-sky-50/70 shadow-glow-sky backdrop-blur-sm"
                : "border-dashed border-sky-200/70 bg-sky-50/40 backdrop-blur-sm hover:border-sky-300 hover:bg-sky-50/60"
            }`}
          >
            {preview ? (
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not a remote asset */}
                <img
                  src={preview}
                  alt="Your crop"
                  className="h-32 w-full rounded-2xl object-cover shadow-glass sm:w-40"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-extrabold text-sky-900">{photo?.name}</p>
                  <p className="text-sm font-semibold text-sky-700">
                    {((photo?.size ?? 0) / 1024).toFixed(0)} KB · ready for inspection
                  </p>
                  <button type="button" onClick={clearPhoto} className="btn-ghost mt-2 px-3 py-1.5 text-sm">
                    Choose a different photo
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center gap-2 px-6 py-8 text-center"
              >
                <CameraIcon className="h-16 w-16 transition-transform duration-300 group-hover:scale-110" />
                <span className="font-display text-base font-extrabold text-sky-900">
                  Tap to add a photo, or drop one here
                </span>
                <span className="max-w-sm text-sm font-semibold text-sky-700">
                  Our AI inspector grades ripeness, moisture and defects in a couple of seconds.
                </span>
              </button>
            )}

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => acceptPhoto(event.target.files?.[0] ?? null)}
            />
          </div>

          <p className="mt-1.5 text-xs font-semibold text-soil-500">
            No photo handy? You can still register — the batch just waits at "Planted" until it is checked.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="label-cartoon">
            <span className="text-sm font-semibold text-soil-600">Anything the buyer should know? (optional)</span>
          </label>
          <textarea
            id="notes"
            rows={2}
            maxLength={1000}
            placeholder="Rain-fed, harvested this morning…"
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            className="input-cartoon resize-none"
          />
        </div>

        {/* Estimated value + submit */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-cartoon px-4 py-3"
          style={{ background: "linear-gradient(135deg, rgb(240 253 242 / 0.8) 0%, rgb(220 252 227 / 0.6) 100%)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-leaf-700">Batch is worth</p>
            <p className="font-display text-2xl font-extrabold text-leaf-900">
              {formatTokens(estimatedValue)}
            </p>
          </div>

          <button type="submit" disabled={submitting || !wallet} className="btn-primary group">
            <HandPlantingSeedIcon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
            {submitting ? "Planting…" : "Register Batch"}
          </button>
        </div>

        {!wallet ? (
          <p className="rounded-2xl border border-sunny-200/50 bg-sunny-100/60 px-4 py-2 text-sm font-bold text-sunny-900 backdrop-blur-sm">
            Connect your wallet at the top to register a batch.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-sunny-300/50 bg-sunny-50/70 px-4 py-3 text-sm font-bold text-sunny-900 backdrop-blur-sm">
            {error}
          </p>
        ) : null}

        {result ? <RegistrationReceipt {...result} /> : null}
      </form>
    </Panel>
  );
}

/** Shown right after a successful registration — the AI verdict, in full. */
function RegistrationReceipt({
  batch,
  report,
  aiOnline,
}: {
  batch: Batch;
  report: QualityReport | null;
  aiOnline: boolean;
}) {
  return (
    <div className="animate-scale-in rounded-cartoon border border-leaf-300/50 bg-leaf-50/60 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3">
        <RobotInspectIcon className="h-12 w-12 animate-float-soft" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold text-leaf-900">
            {batch.batchCode} is registered!
          </p>
          <p className="text-sm font-semibold text-leaf-700">
            {batch.quantityKg} kg of {batch.cropType} · {formatTokens(batch.totalValue)}
          </p>
        </div>

        {report ? (
          <div className="flex items-center gap-2">
            <QualityBadgeIcon className="h-10 w-10" />
            <div className="text-right">
              <p className="font-display text-2xl font-extrabold leading-none text-leaf-900">
                {report.qualityScore}
                <span className="text-base text-leaf-600">/100</span>
              </p>
              {report.grade ? (
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 font-display text-xs font-extrabold ${gradeClasses(report.grade)}`}
                >
                  Grade {report.grade}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {report?.details ? (
        <p className="mt-3 rounded-2xl border border-white/50 bg-white/60 px-3 py-2 font-accent text-sm italic text-soil-700 backdrop-blur-sm">
          &ldquo;{report.details}&rdquo;
        </p>
      ) : null}

      {report && report.defects && report.defects.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.defects.map((defect) => (
            <span
              key={defect}
              className="rounded-full border border-sunny-200/50 bg-sunny-100/70 px-2.5 py-0.5 text-xs font-bold text-sunny-900 backdrop-blur-sm"
            >
              {defect}
            </span>
          ))}
        </div>
      ) : null}

      {!aiOnline ? (
        <p className="mt-2 font-accent text-xs italic text-sunny-800">
          The AI inspector was offline, so this is a provisional score. Re-run the check from the batch card
          when you are back online.
        </p>
      ) : null}
    </div>
  );
}
