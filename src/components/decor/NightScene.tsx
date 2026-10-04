import { cn } from "@/lib/utils";

/**
 * Decorative night-time characters. All motion is CSS (scroll-driven where the
 * browser supports `animation-timeline`, time-based otherwise), so none of it
 * costs JavaScript or blocks rendering. Everything is aria-hidden and
 * pointer-events: none, and it all stops under prefers-reduced-motion.
 */

/** Snow falling behind every page, with a few stars twinkling in the sky. */
export function SnowSky() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="snow snow-ice opacity-70" />
      {[
        [8, 12, 0], [22, 6, 1.2], [37, 15, 2.1], [55, 8, 0.6], [71, 13, 1.7], [86, 5, 2.6], [93, 18, 0.9], [14, 24, 3.1],
      ].map(([x, y, d]) => (
        <span
          key={`${x}-${y}`}
          className="absolute size-[3px] animate-twinkle rounded-full bg-gold-500 shadow-[0_0_6px_rgb(201_163_90/0.8)]"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

/* ── Santa's sleigh ───────────────────────────────────────────────────── */

function Reindeer({ x, y, nose = false }: { x: number; y: number; nose?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className="fill-[#8a5a32] stroke-[#8a5a32]">
      {/* legs — a galloping stretch */}
      <g strokeWidth="2.2" strokeLinecap="round" fill="none" className="reindeer-legs">
        <path d="M11 4 L22 10" />
        <path d="M8 5 L15 13" />
        <path d="M-11 4 L-22 8" />
        <path d="M-8 5 L-14 12" />
      </g>
      <ellipse cx="0" cy="0" rx="15" ry="6.5" stroke="none" />
      <path d="M-14 -2 L-19 -6" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M9 -3 Q14 -9 19 -13" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="22" cy="-14" rx="6" ry="3.6" transform="rotate(-18 22 -14)" stroke="none" />
      {/* antlers */}
      <g strokeWidth="1.5" strokeLinecap="round" fill="none">
        <path d="M18 -17 Q16 -24 11 -27 M15.5 -22 L11.5 -21 M18 -17 Q20 -25 18 -30 M19.2 -23 L22.5 -26" />
      </g>
      <circle cx="21" cy="-15" r="0.9" className="fill-pine-950" stroke="none" />
      {nose && <circle cx="28" cy="-15.5" r="2.2" className="fill-berry-500 stroke-none drop-shadow-[0_0_4px_rgb(240_105_125)]" />}
    </g>
  );
}

const DROPS = ["gift-drop-1", "gift-drop-2", "gift-drop-3", "gift-drop-4"];
const GIFT_TONES = ["fill-berry-600", "fill-pine-500", "fill-gold-500", "fill-berry-500"];

/**
 * Santa flies across the screen as the page scrolls — left to right from the
 * top of the page to the bottom — and drops a gift at four points along the
 * way. Each gift falls with an accelerating (gravity-like) curve and keeps the
 * sleigh's forward momentum because it travels inside the sleigh's frame.
 * Browsers without scroll-driven animations simply don't show it.
 */
export function FlyingSleigh() {
  return (
    <div aria-hidden="true" className="sleigh-flight pointer-events-none fixed top-[18vh] left-0 z-20 w-[150px] sm:w-[200px] lg:w-[230px]">
      <div className="sleigh-bob relative">
        <svg viewBox="0 0 230 80" className="w-full overflow-visible drop-shadow-[0_6px_14px_rgb(14_26_51/0.25)]">
          {/* magic trail */}
          <g className="fill-gold-500">
            <circle cx="6" cy="58" r="1.6" className="animate-twinkle" />
            <circle cx="-8" cy="50" r="1.1" className="animate-twinkle [animation-delay:.6s]" />
            <circle cx="-20" cy="60" r="1.3" className="animate-twinkle [animation-delay:1.1s]" />
            <circle cx="-34" cy="54" r="0.9" className="animate-twinkle [animation-delay:1.7s]" />
            <circle cx="-48" cy="62" r="0.8" className="animate-twinkle [animation-delay:.3s]" />
          </g>

          {/* reins */}
          <path d="M60 34 Q110 26 140 40 Q170 30 186 36" className="stroke-gold-400" strokeWidth="1" fill="none" />

          <Reindeer x={142} y={44} />
          <Reindeer x={190} y={38} nose />

          {/* sack with a gift peeking out */}
          <ellipse cx="30" cy="32" rx="11" ry="12" className="fill-[#7a5434]" />
          <rect x="24" y="17" width="9" height="8" rx="1" className="fill-berry-600" />
          <path d="M28.5 17v8M24 21h9" className="stroke-gold-300" strokeWidth="1.2" />

          {/* Santa */}
          <ellipse cx="50" cy="36" rx="11" ry="10" className="fill-berry-600" />
          <path d="M43 40 h15" className="stroke-snow" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="55" cy="22" r="5" className="fill-[#f2c9a5]" />
          <path d="M50.5 23 Q55 34 60 23 Q55 27 50.5 23Z" className="fill-snow" />
          <path d="M49.5 20 L60 20 L47 9 Z" className="fill-berry-600" />
          <rect x="49" y="18.6" width="11.5" height="3" rx="1.5" className="fill-snow" />
          <circle cx="46.5" cy="9" r="2.4" className="fill-snow" />
          <path d="M58 34 L63 33" className="stroke-berry-600" strokeWidth="4" strokeLinecap="round" />

          {/* sleigh */}
          <path
            d="M16 26 C20 24 24 28 26 36 L28 44 L80 44 C88 44 92 40 94 34 C96 30 100 30 100 34 C100 43 93 55 80 56 L30 56 C21 56 17 46 16 26 Z"
            className="fill-berry-700"
          />
          <path d="M28 49 L82 49" className="stroke-gold-400" strokeWidth="1.2" strokeDasharray="2 3" />
          <path d="M12 64 L86 64 C96 64 102 60 104 53" className="stroke-gold-400" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="104" cy="51" r="2" className="fill-none stroke-gold-400" strokeWidth="1.6" />
          <path d="M32 56 V64 M72 56 V64" className="stroke-gold-400" strokeWidth="2" />
        </svg>

        {/* gifts dropped along the flight */}
        {DROPS.map((cls, i) => (
          <svg key={cls} viewBox="0 0 20 20" className={cn("absolute top-[62%] left-[16%] w-[9%]", cls)}>
            <rect x="2" y="6" width="16" height="13" rx="1.5" className={GIFT_TONES[i]} />
            <rect x="1" y="4" width="18" height="4" rx="1" className={GIFT_TONES[i]} />
            <path d="M10 4v15M1 6h18" className="stroke-gold-200" strokeWidth="1.6" />
            <path d="M10 4 C6 0 4 3 10 4 C16 0 14 3 10 4" className="fill-none stroke-gold-200" strokeWidth="1.4" />
          </svg>
        ))}
      </div>
    </div>
  );
}

/* ── Snowman ──────────────────────────────────────────────────────────── */

export function Snowman({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 120" className={cn("overflow-visible", className)}>
      <ellipse cx="50" cy="116" rx="34" ry="4" className="fill-black/25" />
      <circle cx="50" cy="92" r="25" className="fill-[#eef3fb] stroke-[#b9c7de]" strokeWidth="1.2" />
      <circle cx="50" cy="56" r="18" className="fill-[#f5f8fd] stroke-[#b9c7de]" strokeWidth="1.2" />
      <circle cx="50" cy="29" r="13" className="fill-[#fbfcff] stroke-[#b9c7de]" strokeWidth="1.2" />
      {/* soft shading */}
      <path d="M68 80 A25 25 0 0 1 40 115" className="fill-none stroke-[#c9d5ea]" strokeWidth="5" opacity=".6" />
      <path d="M62 45 A18 18 0 0 1 44 73" className="fill-none stroke-[#c9d5ea]" strokeWidth="4" opacity=".6" />
      {/* hat */}
      <rect x="35" y="15" width="30" height="4" rx="2" className="fill-pine-950" />
      <rect x="40" y="0" width="20" height="17" rx="2" className="fill-pine-950" />
      <rect x="40" y="10" width="20" height="4" className="fill-berry-600" />
      {/* face */}
      <circle cx="45" cy="27" r="1.6" className="fill-pine-950" />
      <circle cx="55" cy="27" r="1.6" className="fill-pine-950" />
      <path d="M50 31 L61 33 L50 34 Z" className="fill-[#f08a24]" />
      <path d="M44 36 Q50 40 56 36" className="fill-none stroke-pine-950" strokeWidth="1.3" strokeLinecap="round" />
      {/* scarf */}
      <path d="M36 42 Q50 49 64 42 L64 47 Q50 54 36 47 Z" className="fill-berry-600" />
      <path d="M57 46 L60 62 L66 60 L62 45 Z" className="fill-berry-700" />
      {/* buttons */}
      <circle cx="50" cy="56" r="1.8" className="fill-pine-950" />
      <circle cx="50" cy="65" r="1.8" className="fill-pine-950" />
      {/* arms — the right one waves */}
      <path d="M33 56 L14 46 M20 49 L15 41" className="fill-none stroke-[#6b4a2f]" strokeWidth="2.4" strokeLinecap="round" />
      <g className="snowman-wave">
        <path d="M67 56 L86 42 M80 46 L87 49" className="fill-none stroke-[#6b4a2f]" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ── Snowdrift scene (sits on top of the footer) ──────────────────────── */

function Pine({ x, h }: { x: number; h: number }) {
  return (
    <g transform={`translate(${x} ${110 - h})`}>
      <path d={`M0 ${h} L${h * 0.32} ${h * 0.55} L${h * 0.18} ${h * 0.55} L${h * 0.4} ${h * 0.25} L${h * 0.26} ${h * 0.25} L${h * 0.5} 0 L${h * 0.74} ${h * 0.25} L${h * 0.6} ${h * 0.25} L${h * 0.82} ${h * 0.55} L${h * 0.68} ${h * 0.55} L${h} ${h} Z`} className="fill-[#1f4a37]" />
      <path d={`M${h * 0.5} 0 l-1.5 -4 l1.5 -1.5 l1.5 1.5 z`} className="fill-gold-300" />
    </g>
  );
}

/** Trees and a waving snowman standing on top of the footer card. */
export function SnowDrift() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative z-10 mx-auto -mb-3 h-20 max-w-[1600px] sm:h-28">
      <svg viewBox="0 0 200 110" className="absolute bottom-0 left-[3%] h-16 sm:h-24">
        <Pine x={10} h={96} />
        <Pine x={86} h={64} />
      </svg>
      <svg viewBox="0 0 200 110" className="absolute right-[4%] bottom-0 h-14 sm:h-20">
        <Pine x={20} h={70} />
        <Pine x={96} h={104} />
      </svg>
      <div className="snowman-peek absolute -bottom-1 left-[60%] w-14 sm:w-[4.5rem] lg:w-20">
        <Snowman />
      </div>
    </div>
  );
}

/** Snow lying along the top edge of a dark card, with soft drips. Put it
 *  inside a `relative overflow-hidden` rounded container. */
export function SnowCap() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 w-full sm:h-10"
    >
      <path
        d="M0 0 H1200 V14 C1170 16 1160 26 1150 18 C1120 12 1090 20 1060 16 C1040 14 1035 30 1022 22 C1000 12 960 18 920 15 C880 12 860 22 830 17 C800 13 790 34 776 21 C760 12 720 16 680 14 C640 12 620 22 590 17 C560 13 540 28 528 19 C510 12 470 18 430 15 C390 12 370 24 340 18 C310 13 300 32 286 20 C270 12 230 17 190 14 C150 12 130 22 100 17 C70 13 60 26 48 18 C30 12 12 16 0 14 Z"
        className="fill-[#e8eef8]"
      />
      <path d="M0 0 H1200 V6 C900 10 300 10 0 6 Z" className="fill-[#c8d4ea]" opacity=".6" />
    </svg>
  );
}
