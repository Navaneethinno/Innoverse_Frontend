import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Volume2, VolumeX } from "lucide-react";
import { barcodeBars } from "@/Utils/Lib/barcode";
import "./posReceipt.css";

// A POS terminal printing the receipt as a thermal slip: the paper comes out
// of the slot one line at a time (stopping at each line, like a real print
// head), then is torn off. Taken from the customer portal's receipt.
//
//   <PosReceipt slip={receiptSlip(...)} logo={url} ref={ref} />
//   ref.current.replay()  - print it again on screen
//   ref.current.finish()  - jump to the torn-off slip (before window.print)
//
// The final slip is rendered first, so nothing looks broken while the script
// starts; then the animation plays. With reduced motion it stays final. Every
// value wraps inside the slip, however long the amount or balance is.
const ROOM = 32; // px under the paper: its bottom zigzag (8) and the lift after the tear
const LIFT = 14; // how far the torn receipt hangs below the slot
const FINAL = `translateY(${LIFT}px)`;
const SOUND_KEY = "innoverse-admin:printer-sound";
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const readSound = () => {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};

function Barcode({ value }) {
  const { bars, total } = barcodeBars(value);
  return (
    <svg className="pos-barcode" viewBox={`0 0 ${total} 40`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y="0" width={bar.width} height="40" fill="#23201b" />
      ))}
    </svg>
  );
}

// The nearest ancestor that scrolls vertically, if any.
function scrollBox(node) {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}

const Rule = () => <div className="ln pos-rule" aria-hidden="true" />;

