import { LIFECYCLE, STATUS_META, formatDate, statusIndex } from "@/lib/status";
import type { BatchStatus, TimelineEvent } from "@/lib/types";

/**
 * The illustrative timeline.
 *
 * Rather than a list of dates, the journey is drawn: a track of medallions with
 * the road filling in behind the produce as it moves. Steps that have happened
 * are in full colour; steps still ahead are faded but still show their icon, so
 * a farmer can see what comes next without reading anything.
 */
export function BatchTimeline({
  status,
  events = [],
  compact = false,
}: {
  status: BatchStatus;
  events?: TimelineEvent[];
  compact?: boolean;
}) {
  const cancelled = status === "CANCELLED";
  const reached = statusIndex(status);

  // Progress is measured between medallion centres, so the road ends under the
  // icon rather than past it.
  const progress = cancelled ? 0 : (reached / (LIFECYCLE.length - 1)) * 100;

  const dateFor = (step: BatchStatus) => events.find((event) => event.status === step)?.occurredAt;

  return (
    <div className="w-full">
      <div className="relative px-1">
        {/* The road — base track */}
        <div
          className="absolute left-[9%] right-[9%] top-5 h-2 rounded-full bg-leaf-100/60"
          aria-hidden
        />
        {/* The road — filled progress with gradient */}
        <div
          className="absolute left-[9%] top-5 h-2 rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `calc((100% - 18%) * ${progress / 100})`,
            background: "linear-gradient(90deg, #4ade6f 0%, #22c34c 50%, #16a03a 100%)",
          }}
          aria-hidden
        />

        <ol className="relative flex items-start justify-between">
          {LIFECYCLE.map((step, index) => {
            const meta = STATUS_META[step];
            const done = !cancelled && index <= reached;
            const current = !cancelled && index === reached;

            return (
              <li key={step} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full border transition-all duration-300 group-hover:scale-110 ${
                    done
                      ? "border-white/70 bg-white/90 shadow-glass backdrop-blur-sm"
                      : "border-leaf-100/40 bg-leaf-50/50 opacity-50 grayscale backdrop-blur-sm"
                  } ${current ? "ring-4 ring-leaf-300/60 animate-border-glow" : ""}`}
                >
                  <meta.Icon className="h-7 w-7" />
                </span>

                {!compact ? (
                  <>
                    <span
                      className={`font-display text-[0.7rem] font-extrabold leading-tight ${
                        done ? "text-soil-800" : "text-soil-400"
                      }`}
                    >
                      {meta.short}
                    </span>
                    <span className="font-accent text-[0.65rem] italic text-soil-400">
                      {done ? formatDate(dateFor(step)) : "—"}
                    </span>
                  </>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {cancelled ? (
        <p className="mt-3 rounded-2xl border border-soil-100/40 bg-soil-100/50 px-3 py-2 text-center text-xs font-semibold text-soil-600 backdrop-blur-sm">
          This batch was cancelled — its journey stopped here.
        </p>
      ) : null}
    </div>
  );
}

/** The written log, shown when a card is expanded. */
export function TimelineLog({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm font-semibold text-soil-500">No events recorded yet.</p>;
  }

  return (
    <ol className="space-y-2.5 border-l-[3px] border-leaf-200/50 pl-4">
      {events
        .slice()
        .reverse()
        .map((event, index) => {
          const meta = STATUS_META[event.status];
          return (
            <li key={`${event.status}-${event.occurredAt}-${index}`} className="relative">
              <span
                className={`absolute -left-[1.44rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-white/80 ${meta.dot}`}
                aria-hidden
              />
              <p className="font-display text-sm font-extrabold text-soil-800">{event.label}</p>
              {event.note ? <p className="text-sm font-semibold text-soil-600">{event.note}</p> : null}
              <p className="font-accent text-xs italic text-soil-400">
                {formatDate(event.occurredAt)}
                {event.location ? ` · ${event.location}` : ""}
                {event.actor ? ` · ${event.actor}` : ""}
              </p>
            </li>
          );
        })}
    </ol>
  );
}
