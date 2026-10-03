import { useEffect, useRef, useState } from "react";

const DURATION = 450;
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A number that rolls to its new value (about half a second) instead of
// jumping. `format` turns the number into text; the first value shows as is.
export function AnimatedNumber({ value, format = (n) => n.toLocaleString(), className }) {
  const target = Number(value);
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (!Number.isFinite(target) || reduceMotion() || from.current === target) {
      from.current = target;
      setShown(target);
      return undefined;
    }
    const start = performance.now();
    const begin = Number.isFinite(from.current) ? from.current : 0;
    const decimals = (String(value).split(".")[1] ?? "").length;
    let frame = 0;
    const step = (now) => {
      const p = Math.min(1, (now - start) / DURATION);
      const eased = 1 - (1 - p) ** 3;
      setShown(p < 1 ? Number((begin + (target - begin) * eased).toFixed(decimals)) : target);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    from.current = target;
    return () => cancelAnimationFrame(frame);
  }, [target, value]);

  if (value == null || !Number.isFinite(target)) return <span className={className}>—</span>;
  return <span className={className}>{format(shown)}</span>;
}
