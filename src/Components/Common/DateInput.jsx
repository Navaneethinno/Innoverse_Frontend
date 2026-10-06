import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// The app's date picker, in place of <input type="date">: same props
// (value / min / max as YYYY-MM-DD, onChange gets { target: { value } }),
// so a native date input swaps for it as is. The calendar opens in a
// portal (never clipped by a modal), with day, month and year views, so a
// date of birth decades back is three clicks away.

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
};
const todayIso = () => {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
};

export function DateInput({ value, onChange, min, max, disabled, className, title, placeholder, id, name, required, ...rest }) {
  const { i18n, t } = useTranslation("common");
  const locale = i18n.language || "en";
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("days");
  const selected = parse(value);
  const [cursor, setCursor] = useState(() => selected ?? parse(todayIso()));
  const [pos, setPos] = useState(null);

  const inRange = (day) => (!min || day >= String(min).slice(0, 10)) && (!max || day <= String(max).slice(0, 10));
  const emit = (next) => onChange?.({ target: { value: next, name } });
  const pick = (next) => {
    emit(next);
    setOpen(false);
  };
  const show = () => {
    if (disabled) return;
    setCursor(selected ?? parse(todayIso()));
    setView("days");
    setOpen(true);
  };

  // Below the field, or above it when there is no room; kept on screen.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 288;
      const height = panelRef.current?.offsetHeight ?? 340;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      const below = r.bottom + 6 + height <= window.innerHeight;
      setPos({ left, top: below ? r.bottom + 6 : Math.max(8, r.top - height - 6) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = selected
    ? new Date(Date.UTC(selected.y, selected.m, selected.d)).toLocaleDateString(locale, { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
    : "";
  const monthName = (m, style = "long") => new Date(Date.UTC(2000, m, 1)).toLocaleDateString(locale, { timeZone: "UTC", month: style });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { timeZone: "UTC", weekday: "narrow" }));

  const { y, m } = cursor;
  const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Monday first
  const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const yearStart = y - (y % 12);
  const today = todayIso();
  const step = (delta) => {
    if (view === "days") setCursor(({ y: cy, m: cm }) => ({ y: cm + delta < 0 ? cy - 1 : cm + delta > 11 ? cy + 1 : cy, m: (cm + delta + 12) % 12 }));
    else setCursor((c) => ({ ...c, y: c.y + delta * (view === "years" ? 12 : 1) }));
  };

  const cellBase = "flex items-center justify-center rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <>
      <button
        {...rest}
        ref={triggerRef}
        id={id}
        type="button"
        title={title ?? (label || undefined)}
        disabled={disabled}
        aria-required={required || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className,
          open && "border-[var(--primary)] ring-2 ring-[var(--primary)]/20",
        )}
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>{label || placeholder || t("selectDate", "Select date")}</span>
        <CalendarDays size={14} className={cn("shrink-0", open ? "text-[var(--primary)]" : "text-muted-foreground")} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              role="dialog"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="fixed z-[1000] w-72 rounded-2xl border p-3"
              style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, background: "var(--popover)", borderColor: "var(--border)", boxShadow: "var(--glass-shadow), 0 12px 32px rgba(15,23,42,0.12)" }}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <button type="button" onClick={() => step(-1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[var(--primary-light)] hover:text-[var(--primary)]" aria-label={t("previous", "Previous")}>
                  <ChevronLeft size={15} />
                </button>
                <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                  {view === "days" && (
                    <button type="button" onClick={() => setView("months")} className="rounded-lg px-2 py-1 hover:bg-[var(--primary-light)] hover:text-[var(--primary)]">
                      {monthName(m)}
                    </button>
                  )}
                  {view !== "years" ? (
                    <button type="button" onClick={() => setView("years")} className="rounded-lg px-2 py-1 hover:bg-[var(--primary-light)] hover:text-[var(--primary)]">
                      {y}
                    </button>
                  ) : (
                    <span className="px-2 py-1">
                      {yearStart} – {yearStart + 11}
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => step(1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[var(--primary-light)] hover:text-[var(--primary)]" aria-label={t("next", "Next")}>
                  <ChevronRight size={15} />
                </button>
              </div>

              {view === "days" && (
                <div className="grid grid-cols-7 gap-0.5">
                  {weekdays.map((w, i) => (
                    <span key={i} className="flex h-7 items-center justify-center text-[10px] font-bold uppercase text-muted-foreground">
                      {w}
                    </span>
                  ))}
                  {cells.map((d, i) => {
                    if (!d) return <span key={`e${i}`} />;
                    const day = iso(y, m, d);
                    const isSel = value && String(value).slice(0, 10) === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!inRange(day)}
                        onClick={() => pick(day)}
                        className={cn(
                          cellBase,
                          "h-9",
                          isSel ? "bg-[var(--primary)] text-[var(--primary-foreground,#fff)] shadow-sm" : "text-foreground hover:bg-[var(--primary-light)] hover:text-[var(--primary)]",
                          !isSel && day === today && "ring-1 ring-inset ring-[var(--primary)]",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}

              {view === "months" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCursor((c) => ({ ...c, m: i }));
                        setView("days");
                      }}
                      className={cn(cellBase, "h-11", i === m ? "bg-[var(--primary)] text-[var(--primary-foreground,#fff)]" : "text-foreground hover:bg-[var(--primary-light)] hover:text-[var(--primary)]")}
                    >
                      {monthName(i, "short")}
                    </button>
                  ))}
                </div>
              )}

              {view === "years" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => yearStart + i).map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setCursor((c) => ({ ...c, y: yr }));
                        setView("months");
                      }}
                      className={cn(cellBase, "h-11", yr === y ? "bg-[var(--primary)] text-[var(--primary-foreground,#fff)]" : "text-foreground hover:bg-[var(--primary-light)] hover:text-[var(--primary)]")}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => pick("")}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-red-50 hover:text-red-600"
                >
                  <X size={12} /> {t("clear", "Clear")}
                </button>
                <button
                  type="button"
                  disabled={!inRange(today)}
                  onClick={() => pick(today)}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-40"
                >
                  {t("today", "Today")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

// An <input> whose type is decided at run time: a date gets the picker.
export function TypedInput({ type, ...props }) {
  return type === "date" ? <DateInput {...props} /> : <input type={type} {...props} />;
}
