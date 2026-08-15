"use client";

import { useMemo, useState } from "react";
import { Panel, EmptyState, PanelSkeleton, ErrorNote } from "@/components/ui/Panel";
import {
  AnimatedCloud,
  DeliveryTruckIcon,
  GlobeTruckLeafIcon,
  MapPinIcon,
  ScarecrowIcon,
} from "@/components/icons/CartoonIcons";
import { CROP_EMOJI, STATUS_META, formatDate, formatNumber } from "@/lib/status";
import type { GeoPoint, TraceMap, TraceMapPoint } from "@/lib/types";

/** The drawing surface. Everything is projected into this box. */
const VIEW = { width: 100, height: 62, pad: 12 };

interface PlottedPoint {
  point: TraceMapPoint;
  from: { x: number; y: number } | null;
  to: { x: number; y: number };
  moved: boolean;
}

function hasCoords(place?: GeoPoint | null): place is GeoPoint & { lat: number; lng: number } {
  return place?.lat != null && place?.lng != null;
}

/**
 * Projects lat/lng into the view box.
 *
 * This is a deliberately naive equirectangular fit over the bounding box of the
 * farmer's own batches — not a real map projection. At the scale of one farmer's
 * district that is visually indistinguishable from the real thing, and it keeps
 * the whole module dependency-free and offline-capable.
 */
function buildProjection(places: Array<{ lat: number; lng: number }>) {
  const lats = places.map((place) => place.lat);
  const lngs = places.map((place) => place.lng);

  // A single point (or a perfectly straight line of them) would collapse the
  // span to zero, so enforce a minimum window of roughly 20 km.
  const minSpan = 0.2;
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);

  const latSpan = Math.max(latMax - latMin, minSpan);
  const lngSpan = Math.max(lngMax - lngMin, minSpan);
  const latMid = (latMin + latMax) / 2;
  const lngMid = (lngMin + lngMax) / 2;

  const innerW = VIEW.width - VIEW.pad * 2;
  const innerH = VIEW.height - VIEW.pad * 2;

  return (lat: number, lng: number) => ({
    x: VIEW.pad + ((lng - (lngMid - lngSpan / 2)) / lngSpan) * innerW,
    // Latitude grows north, y grows down.
    y: VIEW.pad + ((latMid + latSpan / 2 - lat) / latSpan) * innerH,
  });
}

