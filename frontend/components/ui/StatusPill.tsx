import { STATUS_META } from "@/lib/status";
import type { BatchStatus } from "@/lib/types";

/**
 * The status pill: icon + label, in the colour family that status owns. Because
 * every status has both a distinct colour *and* a distinct illustration, it
 * stays readable for anyone who reads colour differently.
 */
export function StatusPill({
  status,
  size = "md",
}: {
  status: BatchStatus;
  size?: "sm" | "md";
}) {
  const meta = STATUS_META[status];
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span className={`pill group backdrop-blur-sm ${meta.pill}`}>
      <meta.Icon className={`${iconSize} transition-transform duration-300 group-hover:scale-125`} />
      {meta.label}
    </span>
  );
}

/** Larger badge used at the top of a batch card. */
export function StatusMedallion({ status }: { status: BatchStatus }) {
  const meta = STATUS_META[status];

  return (
    <div className={`medallion-glow group grid h-14 w-14 shrink-0 place-items-center rounded-blob shadow-glass backdrop-blur-sm ${meta.medallion}`}>
      <meta.Icon className="icon-hover h-10 w-10" />
    </div>
  );
}
