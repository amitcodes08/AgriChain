/**
 * Cartoon icon set for AgriChain Trace.
 *
 * Design rules, applied consistently across every icon:
 *   • Thick, rounded strokes and flat fills — vector illustration, not line art.
 *   • Each icon is drawn *mid-action*: the tractor throws dust, the seed bursts
 *     with sunrays, the handshake has impact ticks. That is what makes them read
 *     as "animated" while sitting perfectly still.
 *   • Everything sits on a 48×48 grid with the brand palette baked in, so an
 *     icon never drifts off-brand when dropped into a new surface.
 */

export interface IconProps {
  className?: string;
  title?: string;
}

function svgProps(className?: string) {
  return {
    viewBox: "0 0 48 48",
    className: `shrink-0 ${className ?? "h-10 w-10"}`,
    xmlns: "http://www.w3.org/2000/svg",
    role: "img" as const,
  };
}

/* -------------------------------------------------------------------------- */
/* Brand                                                                      */
/* -------------------------------------------------------------------------- */

/** Logo: a barn with a leaf sprouting from the roof ridge. */
export function BarnLeafIcon({ className, title = "AgriChain Trace" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <ellipse cx="24" cy="42" rx="16" ry="3" fill="#145127" opacity="0.14" />
      <path d="M8 22 24 12l16 10v18a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V22Z" fill="#b36e3f" />
      <path d="M8 22 24 12l16 10-2.4 3L24 16.6 10.4 25 8 22Z" fill="#955636" />
      <rect x="18" y="28" width="12" height="14" rx="1.6" fill="#fbf7f1" />
      <path d="M18 32h12M24 28v14" stroke="#b36e3f" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M24 12c0-4.4 3-7.6 7.2-8.4.8 4.6-1.6 8.6-5.6 9.8" fill="#22c34c" />
      <path d="M25.6 12.2c1.2-3 3.2-5 5.6-6" stroke="#145127" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="12" r="2" fill="#16a03a" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Module icons                                                               */
/* -------------------------------------------------------------------------- */

/** Register batch: a hand lowering a seed into soil, sunburst behind it. */
export function HandPlantingSeedIcon({ className, title = "Register a new batch" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path
        d="M24 5v3.6M31.5 7.6 30 10.8M16.5 7.6 18 10.8M36 13.4l-2.8 1.8M12 13.4l2.8 1.8"
        stroke="#ffc720"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M6 34h36v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6Z" fill="#955636" />
      <path d="M6 34h36v2.6H6z" fill="#b36e3f" />
      <ellipse cx="24" cy="27.5" rx="3.1" ry="4.1" fill="#dd7d02" transform="rotate(-12 24 27.5)" />
      <path d="M22.6 25.6c.8-.9 1.9-1.4 3-1.5" stroke="#fff6c6" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path
        d="M14 14.5c1.6-1.4 3.6-1 4.6.6l2.6 4.2 1.4-1.6c1.2-1.4 3.3-1.2 4.2.4l3.2 5.6c1.1 2 .5 4.4-1.4 5.6l-3.3 2c-2.4 1.5-5.6.9-7.2-1.4l-4.9-6.9c-1.3-1.9-1-4.4.8-5.9Z"
        fill="#ffdb4a"
      />
      <path d="M18.6 21.4 21 25M22.6 19.6l2.6 4" stroke="#dd7d02" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Active batches: a plant growing in a furrowed field. */
export function GrowingPlantFieldIcon({ className, title = "Active crop batches" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path d="M4 32h40l-2.5 8a2 2 0 0 1-1.9 1.4H8.4A2 2 0 0 1 6.5 40L4 32Z" fill="#955636" />
      <path d="M4 32h40l-.7 2.2H4.7L4 32Z" fill="#b36e3f" />
      <path d="M12 36.4h6M22 36.4h6M32 36.4h5" stroke="#794631" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24 32V17" stroke="#157e31" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 22c-4.6.4-7.6-2.2-8.4-6.6 4.4-1 7.8 1.4 8.4 6.6Z" fill="#22c34c" />
      <path d="M24 19c4.6-.6 7.4-3.6 7.6-8.2-4.6.2-7.4 3-7.6 8.2Z" fill="#4ade6f" />
      <circle cx="24" cy="13.4" r="2.6" fill="#16a03a" />
      <path
        d="M34 20.5c1.6-1 2.6-2.6 2.8-4.5M38 26c1.8-.4 3.2-1.5 4-3"
        stroke="#86efa0"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Wallet: a basket overflowing with coins and produce. */
export function CoinBasketIcon({ className, title = "Farmer wallet" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <circle cx="18" cy="20" r="5" fill="#f9a607" />
      <circle cx="29" cy="19" r="4.4" fill="#22c34c" />
      <path d="M29 14.6c.4-1.6 1.6-2.6 3.2-2.8" stroke="#157e31" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="37" cy="14" r="4.2" fill="#ffc720" stroke="#dd7d02" strokeWidth="1.4" />
      <path d="M37 11.6v4.8M35.6 12.8h2.8" stroke="#94430c" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11" cy="14.5" r="3.4" fill="#ffdb4a" stroke="#dd7d02" strokeWidth="1.2" />
      <path d="M42 20.5l1.4 1.4M6 20l-1.4 1.4M24 8.5V6" stroke="#ffec88" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 24h34l-3.4 14.6a2.4 2.4 0 0 1-2.3 1.8H12.7a2.4 2.4 0 0 1-2.3-1.8L7 24Z" fill="#cc9a68" />
      <path d="M7 24h34l-.7 3H7.7L7 24Z" fill="#dcba93" />
      <path d="M14 28.5l1.8 9M24 28.5v9M34 28.5l-1.8 9" stroke="#955636" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Traceability map: a globe with a delivery truck and a leaf badge. */
export function GlobeTruckLeafIcon({ className, title = "Traceability map" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <circle cx="24" cy="24" r="17" fill="#7dcbfc" />
      <path d="M9 19h30M9 29h30" stroke="#bae2fd" strokeWidth="1.8" />
      <path d="M24 7c4.4 5 4.4 29 0 34M24 7c-4.4 5-4.4 29 0 34" stroke="#bae2fd" strokeWidth="1.8" fill="none" />
      <path d="M13 17c3-2 6-1.4 8 .6 1.6 1.6.6 4-1.6 4.4-3 .6-6-1.4-6.4-5Z" fill="#4ade6f" />
      <path d="M28 28c3.4-1.4 6.6 0 7.6 2.6.8 2-1.2 3.8-3.4 3.2-2.6-.6-4.4-2.8-4.2-5.8Z" fill="#22c34c" />
      <rect x="20" y="20.5" width="11" height="6" rx="1.4" fill="#fbf7f1" />
      <path d="M31 22.4h3.2l2.4 2.8v1.3H31v-4.1Z" fill="#ffc720" />
      <circle cx="23.5" cy="27.2" r="2" fill="#3e3833" />
      <circle cx="33.5" cy="27.2" r="2" fill="#3e3833" />
      <path d="M18.5 22.5h-3M17 25.4h-3.4" stroke="#f0f8ff" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 10c4.2-.6 6.8 1.8 7 6-4 1-6.6-1.2-7-6Z" fill="#16a03a" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Status icons — one per lifecycle step                                      */
/* -------------------------------------------------------------------------- */

/** Planted: a seedling breaking through soil under a small sunburst. */
export function SeedlingIcon({ className, title = "Planted" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path d="M9 33h30l-1.8 7a2 2 0 0 1-2 1.6H12.8a2 2 0 0 1-2-1.6L9 33Z" fill="#955636" />
      <path d="M9 33h30l-.5 2H9.5L9 33Z" fill="#b36e3f" />
      <path d="M24 33V19" stroke="#157e31" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24 24c-4.2 0-6.8-2.4-7-6.6 4.2-.6 7 1.8 7 6.6Z" fill="#22c34c" />
      <path d="M24 21.5c4.2-.2 6.8-2.8 6.8-7-4.2.2-6.8 2.8-6.8 7Z" fill="#4ade6f" />
      <path d="M24 12.5V8M18.5 12l-1.8-2.6M29.5 12l1.8-2.6" stroke="#ffdb4a" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** AI verified: a friendly robot inspecting a leaf through a magnifier. */
export function RobotInspectIcon({ className, title = "AI quality verified" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path d="M24 7v3.5" stroke="#7d715f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="6" r="2.2" fill="#ffc720" />
      <rect x="11" y="11" width="26" height="20" rx="6" fill="#bae2fd" />
      <rect x="14.5" y="15" width="19" height="11" rx="4" fill="#075085" />
      <circle cx="20" cy="20.5" r="2.3" fill="#7dcbfc" />
      <circle cx="28" cy="20.5" r="2.3" fill="#7dcbfc" />
      <path d="M20.5 24.5h7" stroke="#38b0f8" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="15" y="31" width="18" height="6" rx="3" fill="#7dcbfc" />
      <path d="M31 36c4.4-1 7.4 1 8 5.4-4.4 1.2-7.4-.8-8-5.4Z" fill="#22c34c" />
      <circle cx="34" cy="33" r="6.4" fill="#f0f8ff" fillOpacity="0.55" stroke="#dd7d02" strokeWidth="2.6" />
      <path d="M38.8 37.8 43 42" stroke="#dd7d02" strokeWidth="3" strokeLinecap="round" />
      <path d="M31.4 30.6a4 4 0 0 1 2.2-1.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M8 20H5M8 26H5.4" stroke="#86efa0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Listed: a market storefront with a striped awning. */
export function StorefrontIcon({ className, title = "Listed on market" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <rect x="9" y="20" width="30" height="21" rx="2.4" fill="#f5ecdf" />
      <path d="M7 12h34l3 8H4l3-8Z" fill="#22c34c" />
      <path d="M12.6 12h6.2l-1.6 8h-6.2l1.6-8ZM25.2 12h6.2l1.6 8h-6.2l-1.6-8Z" fill="#fbf7f1" />
      <rect x="19" y="28" width="10" height="13" rx="1.6" fill="#b36e3f" />
      <circle cx="26.6" cy="34.6" r="1" fill="#ffdb4a" />
      <rect x="12.5" y="24.5" width="5.5" height="5" rx="1.2" fill="#7dcbfc" />
      <rect x="30" y="24.5" width="5.5" height="5" rx="1.2" fill="#7dcbfc" />
      <path d="M24 8.5V5.5M15 9l-1.4-2.4M33 9l1.4-2.4" stroke="#ffc720" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** In transit: a truck throwing up dust. */
export function DeliveryTruckIcon({ className, title = "On the way to buyer" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <rect x="6" y="16" width="22" height="15" rx="2.4" fill="#7dcbfc" />
      <path d="M28 20h6.6l5.4 6v5H28v-11Z" fill="#ffc720" />
      <path d="M30.5 22.4h3.6l3 3.4h-6.6v-3.4Z" fill="#f0f8ff" />
      <rect x="6" y="29" width="34" height="3" rx="1.4" fill="#0275c7" />
      <circle cx="14" cy="34" r="4.2" fill="#3e3833" />
      <circle cx="14" cy="34" r="1.7" fill="#b4aa9d" />
      <circle cx="34" cy="34" r="4.2" fill="#3e3833" />
      <circle cx="34" cy="34" r="1.7" fill="#b4aa9d" />
      <path d="M12 20.5h9M12 24.5h6" stroke="#f0f8ff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="5" cy="37" r="2.6" fill="#e8e5e0" />
      <circle cx="9.5" cy="39.5" r="1.9" fill="#e8e5e0" />
      <path d="M4 26.5H1M4.5 22H2" stroke="#d2ccc3" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Sold: a handshake under a spinning coin. */
export function HandshakeCoinIcon({ className, title = "Sold" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <circle cx="24" cy="13" r="7" fill="#ffc720" stroke="#dd7d02" strokeWidth="2" />
      <path
        d="M24 8.6v8.8M21.6 10.6h4.2a1.9 1.9 0 0 1 0 3.8h-3.6a1.9 1.9 0 0 0 0 3.8h4.2"
        stroke="#94430c"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M5 28.5l7-4.4 8 4.6 4-1.6 4 1.6 8-4.6 7 4.4-6.6 8.6-6-3-4.4 2.4a4 4 0 0 1-3.8 0L11.6 34l-6 3L5 28.5Z"
        fill="#ffdb4a"
      />
      <path
        d="M20 28.7l4 2.3 4-2.3"
        stroke="#dd7d02"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M13 20.5l-2-2.6M35 20.5l2-2.6M24 42v2.5" stroke="#86efa0" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Cancelled: a produce crate tipped over. */
export function CancelledCrateIcon({ className, title = "Cancelled" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <rect x="10" y="20" width="24" height="18" rx="2.4" fill="#cc9a68" transform="rotate(-9 22 29)" />
      <path d="M11 26.5l23-3.6M13 33l23-3.6" stroke="#955636" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="14" r="7" fill="#f9a607" />
      <path d="M33.4 11.4l5.2 5.2M38.6 11.4l-5.2 5.2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 41h20" stroke="#d2ccc3" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Supporting icons                                                           */
/* -------------------------------------------------------------------------- */

/** Wallet connection pill. */
export function WalletPlugIcon({ className, title = "Wallet" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <rect x="6" y="13" width="32" height="23" rx="5" fill="#16a03a" />
      <path d="M6 19c0-3.3 2.7-6 6-6h20l-4 6H6Z" fill="#22c34c" />
      <rect x="26" y="21" width="16" height="9" rx="4.5" fill="#ffdb4a" />
      <circle cx="33.5" cy="25.5" r="2.4" fill="#dd7d02" />
    </svg>
  );
}

/** Camera for the photo drop zone. */
export function CameraIcon({ className, title = "Add a photo" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <rect x="5" y="15" width="38" height="25" rx="5" fill="#0275c7" />
      <path d="M17 15l2.6-4.4a2 2 0 0 1 1.7-1h5.4a2 2 0 0 1 1.7 1L31 15H17Z" fill="#38b0f8" />
      <circle cx="24" cy="27.5" r="8" fill="#bae2fd" />
      <circle cx="24" cy="27.5" r="4.4" fill="#075085" />
      <circle cx="21.6" cy="25.4" r="1.4" fill="#f0f8ff" />
      <circle cx="37" cy="20.5" r="1.8" fill="#ffdb4a" />
      <path d="M44 12.5l2.2-1.4M44 17h2.4" stroke="#ffec88" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Map pin. */
export function MapPinIcon({ className, title = "Location" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path d="M24 4c8 0 14 6 14 13.6C38 27 26.6 41 24 44c-2.6-3-14-17-14-26.4C10 10 16 4 24 4Z" fill="#22c34c" />
      <circle cx="24" cy="17.5" r="6" fill="#f0fdf2" />
      <circle cx="24" cy="17.5" r="2.8" fill="#157e31" />
    </svg>
  );
}

/** Quality badge shown beside AI scores. */
export function QualityBadgeIcon({ className, title = "Quality score" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path d="m17 30-3 12 10-4.6L34 42l-3-12" fill="#22c34c" />
      <circle cx="24" cy="21" r="13" fill="#ffc720" />
      <circle cx="24" cy="21" r="9.4" fill="#ffdb4a" stroke="#dd7d02" strokeWidth="1.8" />
      <path d="m24 15.4 1.9 3.9 4.3.6-3.1 3 .7 4.2-3.8-2-3.8 2 .7-4.2-3.1-3 4.3-.6L24 15.4Z" fill="#94430c" />
    </svg>
  );
}

/** Chain-link badge, shown when a batch has been minted. */
export function ChainLinkIcon({ className, title = "Recorded on chain" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <rect x="5" y="18" width="20" height="12" rx="6" fill="#0275c7" />
      <rect x="23" y="18" width="20" height="12" rx="6" fill="#38b0f8" />
      <path d="M17 24h14" stroke="#f0f8ff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A tractor kicking up dust — used as the page's hero mascot. */
export function TractorIcon({ className, title = "Working the fields" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path d="M20 14h9l3 9h-12v-9Z" fill="#22c34c" />
      <path d="M22 16h5.4l1.8 5H22v-5Z" fill="#bae2fd" />
      <path d="M17 23h22a3 3 0 0 1 3 3v6H17v-9Z" fill="#16a03a" />
      <rect x="12" y="20" width="5" height="12" rx="1.6" fill="#157e31" />
      <path d="M13.5 20v-5a1.5 1.5 0 0 1 3 0" stroke="#544a40" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="33" r="8" fill="#3e3833" />
      <circle cx="34" cy="33" r="3.4" fill="#ffc720" />
      <circle cx="16" cy="35" r="5" fill="#3e3833" />
      <circle cx="16" cy="35" r="2" fill="#ffc720" />
      <circle cx="7" cy="36" r="3.2" fill="#e8e5e0" />
      <circle cx="3" cy="39" r="2.2" fill="#e8e5e0" />
      <path d="M9 27H6M8 22H5.6M14 12.5l-1.6-2.6" stroke="#d2ccc3" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Empty-state scarecrow — friendlier than a blank panel. */
export function ScarecrowIcon({ className, title = "Nothing here yet" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path d="M24 26v16" stroke="#955636" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M10 29h28" stroke="#b36e3f" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="24" cy="17" r="9" fill="#ffdb4a" />
      <path d="M15 12h18l-1.6-3.4a2 2 0 0 0-1.8-1.2H18.4a2 2 0 0 0-1.8 1.2L15 12Z" fill="#cc9a68" />
      <circle cx="20.6" cy="17" r="1.7" fill="#3e3833" />
      <circle cx="27.4" cy="17" r="1.7" fill="#3e3833" />
      <path d="M20.6 21.4c1.9 1.6 4.9 1.6 6.8 0" stroke="#3e3833" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M11 29l-2.6 4M37 29l2.6 4" stroke="#ffc720" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** Sun used in the page backdrop. */
export function SunIcon({ className, title = "Sunshine" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <circle cx="24" cy="24" r="11" fill="#ffc720" />
      <circle cx="24" cy="24" r="7.5" fill="#ffdb4a" />
      <g stroke="#ffc720" strokeWidth="3" strokeLinecap="round">
        <path d="M24 4v5M24 39v5M44 24h-5M9 24H4M38 10l-3.5 3.5M13.5 34.5 10 38M38 38l-3.5-3.5M13.5 13.5 10 10" />
      </g>
    </svg>
  );
}

/** Small refresh arrow for the reload control. */
export function RefreshIcon({ className, title = "Refresh" }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <title>{title}</title>
      <path
        d="M39 24a15 15 0 1 1-4.4-10.6"
        stroke="#157e31"
        strokeWidth="4.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M36 6v9h-9" stroke="#157e31" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Animated decorative components                                              */
/* -------------------------------------------------------------------------- */

/**
 * Floating leaf particles — ambient nature decoration.
 * Renders multiple small SVG leaves at varying positions and speeds.
 * These are purely decorative and pointer-events-none.
 */
export function FloatingLeaves({ count = 6 }: { count?: number }) {
  const leaves = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: `${8 + (i * 87) % 85}%`,
    delay: `${i * 2.1}s`,
    duration: `${10 + (i % 4) * 3}s`,
    size: 14 + (i % 3) * 4,
    flip: i % 2 === 0,
  }));

  return (
    <div className="nature-particles" aria-hidden="true">
      {leaves.map((leaf) => (
        <span
          key={leaf.id}
          className="nature-leaf"
          style={{
            "--leaf-x": leaf.x,
            "--leaf-delay": leaf.delay,
            "--leaf-duration": leaf.duration,
            transform: leaf.flip ? "scaleX(-1)" : undefined,
          } as React.CSSProperties}
        >
          <svg width={leaf.size} height={leaf.size} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2c-4 5-6 10-4 16 4-2 8-6 10-14C16 3 14 2 12 2Z"
              fill="currentColor"
            />
            <path
              d="M12 6c0 4-1 8-3 11"
              stroke="rgb(34 195 76 / 0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}

/**
 * Sparkle group — small animated twinkle stars for wallet/hero decorations.
 * Renders a set of tiny sparkle dots with staggered animations.
 */
export function SparkleGroup({
  count = 5,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const sparkles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: `${10 + ((i * 73) % 80)}%`,
    y: `${10 + ((i * 47) % 80)}%`,
    delay: `${i * 0.4}s`,
    duration: `${1.5 + (i % 3) * 0.5}s`,
    size: i % 3 === 0 ? "h-2 w-2" : "h-1.5 w-1.5",
  }));

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {sparkles.map((s) => (
        <span
          key={s.id}
          className={`sparkle-dot ${s.size}`}
          style={{
            left: s.x,
            top: s.y,
            "--sparkle-delay": s.delay,
            "--sparkle-duration": s.duration,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/**
 * Animated cloud for the traceability map SVG.
 * A simple, soft cloud shape that drifts across the sky.
 */
export function AnimatedCloud({
  y = 8,
  delay = 0,
  scale = 1,
  opacity = 0.6,
}: {
  y?: number;
  delay?: number;
  scale?: number;
  opacity?: number;
}) {
  return (
    <g
      opacity={opacity}
      style={{
        animation: `cloud-drift ${20 + delay * 5}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <g transform={`translate(0, ${y}) scale(${scale})`}>
        <ellipse cx="10" cy="6" rx="6" ry="3.5" fill="white" />
        <ellipse cx="16" cy="4.5" rx="5" ry="4" fill="white" />
        <ellipse cx="22" cy="5.5" rx="6" ry="3.5" fill="white" />
        <ellipse cx="16" cy="7" rx="8" ry="2.5" fill="white" />
      </g>
    </g>
  );
}