export interface TraceabilityMapProps {
  map: TraceMap | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * Traceability Map.
 *
 * A stylised, hand-drawn-looking field map rather than a tile map: the farm sits
 * at one end, the buyer at the other, and a dashed road connects them. Pins
 * carry the same status icons used everywhere else, so the map needs no legend
 * beyond the one the rest of the dashboard already taught.
 */
export function TraceabilityMap({ map, loading, error, onRetry }: TraceabilityMapProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const plotted = useMemo<PlottedPoint[]>(() => {
    if (!map || map.points.length === 0) return [];

    const anchors = map.points.flatMap((point) => {
      const places: Array<{ lat: number; lng: number }> = [];
      if (hasCoords(point.origin)) places.push({ lat: point.origin.lat, lng: point.origin.lng });
      if (hasCoords(point.current)) places.push({ lat: point.current.lat, lng: point.current.lng });
      return places;
    });

    if (anchors.length === 0) return [];
    const project = buildProjection(anchors);

    return map.points
      .filter((point) => hasCoords(point.current))
      .map((point) => {
        const to = project(point.current!.lat!, point.current!.lng!);
        const from = hasCoords(point.origin) ? project(point.origin.lat, point.origin.lng) : null;
        const moved = from ? Math.hypot(from.x - to.x, from.y - to.y) > 1.5 : false;
        return { point, from, to, moved };
      });
  }, [map]);

  const active = plotted.find((entry) => entry.point.batchCode === selected) ?? null;

  return (
    <Panel
      title="Traceability Map"
      subtitle="Where every batch started, and where it is right now."
      Icon={GlobeTruckLeafIcon}
      accent="bg-sky-100/80"
    >
      {error ? <ErrorNote message={error} onRetry={onRetry} /> : null}

      {loading && !map ? (
        <PanelSkeleton rows={3} />
      ) : plotted.length === 0 ? (
        !error ? (
          <EmptyState
            Icon={ScarecrowIcon}
            title="Nothing to trace yet"
            hint="Batches appear on the map as soon as they have a location — usually the moment you register them."
          />
        ) : null
      ) : (
        <div className="space-y-4">
          {/* The map. The illustrated backdrop and the routes are SVG; the pins
              sit on top as real buttons so they can be tabbed to and tapped. */}
          <div className="relative overflow-hidden rounded-cartoon border border-sky-200/40 bg-sky-50/50 shadow-inner backdrop-blur-sm">
            <svg
              viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
              className="h-auto w-full"
              role="img"
              aria-label="Map of your crop batches"
            >
              {/* Backdrop: sky, hills, fields, a river */}
              <defs>
                <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bae2fd" />
                  <stop offset="100%" stopColor="#e0f0fe" />
                </linearGradient>
              </defs>
              <rect width={VIEW.width} height={VIEW.height} fill="url(#sky-grad)" />
              <path d="M0 20 Q14 8 28 19 T56 18 T84 20 T100 15V0H0Z" fill="#bae2fd" />
              <path d="M0 24 Q18 12 34 23 T68 22 T100 25v37H0Z" fill="#dcfce3" />
              <path d="M0 34 Q24 27 48 35 T100 33v29H0Z" fill="#bbf7c9" />
              <path d="M0 46 Q26 40 52 47 T100 45v17H0Z" fill="#86efa0" opacity="0.75" />

              {/* Furrow texture — a few sketchy strokes read as farmland */}
              <g stroke="#4ade6f" strokeWidth="0.4" opacity="0.55" strokeLinecap="round">
                <path d="M6 40 Q22 36 40 41M10 50 Q30 45 52 51M56 38 Q74 34 94 39M60 53 Q78 49 96 54" fill="none" />
              </g>

              {/* Animated drifting clouds */}
              <AnimatedCloud y={3} delay={0} scale={0.8} opacity={0.5} />
              <AnimatedCloud y={6} delay={8} scale={0.6} opacity={0.35} />
              <AnimatedCloud y={1} delay={15} scale={0.5} opacity={0.25} />

              {/* River */}
              <path
                d="M-2 30 Q18 34 30 28 T58 30 T86 26 T102 30"
                stroke="#7dcbfc"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />

              {/* Journeys, drawn under the pins */}
              {plotted.map(({ point, from, to, moved }) =>
                from && moved ? (
                  <g key={`route-${point.batchCode}`}>
                    <path
                      d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 8} ${to.x} ${to.y}`}
                      stroke="#b36e3f"
                      strokeWidth="0.9"
                      strokeDasharray="2 1.6"
                      strokeLinecap="round"
                      fill="none"
                      opacity={selected && selected !== point.batchCode ? 0.25 : 0.85}
                    />
                    {/* The farm end of the journey */}
                    <circle cx={from.x} cy={from.y} r="1.4" fill="#955636" stroke="#fbf7f1" strokeWidth="0.5" />
                  </g>
                ) : null,
              )}

              {/* Ground shadow under each pin, so the overlay reads as planted
                  on the map rather than floating above it. */}
              {plotted.map(({ point, to }) => (
                <ellipse
                  key={`shadow-${point.batchCode}`}
                  cx={to.x}
                  cy={to.y}
                  rx="3"
                  ry="1"
                  fill="#145127"
                  opacity={selected && selected !== point.batchCode ? 0.08 : 0.2}
                />
              ))}
            </svg>

            {/* Pins */}
            {plotted.map(({ point, to }) => {
              const meta = STATUS_META[point.status];
              const isActive = selected === point.batchCode;
              const dimmed = selected != null && !isActive;

              return (
                <button
                  key={point.batchCode}
                  type="button"
                  onClick={() => setSelected(isActive ? null : point.batchCode)}
                  title={`${point.batchCode} — ${meta.label}`}
                  aria-pressed={isActive}
                  style={{
                    left: `${(to.x / VIEW.width) * 100}%`,
                    top: `${(to.y / VIEW.height) * 100}%`,
                    animation: isActive ? "pin-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" : undefined,
                  }}
                  className={`group absolute -translate-x-1/2 -translate-y-full rounded-full border bg-white/90 p-1 shadow-glass backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 ${
                    isActive ? "border-leaf-500/70 ring-4 ring-leaf-200/60 shadow-glow-leaf" : "border-white/70"
                  } ${dimmed ? "opacity-45" : "opacity-100"}`}
                >
                  <meta.Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span className="sr-only">
                    {point.batchCode} — {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selection detail */}
          {active ? (
            <div className="animate-scale-in rounded-cartoon border border-sky-200/40 bg-white/60 p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-3">
                <MapPinIcon className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-extrabold text-soil-900">
                    {active.point.batchCode} · {CROP_EMOJI[active.point.cropType] ?? "🌱"}{" "}
                    {active.point.cropType}
                  </p>
                  <p className="text-sm font-semibold text-soil-500">
                    {formatNumber(active.point.quantityKg)} kg · updated {formatDate(active.point.movedAt)}
                  </p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="btn-ghost px-3 py-1.5 text-sm">
                  Close
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Leg label="Left from" place={active.point.origin?.name ?? "Farm"} tone="earth" />
                <Leg label="Now at" place={active.point.current?.name ?? "In transit"} tone="leaf" />
              </div>
            </div>
          ) : null}

          {/* List — the map's accessible twin */}
          <ul className="grid gap-2 sm:grid-cols-2">
            {plotted.map(({ point, moved }) => {
              const meta = STATUS_META[point.status];
              const isActive = selected === point.batchCode;

              return (
                <li key={point.batchCode}>
                  <button
                    type="button"
                    onClick={() => setSelected(isActive ? null : point.batchCode)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-glass ${
                      isActive ? "border-leaf-400/60 bg-leaf-50/60" : "border-leaf-100/40 bg-white/50"
                    }`}
                  >
                    <meta.Icon className="h-8 w-8 transition-transform duration-300 group-hover:scale-110" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-extrabold text-soil-800">
                        {point.batchCode}
                      </span>
                      <span className="block truncate text-xs font-semibold text-soil-500">
                        {point.current?.name ?? "Location unknown"}
                      </span>
                    </span>
                    {moved ? <DeliveryTruckIcon className="h-7 w-7 opacity-80" title="Has travelled" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {map && map.unlocated > 0 ? (
            <p className="rounded-2xl border border-earth-100/40 bg-earth-50/50 px-3 py-2 text-xs font-semibold text-earth-800 backdrop-blur-sm">
              {map.unlocated} batch{map.unlocated === 1 ? "" : "es"} have no location recorded yet, so they are
              not drawn on the map.
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function Leg({ label, place, tone }: { label: string; place: string; tone: "earth" | "leaf" }) {
  const tones = {
    earth: "bg-earth-50/60 text-earth-900 border-earth-100/40",
    leaf: "bg-leaf-50/60 text-leaf-900 border-leaf-100/40",
  } as const;

  return (
    <div className={`rounded-2xl border px-3 py-2 backdrop-blur-sm ${tones[tone]}`}>
      <p className="text-[0.65rem] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="truncate font-display text-sm font-extrabold">{place}</p>
    </div>
  );
}
