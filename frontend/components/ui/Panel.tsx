import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@/components/icons/CartoonIcons";

/**
 * Every dashboard module wears the same frame: a big illustrated icon in a soft
 * medallion, a heading, a one-line explanation in plain language, and an
 * optional action slot. Consistency here is what makes the dashboard learnable
 * after seeing one panel.
 */
export interface PanelProps {
  title: string;
  subtitle?: string;
  Icon: ComponentType<IconProps>;
  /** Tailwind background for the icon medallion. */
  accent?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({
  title,
  subtitle,
  Icon,
  accent = "bg-leaf-100/80",
  action,
  children,
  className = "",
}: PanelProps) {
  return (
    <section className={`card-cartoon group/panel animate-fade-in-up p-5 sm:p-6 ${className}`}>
      <header className="mb-5 flex flex-wrap items-start gap-4">
        <div
          className={`medallion-glow group grid h-16 w-16 shrink-0 place-items-center rounded-blob ${accent} shadow-glass backdrop-blur-sm`}
        >
          <Icon className="icon-hover h-11 w-11" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="panel-title">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm font-semibold text-soil-500">{subtitle}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      {children}
    </section>
  );
}

/** Friendly empty state — a scarecrow beats a blank box. */
export function EmptyState({
  Icon,
  title,
  hint,
  action,
}: {
  Icon: ComponentType<IconProps>;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="group flex flex-col items-center gap-3 rounded-cartoon border border-dashed border-leaf-200/60 bg-leaf-50/40 px-6 py-10 text-center backdrop-blur-sm">
      <Icon className="icon-hover h-20 w-20 animate-float-soft" />
      <p className="font-display text-lg font-extrabold text-soil-800">{title}</p>
      {hint ? <p className="max-w-sm text-sm font-semibold text-soil-500">{hint}</p> : null}
      {action}
    </div>
  );
}

/** A single headline number with its own colour family. */
export function StatTile({
  label,
  value,
  sublabel,
  tone = "leaf",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "leaf" | "sunny" | "sky" | "earth";
}) {
  const tones = {
    leaf: "bg-leaf-100/60 text-leaf-900 border-leaf-200/40",
    sunny: "bg-sunny-100/60 text-sunny-900 border-sunny-200/40",
    sky: "bg-sky-100/60 text-sky-900 border-sky-200/40",
    earth: "bg-earth-100/60 text-earth-900 border-earth-200/40",
  } as const;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-glass ${tones[tone]}`}
    >
      <p className="text-[0.7rem] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-display text-2xl font-extrabold leading-tight">{value}</p>
      {sublabel ? <p className="text-xs font-semibold opacity-70">{sublabel}</p> : null}
    </div>
  );
}

/** Loading placeholder that keeps the layout from jumping. */
export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-16 w-full" />
      ))}
    </div>
  );
}

/** Inline error notice, phrased for a farmer rather than a developer. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sunny-300/50 bg-sunny-50/70 px-4 py-3 backdrop-blur-sm">
      <p className="text-sm font-bold text-sunny-900">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-sunny px-4 py-2 text-sm">
          Try again
        </button>
      ) : null}
    </div>
  );
}