export const PosReceipt = forwardRef(function PosReceipt({ slip, logo }, ref) {
  const { t } = useTranslation("txn");
  const windowRef = useRef(null);
  const paperRef = useRef(null);
  const logoRef = useRef(null);
  const runId = useRef(0);
  const audioRef = useRef(null);
  const soundOn = useRef(readSound());
  const animating = useRef(false);
  const [phase, setPhase] = useState("done"); // printing | ready | done
  const [winHeight, setWinHeight] = useState(null);
  const [sound, setSound] = useState(readSound);

  // Sound, like a modern thermal printer: a soft "tsss" per line, a quiet
  // motor hum under the print, a crisp tear and a two-note beep. Wrapped so
  // sound can never break the receipt.
  const audio = useCallback(() => {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    audioRef.current ??= new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }, []);
  const envelope = (param, now, peak, seconds, attack = 0.004) => {
    param.setValueAtTime(0.0001, now);
    param.linearRampToValueAtTime(peak, now + attack);
    param.exponentialRampToValueAtTime(0.0001, now + seconds);
  };
  const hiss = useCallback(
    (ms, { low = 3800, high = 8500, gain = 0.16 } = {}) => {
      if (!soundOn.current) return;
      try {
        const context = audio();
        const length = Math.floor((context.sampleRate * ms) / 1000);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        const source = context.createBufferSource();
        source.buffer = buffer;
        const highpass = context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = low;
        const lowpass = context.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = high;
        const volume = context.createGain();
        envelope(volume.gain, context.currentTime, gain, ms / 1000);
        source.connect(highpass).connect(lowpass).connect(volume).connect(context.destination);
        source.start();
      } catch {
        /* Sound is only a nicety. */
      }
    },
    [audio],
  );
  const beep = useCallback(
    (frequency, ms, gain = 0.1, delay = 0) => {
      if (!soundOn.current) return;
      try {
        const context = audio();
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        const volume = context.createGain();
        const now = context.currentTime + delay;
        envelope(volume.gain, now, gain, ms / 1000, 0.008);
        oscillator.connect(volume).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + ms / 1000 + 0.05);
      } catch {
        /* Sound is only a nicety. */
      }
    },
    [audio],
  );
  const startHum = useCallback(() => {
    if (!soundOn.current) return () => {};
    try {
      const context = audio();
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = 118;
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 260;
      const volume = context.createGain();
      const now = context.currentTime;
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.linearRampToValueAtTime(0.03, now + 0.25);
      oscillator.connect(lowpass).connect(volume).connect(context.destination);
      oscillator.start();
      return () => {
        try {
          const end = context.currentTime;
          volume.gain.cancelScheduledValues(end);
          volume.gain.setValueAtTime(volume.gain.value, end);
          volume.gain.linearRampToValueAtTime(0.0001, end + 0.15);
          oscillator.stop(end + 0.2);
        } catch {
          /* already stopped */
        }
      };
    } catch {
      return () => {};
    }
  }, [audio]);

  // The final state: printed, torn off and hanging just below the slot.
  const snapFinal = useCallback(() => {
    const paper = paperRef.current;
    if (!paper) return;
    paper.getAnimations().forEach((animation) => animation.cancel());
    paper.style.clipPath = "none";
    paper.style.transform = FINAL;
    setWinHeight(paper.offsetHeight + ROOM);
  }, []);

  const run = useCallback(async () => {
    runId.current += 1;
    const token = runId.current;
    const alive = () => runId.current === token;
    if (reducedMotion()) {
      animating.current = false;
      setPhase("done");
      snapFinal();
      return;
    }
    animating.current = true;
    let stopHum = () => {};
    try {
      // Fonts and the logo change the paper's height: measure once they are in.
      await document.fonts?.ready;
      await logoRef.current?.decode?.().catch(() => {});
      if (!alive()) return;
      const paper = paperRef.current;
      const win = windowRef.current;
      if (!paper || !win) return;
      const height = paper.offsetHeight;
      win.style.height = `${height + ROOM}px`;
      setWinHeight(height + ROOM);
      // Only what is printed so far shows, revealed from the top down.
      const shown = (printed) => `inset(0 0 ${Math.max(0, height - printed)}px 0)`;
      paper.getAnimations().forEach((animation) => animation.cancel());
      paper.style.transform = "translateY(0px)";
      paper.style.clipPath = shown(0);
      setPhase("printing");
      // In a scrolling box (the dialog), follow the print head down so the
      // line being printed stays in view; start with the printer at the top.
      const box = scrollBox(win);
      box?.scrollTo({ top: 0, behavior: "smooth" });
      const follow = (printed) => {
        if (!box) return;
        const top = paper.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
        const target = top + printed + 48 - box.clientHeight;
        if (target > box.scrollTop) box.scrollTo({ top: target, behavior: "smooth" });
      };
      stopHum = startHum();
      await wait(450);
      if (!alive()) return;

      // Where the print head stops: the bottom of each line, then the whole paper.
      const stops = [...paper.querySelectorAll(".ln")].map((line) => line.offsetTop + line.getBoundingClientRect().height);
      stops.push(height);
      let previous = 0;
      for (const stop of stops) {
        if (stop <= previous) continue;
        const distance = stop - previous;
        const feed = paper.animate([{ clipPath: shown(previous) }, { clipPath: shown(stop) }], {
          duration: Math.max(60, distance * 4.5),
          easing: "cubic-bezier(.2,.8,.3,1)",
        });
        hiss(Math.min(150, 40 + distance * 2.2), { gain: 0.16 + Math.random() * 0.05 });
        follow(stop);
        try {
          await feed.finished;
        } catch {
          /* cancelled by a newer run */
        }
        if (!alive()) return;
        paper.style.clipPath = shown(stop);
        feed.cancel();
        previous = stop;
        // The stop-start stutter is what makes it feel like a thermal head.
        await wait(35 + Math.random() * 30);
        if (!alive()) return;
      }

      setPhase("ready");
      await wait(260);
      if (!alive()) return;
      // The tear: pulled down and away from the slot.
      paper.style.clipPath = "none";
      stopHum();
      hiss(14, { low: 1200, high: 9000, gain: 0.32 });
      hiss(130, { low: 2600, high: 10000, gain: 0.26 });
      const tear = paper.animate(
        [
          { transform: "translateY(0px) rotate(0deg)" },
          { transform: `translateY(${LIFT - 4}px) rotate(1.2deg)`, offset: 0.45 },
          { transform: `translateY(${LIFT}px) rotate(0deg)` },
        ],
        { duration: 480, easing: "ease-out" },
      );
      try {
        await tear.finished;
      } catch {
        /* cancelled by a newer run */
      }
      if (!alive()) return;
      paper.style.transform = FINAL;
      tear.cancel();
      setPhase("done");
      beep(1760, 85, 0.1);
      beep(2349, 130, 0.1, 0.11);
    } finally {
      stopHum();
      if (alive()) animating.current = false;
    }
  }, [beep, hiss, snapFinal, startHum]);

  const finish = useCallback(() => {
    runId.current += 1;
    animating.current = false;
    setPhase("done");
    snapFinal();
  }, [snapFinal]);

  useImperativeHandle(ref, () => ({ replay: () => void run(), finish }), [run, finish]);

  // Final state first, then the animation.
  useLayoutEffect(() => {
    snapFinal();
  }, [snapFinal]);
  useEffect(() => {
    void run();
    return () => {
      runId.current += 1; // cancels a run in progress
    };
  }, [run]);

  // Re-fit when the slip changes (a reprint), on resize or when fonts arrive,
  // unless it is printing.
  useEffect(() => {
    if (!animating.current) snapFinal();
  }, [slip, snapFinal]);
  useEffect(() => {
    const refit = () => {
      if (!animating.current) snapFinal();
    };
    window.addEventListener("resize", refit);
    document.fonts?.ready.then(refit);
    return () => window.removeEventListener("resize", refit);
  }, [snapFinal]);

  const printing = phase === "printing";
  const toggleSound = () => {
    soundOn.current = !soundOn.current;
    setSound(soundOn.current);
    try {
      window.localStorage.setItem(SOUND_KEY, soundOn.current ? "on" : "off");
    } catch {
      /* The choice just won't be remembered. */
    }
    if (soundOn.current) hiss(90);
  };

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground" aria-live="polite">
          {phase === "done" ? t("rcptPrinted") : t("rcptPrinting")}
        </p>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={t(sound ? "rcptSoundOff" : "rcptSoundOn")}
          title={t(sound ? "rcptSoundOff" : "rcptSoundOn")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:scale-105 hover:text-primary"
        >
          {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>

      <div className="pos-printer" aria-hidden="true">
        <span className="pos-brand-label">{slip.name ? `${slip.name} POS` : "POS"}</span>
        <span className="pos-led" data-state={printing ? "printing" : "ready"}>
          <span className="pos-led-dot" />
          {printing ? t("rcptLedPrinting") : t("rcptLedReady")}
        </span>
        <div className="pos-slot" />
      </div>

      <div ref={windowRef} className="pos-window" style={winHeight ? { height: winHeight } : undefined}>
        <div ref={paperRef} className="pos-paper">
          {logo && (
            <div className="ln pos-logo">
              <img ref={logoRef} src={logo} alt="" onLoad={() => !animating.current && snapFinal()} />
            </div>
          )}
          {slip.name && <div className="ln pos-brand">{slip.name.toUpperCase()}</div>}
          {slip.header.map((line) => (
            <div key={line} className="ln pos-small">
              {line}
            </div>
          ))}
          <Rule />
          <div className="ln pos-title">{slip.heading}</div>
          {slip.duplicate && (
            <>
              <div className="ln pos-title pos-duplicate">*** {slip.duplicate[0]} ***</div>
              <div className="ln pos-small">{slip.duplicate[1]}</div>
            </>
          )}
          {slip.sections.map((section, i) => (
            <div key={i}>
              <Rule />
              {section.map((row) => (
                <div key={row.label}>
                  <div className={`ln pos-row ${row.strong ? "pos-total" : ""}`}>
                    <span className="pos-label">{row.label}</span>
                    <span className="pos-value">{row.value}</span>
                  </div>
                  {row.sub && <div className="ln pos-sub">{row.sub}</div>}
                </div>
              ))}
            </div>
          ))}
          <Rule />
          {slip.reference && <Barcode value={slip.reference} />}
          {slip.reference && (
            <div className="ln pos-small" style={{ letterSpacing: "0.12em" }}>
              {slip.reference}
            </div>
          )}
          {slip.footer.map((line, index) => (
            <div key={line} className={index === 0 ? "ln pos-center" : "ln pos-small"} style={index === 0 ? { marginTop: 10 } : undefined}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
