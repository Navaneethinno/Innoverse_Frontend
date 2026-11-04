import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

const SHOW_MS = 10_000;

// A sensitive value shown for 10 seconds at a time: `load` fetches it on each
// show. It hides by itself, on the eye again, or when the tab is left.
export function useTimedReveal(load) {
  const [value, setValue] = useState(null);
  const [shownAt, setShownAt] = useState(0);
  const timer = useRef(null);
  const asked = useRef(0);
  const hide = useCallback(() => {
    asked.current += 1;
    window.clearTimeout(timer.current);
    setValue(null);
  }, []);
  const show = async () => {
    const ask = ++asked.current;
    const next = await load();
    if (ask !== asked.current || next == null) return;
    setValue(next);
    setShownAt(Date.now());
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(hide, SHOW_MS);
  };
  useEffect(() => {
    const onLeave = () => document.visibilityState === "hidden" && hide();
    document.addEventListener("visibilitychange", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onLeave);
      hide();
    };
  }, [hide]);
  return { value, shownAt, show, hide };
}

// The eye, with a ring running down the 10 seconds.
export function RevealEye({ reveal, showLabel, hideLabel, size = 16, className }) {
  const shown = reveal.value != null;
  const label = shown ? hideLabel : showLabel;
  return (
    <button
      type="button"
      onClick={() => (shown ? reveal.hide() : void reveal.show())}
      aria-label={label}
      title={label}
      aria-pressed={shown}
      className={cn("relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95", className)}
    >
      {shown && (
        <svg aria-hidden="true" viewBox="0 0 32 32" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
          <circle key={reveal.shownAt} cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength="100" strokeDasharray="100">
            <animate attributeName="stroke-dashoffset" from="0" to="100" dur={`${SHOW_MS / 1000}s`} fill="freeze" />
          </circle>
        </svg>
      )}
      {shown ? <EyeOff size={size} /> : <Eye size={size} />}
    </button>
  );
}
