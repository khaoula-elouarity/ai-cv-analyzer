import { useEffect, useMemo, useState } from 'react';

/**
 * Video Text — renders `children` with a video playing inside the glyphs, by
 * using an SVG of the text as a CSS mask over a <video>.
 *
 * Vendored from Magic UI (`@magicui/video-text`, MIT) and adapted to this app:
 *
 *  - Plain JSX. The upstream file is TypeScript and imports `cn` from
 *    `@/lib/utils`; this project is JSX-only with no `@/` alias, so className
 *    merging is a plain template string like the rest of `components/ui`.
 *  - The mask is derived with useMemo instead of state + a window resize
 *    listener. Upstream rebuilds the SVG on every resize because it converts a
 *    numeric `fontSize` into `vw`, which is viewport-relative. Here a number
 *    means `px`, so the mask is a pure function of the props and the browser
 *    already rescales the SVG when the container resizes.
 *  - `prefers-reduced-motion` disables autoplay. index.css honours it for CSS
 *    animations, but it cannot pause a <video>, so that is handled here.
 *
 * Sizing: the container gets its height/width from the caller. Because the
 * masked SVG has no viewBox, the text is positioned 1:1 in CSS pixels — it is
 * NOT scaled to fit — so `fontSize` must be small enough for the string to fit
 * the box horizontally, or the outer glyphs get clipped by the mask.
 */
export default function VideoText({
  src,
  children,
  className = '',
  autoPlay = true,
  muted = true,
  loop = true,
  preload = 'auto',
  fontSize = 64,
  fontWeight = 700,
  textAnchor = 'middle',
  dominantBaseline = 'middle',
  fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  as: Component = 'div',
}) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Joining the children keeps the mask and the screen-reader copy identical.
  const content = useMemo(
    () => (Array.isArray(children) ? children.join('') : String(children ?? '')),
    [children]
  );

  const mask = useMemo(() => {
    const size = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
    return (
      `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>` +
      `<text x='50%' y='50%' font-size='${size}' font-weight='${fontWeight}' ` +
      `text-anchor='${textAnchor}' dominant-baseline='${dominantBaseline}' ` +
      `font-family='${fontFamily}'>${content}</text></svg>`
    );
  }, [content, fontSize, fontWeight, textAnchor, dominantBaseline, fontFamily]);

  const maskImage = `url("data:image/svg+xml,${encodeURIComponent(mask)}")`;

  return (
    <Component className={`relative size-full ${className}`}>
      {/* Masks the video so it is only visible inside the letterforms. */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      >
        <video
          className="h-full w-full object-cover"
          autoPlay={autoPlay && !reducedMotion}
          muted={muted}
          loop={loop}
          preload={preload}
          playsInline
          tabIndex={-1}
          aria-hidden="true"
        >
          <source src={src} type="video/webm" />
        </video>
      </div>

      {/* The glyphs are decorative — this is what screen readers announce. */}
      <span className="sr-only">{content}</span>
    </Component>
  );
}
