import { useEffect, useRef, useState } from 'react';

/**
 * Premium custom cursor:
 * - Outer ring (lags slightly, larger)
 * - Inner dot (precise, fast)
 * - Morphs over interactive elements (data-cursor="link"/"text"/"hidden")
 * - Soft trailing glow
 * Disabled on touch devices.
 */
export function CustomCursor() {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const glowRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState('default');
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Detect touch — hide custom cursor on touch devices
    if (window.matchMedia('(hover: none)').matches) {
      setIsTouch(true);
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let glowX = mouseX;
    let glowY = mouseY;
    let rafId;

    const move = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setVisible(true);
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
    };

    const tick = () => {
      // Ring lags slightly behind for smoothness
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    const leave = () => setVisible(false);
    const enter = () => setVisible(true);

    // Detect interactive element under cursor
    const checkVariant = (e) => {
      const el = e.target.closest('[data-cursor]');
      if (el) {
        setVariant(el.dataset.cursor);
        return;
      }
      // Auto-detect common interactive elements
      const interactive = e.target.closest('a, button, [role="button"], input, textarea, select, label');
      if (interactive) {
        setVariant(interactive.matches('input, textarea, select, label') ? 'text' : 'link');
        return;
      }
      setVariant('default');
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mousemove', checkVariant);
    document.body.addEventListener('mouseleave', leave);
    document.body.addEventListener('mouseenter', enter);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousemove', checkVariant);
      document.body.removeEventListener('mouseleave', leave);
      document.body.removeEventListener('mouseenter', enter);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (isTouch) return null;

  return (
    <div
      className="custom-cursor-root"
      style={{ opacity: visible ? 1 : 0 }}
      data-variant={variant}
    >
      {/* Soft following glow */}
      <div ref={glowRef} className="cursor-glow" />
      {/* Outer ring */}
      <div ref={ringRef} className="cursor-ring" />
      {/* Inner dot */}
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}

export default CustomCursor;
