import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Hand, X } from "lucide-react";
import { ICONS } from "./guideTopics";
import { ApprovalFlow } from "./ApprovalFlow";

// The guide's spotlight and card, drawn by hand (not Joyride) so they glide
// from one step to the next, follow a target that scrolls or resizes, and
// leave the highlighted element clickable for practice steps. Clicks
// anywhere else are blocked while the guide runs.

const PAD = 6;
const GAP = 12;
const MARGIN = 12;

const rectOf = (target) => {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
};
const same = (a, b) => a === b || (a && b && ["top", "left", "width", "height"].every((k) => Math.abs(a[k] - b[k]) < 0.5));

// The hole's box, read every frame while the guide runs (a target inside a
// scrolling modal or an animating panel keeps moving).
function useTargetRect(target) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    if (!target) {
      setRect(null);
      return undefined;
    }
    let frame;
    const tick = () => {
      const next = rectOf(target);
      setRect((previous) => (same(previous, next) ? previous : next));
      frame = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(frame);
  }, [target]);
  return rect;
}

// Where the card goes: the step's side if it fits, else the side with the
// most room, kept on screen. Phones get a sheet at the top or bottom.
function placeCard(hole, card, preferred) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!hole) return { top: Math.max(MARGIN, (vh - card.height) / 2), left: Math.max(MARGIN, (vw - card.width) / 2) };
  if (vw < 640) {
    const below = hole.top + hole.height / 2 < vh / 2;
    return { left: MARGIN, top: below ? vh - card.height - MARGIN : MARGIN, sheet: true };
  }
  const spots = {
    bottom: { top: hole.top + hole.height + GAP, left: hole.left + hole.width / 2 - card.width / 2 },
    top: { top: hole.top - card.height - GAP, left: hole.left + hole.width / 2 - card.width / 2 },
    right: { top: hole.top + hole.height / 2 - card.height / 2, left: hole.left + hole.width + GAP },
    left: { top: hole.top + hole.height / 2 - card.height / 2, left: hole.left - card.width - GAP },
  };
  const fits = (s) => s.top >= MARGIN && s.left >= MARGIN && s.top + card.height <= vh - MARGIN && s.left + card.width <= vw - MARGIN;
  const first = String(preferred ?? "bottom").split("-")[0];
  const order = [first, "bottom", "top", "left", "right"].filter((s) => spots[s]);
  const spot = spots[order.find((s) => fits(spots[s])) ?? "bottom"];
  return {
    top: Math.min(Math.max(MARGIN, spot.top), vh - card.height - MARGIN),
    left: Math.min(Math.max(MARGIN, spot.left), vw - card.width - MARGIN),
  };
}

export function GuideOverlay({ step, index, total, topicLabel, waiting, practiced, onNext, onBack, onClose }) {
  const { t } = useTranslation("guide");
  const hole = useTargetRect(step && !step.center && !waiting ? step.target : null);
  const cardRef = useRef(null);
  const [card, setCard] = useState({ width: 352, height: 220 });
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setCard({ width: el.offsetWidth, height: el.offsetHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  if (!step) return null;
  const spot = placeCard(waiting ? null : hole, card, step.placement);
  const Icon = ICONS[step.icon ?? step.id] ?? (step.id?.startsWith("action_") ? ICONS.rowActions : null);
  const last = index === total - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ease = "top 320ms cubic-bezier(.2,.8,.2,1), left 320ms cubic-bezier(.2,.8,.2,1), width 320ms cubic-bezier(.2,.8,.2,1), height 320ms cubic-bezier(.2,.8,.2,1), opacity 200ms";
  // Four blockers around the hole: the page can't be clicked, the hole can.
  const blockers = hole
    ? [
        { top: 0, left: 0, width: vw, height: Math.max(0, hole.top) },
        { top: hole.top + hole.height, left: 0, width: vw, height: Math.max(0, vh - hole.top - hole.height) },
        { top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height },
        { top: hole.top, left: hole.left + hole.width, width: Math.max(0, vw - hole.left - hole.width), height: hole.height },
      ]
    : [{ top: 0, left: 0, width: vw, height: vh }];

  return (
    <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true" aria-label={topicLabel}>
      {blockers.map((b, i) => (
        <div key={i} className="fixed" style={b} onMouseDown={(e) => e.preventDefault()} />
      ))}
      {/* The dim with its hole: one ring whose shadow covers the page. */}
      <div
        className="pointer-events-none fixed rounded-xl"
        style={{
          ...(hole ?? { top: vh / 2, left: vw / 2, width: 0, height: 0 }),
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.58)",
          outline: hole ? "2px solid var(--primary)" : "none",
          outlineOffset: 2,
          transition: ease,
        }}
      />
      {hole && step.practice && !practiced && <span className="pointer-events-none fixed rounded-xl ring-4 ring-primary/40 animate-ping" style={{ ...hole, animationDuration: "1.6s" }} />}

      <div
        ref={cardRef}
        className={`fixed rounded-2xl border bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-2xl ${spot.sheet ? "w-[calc(100vw-1.5rem)]" : step.body === "approvalFlow" ? "w-[30rem] max-w-[calc(100vw-1.5rem)]" : "w-[22rem]"}`}
        style={{ top: spot.top, left: spot.left, transition: ease }}
      >
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Icon size={17} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{topicLabel}</p>
            <h3 className="mt-0.5 text-sm font-black leading-snug">{waiting ? t("opening") : step.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="-m-1 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={15} />
          </button>
        </div>

        {waiting ? (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        ) : (
          <>
            {step.body === "approvalFlow" && <ApprovalFlow />}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.content}</p>
            {step.practice && (
              <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${practiced ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-dashed border-primary/50 bg-primary-light text-primary"}`}>
                {practiced ? <Check size={14} /> : <Hand size={14} />}
                {practiced ? t("practiceDone") : t(step.practice.tip)}
              </div>
            )}
          </>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{t("stepOf", { step: index + 1, total })}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="hidden text-[10px] text-muted-foreground sm:inline">{t("keysHint")}</span>
          <div className="ml-auto flex gap-2">
            {index > 0 && !step.hideBack && (
              <button type="button" onClick={onBack} disabled={waiting} className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50">
                <ArrowLeft size={13} /> {t("back")}
              </button>
            )}
            <button type="button" onClick={onNext} disabled={waiting} className="flex items-center gap-1 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {last ? t("done") : step.click ? t("nextOpens") : step.practice && !practiced ? t("skipPractice") : t("next")}
              {!last && <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
