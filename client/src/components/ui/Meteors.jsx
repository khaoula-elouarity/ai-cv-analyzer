import { useState } from 'react';

/**
 * Meteors — decorative streaks of light falling across the nearest positioned
 * ancestor. Purely visual: the wrapper is `aria-hidden`, `pointer-events-none`
 * and animates nothing under `prefers-reduced-motion` (index.css collapses
 * animation-duration to 0.01ms for the whole tree).
 *
 * Vendored from Magic UI (`@magicui/meteors`, MIT) and adapted to this app:
 *
 *  - Plain JSX. Upstream is TypeScript and merges classes with `cn` from
 *    `@/lib/utils`; this project is JSX-only with no `@/` alias, so the few
 *    class strings are written out directly, as in `Text3DFlip`.
 *  - Positions and timings are drawn once, in a useState initialiser, so they
 *    survive re-renders. Recomputing them per render would reshuffle every
 *    streak and restart its animation each time the parent re-rendered. The
 *    timing props are therefore read on mount only, which is all the landing
 *    hero needs — it passes a constant `number`.
 *  - The `angle` prop actually works here. Upstream rotates each head by
 *    `angle` but hardcodes `215deg` inside the `@keyframes meteor` transform
 *    and again on the trail, so passing anything but 215 produces a trail that
 *    does not line up with the direction of travel. The angle is published as a
 *    `--meteor-angle` custom property that the keyframes read, and the trail is
 *    left unrotated so it inherits the head's axis at any angle.
 *
 * The `meteor` keyframes live in index.css next to the other animations.
 */
export default function Meteors({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 8,
  angle = 215,
  className = '',
}) {
  const [meteors] = useState(() =>
    Array.from({ length: number }, () => ({
      left: Math.random() * 100,
      duration: minDuration + Math.random() * (maxDuration - minDuration),
      delay: minDelay + Math.random() * (maxDelay - minDelay),
    }))
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {meteors.map((meteor, i) => (
        <span
          key={i}
          style={{
            // The 2px head. It is the only thing that moves — the keyframes own
            // the transform, so the inline value only has to match their
            // starting rotation to avoid a visible jump on the first frame.
            '--meteor-angle': `${angle}deg`,
            top: '-5%',
            left: `${meteor.left}%`,
            position: 'absolute',
            width: '2px',
            height: '2px',
            borderRadius: '50%',
            backgroundColor: 'white',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
            transform: `rotate(${angle}deg)`,
            animationName: 'meteor',
            animationDuration: `${meteor.duration}s`,
            animationDelay: `${meteor.delay}s`,
          }}
        >
          {/* The trail. White end sits on the head's local -X, which is where
              the head came from, so it fades out along the direction of travel. */}
          <div className="pointer-events-none absolute top-1/2 -z-10 h-1 w-[50px] -translate-y-1/2 rounded-full bg-linear-to-r from-white via-slate-100 to-transparent" />
        </span>
      ))}
    </div>
  );
}
