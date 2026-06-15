import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Magnetic } from './MagneticButton';

/**
 * Editorial magazine-style hero used across all public pages.
 *
 * Props:
 *   chapter       e.g. "Chapter 02 — About"
 *   eyebrow       e.g. "— Our Story"
 *   headlineTop   Bold serif display line (white)
 *   headlineMid   Italic gold display line
 *   headlineBot   Optional smaller bold line (drops to next size down)
 *   subtitle      Body copy
 *   image         Background image URL (HD)
 *   primaryCta    { label, to }   (optional)
 *   secondaryCta  { label, to }   (optional)
 */
export function EditorialHero({
  chapter,
  eyebrow,
  headlineTop,
  headlineMid,
  headlineBot,
  subtitle,
  image,
  primaryCta,
  secondaryCta,
}) {
  return (
    <section className="relative min-h-[78vh] overflow-hidden bg-[#0a1631] flex items-end">

      {/* Background image with Ken Burns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 ken-burns">
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
        </div>
      </div>

      {/* Color grade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1631]/55 via-[#0a1631]/35 to-[#0a1631]/95" />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0a1631]/60 via-transparent to-transparent" />

      {/* Vignette */}
      <div className="vignette" />

      {/* Film grain */}
      <div className="film-grain" />

      {/* Top strip — masthead */}
      {chapter && (
        <div className="absolute top-24 left-0 right-0 z-10 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto flex items-center gap-6 text-white/80">
            <div className="editorial-eyebrow text-yellow-300/90">{chapter}</div>
            <div className="flex-1 editorial-hairline text-white/40" />
            <div className="editorial-eyebrow text-white/60 hidden sm:block">HotelBridge · 2026</div>
          </div>
        </div>
      )}

      {/* Bottom-aligned content */}
      <div className="relative z-10 w-full px-6 lg:px-12 pb-20 pt-40">
        <div className="max-w-7xl mx-auto">

          {/* Eyebrow */}
          {eyebrow && (
            <div className="editorial-eyebrow text-yellow-300/90 mb-6 editorial-rise" style={{ animationDelay: '0.1s' }}>
              {eyebrow}
            </div>
          )}

          {/* Display headline */}
          <h1 className="text-white mb-6">
            <div className="editorial-display-bold text-[clamp(44px,7vw,108px)] editorial-rise" style={{ animationDelay: '0.2s' }}>
              {headlineTop}
            </div>
            {headlineMid && (
              <div className="editorial-display text-[clamp(36px,6vw,92px)] text-yellow-200/95 editorial-rise pl-[4%]" style={{ animationDelay: '0.4s' }}>
                {headlineMid}
              </div>
            )}
            {headlineBot && (
              <div className="editorial-display-bold text-[clamp(32px,5vw,76px)] editorial-rise pl-[2%]" style={{ animationDelay: '0.6s' }}>
                {headlineBot}
              </div>
            )}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p
              className="text-white/85 text-lg md:text-xl leading-[1.6] max-w-2xl font-light editorial-rise"
              style={{ animationDelay: '0.75s' }}
            >
              {subtitle}
            </p>
          )}

          {/* CTAs */}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-4 mt-10 editorial-rise" style={{ animationDelay: '0.9s' }}>
              {primaryCta && (
                <Magnetic strength={0.4}>
                  <Link
                    to={primaryCta.to}
                    data-cursor="link"
                    className="inline-flex items-center btn-gold text-white border-0 px-8 py-4 rounded-none text-xs font-semibold tracking-widest uppercase"
                  >
                    {primaryCta.label}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Magnetic>
              )}
              {secondaryCta && (
                <Magnetic strength={0.4}>
                  <Link
                    to={secondaryCta.to}
                    data-cursor="link"
                    className="inline-flex items-center bg-transparent text-white border border-white/30 px-8 py-4 rounded-none text-xs font-semibold tracking-widest uppercase hover:bg-white hover:text-primary transition-all"
                  >
                    {secondaryCta.label}
                  </Link>
                </Magnetic>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default EditorialHero;
