import { forwardRef, useRef, useEffect, cloneElement } from 'react';

/**
 * Magnetic wrapper — child element gently pulls toward cursor on hover.
 * Pass any element as a child; it gets the magnetic effect applied.
 */
export const Magnetic = ({ children, strength = 0.35, className = '' }) => {
  const wrapRef = useRef(null);
  const childRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const child = childRef.current;
    if (!wrap || !child) return;

    const handleMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      child.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
    };

    const handleLeave = () => {
      child.style.transform = 'translate3d(0, 0, 0)';
      child.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1)';
    };

    const handleEnter = () => {
      child.style.transition = 'transform 0.15s ease-out';
    };

    wrap.addEventListener('mousemove', handleMove);
    wrap.addEventListener('mouseleave', handleLeave);
    wrap.addEventListener('mouseenter', handleEnter);
    return () => {
      wrap.removeEventListener('mousemove', handleMove);
      wrap.removeEventListener('mouseleave', handleLeave);
      wrap.removeEventListener('mouseenter', handleEnter);
    };
  }, [strength]);

  return (
    <span ref={wrapRef} className={`inline-block ${className}`}>
      <span ref={childRef} className="inline-block will-change-transform">
        {children}
      </span>
    </span>
  );
};

export default Magnetic;
