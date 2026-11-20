import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { CheckCircle2, CreditCard, Maximize2, XCircle, X } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { cardOrdersApi } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { cn } from "@/Utils/Lib/utils";

// An approved big order makes its cards in the background (Admin_38: 200 at
// a time, a live push after each batch). This follows one order: a pop-up
// with the progress, speed and time left, which can be sent to the
// background as a small tracker in the corner (click it to open it again).
// Only this order is fetched on a push; nothing else on the page redraws.

const fmt = (n) => Number(n || 0).toLocaleString();
function timeLeft(t, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return t("etaSeconds", { count: Math.ceil(seconds) });
  if (seconds < 3600) return t("etaMinutes", { count: Math.ceil(seconds / 60) });
  if (seconds < 86400) return t("etaHours", { count: Math.round(seconds / 360) / 10 });
  return t("etaDays", { count: Math.round(seconds / 8640) / 10 });
}

export function CardMakingTracker({ id, minimized, onMinimize, onOpen, onClose, onView }) {
  const { t } = useTranslation(["cards", "common"]);
  const [order, setOrder] = useState(null);
  // The first sample seen, for the speed: cards made per second since then.
  const first = useRef(null);
  const [speed, setSpeed] = useState(null);

  const load = useCallback(async () => {
    try {
      const o = rowsOf(await cardOrdersApi.get({ id }))[0] ?? null;
      if (!o) return;
      setOrder(o);
      const made = Number(o.cards_made) || 0;
      const now = Date.now();
      if (!first.current) first.current = { at: now, made };
      else if (made > first.current.made && now > first.current.at) setSpeed(((made - first.current.made) * 1000) / (now - first.current.at));
    } catch {
      // The next push tries again.
    }
  }, [id]);
  useEffect(() => {
    first.current = null;
    setSpeed(null);
    setOrder(null);
    void load();
  }, [load]);
  useLiveChannel(cardOrdersApi.listPath, (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void load());

  const status = order?.order_status;
  const generating = status === "GENERATING";
  const failed = status === "FAILED";
  const done = order && !generating && !failed;
  const total = Number(order?.quantity) || 0;
  const made = done ? total : Math.min(Number(order?.cards_made) || 0, total);
  const pct = total ? Math.min(100, (made / total) * 100) : 0;
  const eta = generating && speed ? timeLeft(t, (total - made) / speed) : null;
  const pctText = pct >= 99.95 || pct === 0 ? `${Math.round(pct)}%` : `${pct.toFixed(pct < 10 ? 2 : 1)}%`;

  const bar = (thin) => (
    <div className={cn("overflow-hidden rounded-full", thin ? "h-1.5" : "h-3", failed ? "bg-red-100" : done ? "bg-emerald-100" : "bg-[var(--primary-light)]")} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={cn("relative h-full overflow-hidden rounded-full", failed ? "bg-red-500" : done ? "bg-emerald-500" : "bg-[var(--primary)]")}
        initial={false}
        animate={{ width: `${Math.max(pct, generating ? 1 : 0)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {generating && <span className="modal-busy-bar absolute inset-y-0 w-1/3 bg-white/40" />}
      </motion.div>
    </div>
  );

  // In the background: a small card in the corner.
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 w-72 rounded-2xl border border-border bg-card p-3 shadow-xl">
        <div className="mb-2 flex items-center gap-2">
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", failed ? "bg-red-50 text-red-600" : done ? "bg-emerald-50 text-emerald-600" : "bg-[var(--primary-light)] text-[var(--primary)]")}>
            {failed ? <XCircle size={14} /> : done ? <CheckCircle2 size={14} /> : <CreditCard size={14} />}
          </span>
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-bold">{order?.order_ref ?? "…"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{failed ? t("trackerFailed") : done ? t("trackerDone") : `${fmt(made)} / ${fmt(total)} · ${pctText}`}</p>
          </button>
          <button type="button" onClick={onOpen} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" title={t("showProgress")} aria-label={t("showProgress")}>
            <Maximize2 size={13} />
          </button>
          {!generating && (
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label={t("common:close")}>
              <X size={13} />
            </button>
          )}
        </div>
        {bar(true)}
      </div>
    );
  }

  return (
    <Modal
      open
      onClose={generating ? onMinimize : onClose}
      size="sm"
      icon={<CreditCard size={15} />}
      title={t("trackerTitle")}
      subtitle={order ? `${order.order_ref} · ${order.issuance_group_code ?? ""}` : undefined}
      footer={
        <>
          {order && onView && (
            <Button variant="ghost" onClick={() => onView(id)}>
              {t("trackerViewOrder")}
            </Button>
          )}
          {generating ? (
            <Button onClick={onMinimize}>{t("runInBackground")}</Button>
          ) : (
            <Button onClick={onClose}>{t("common:close")}</Button>
          )}
        </>
      }
    >
      {!order ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            {done && <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />}
            {failed && <XCircle size={36} className="mx-auto mb-2 text-red-500" />}
            <p className={cn("text-4xl font-black tabular-nums", failed ? "text-red-600" : done ? "text-emerald-600" : "text-[var(--primary)]")}>{pctText}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{t("makingCards", { made: fmt(made), total: fmt(total) })}</p>
          </div>
          {bar(false)}
          {generating && (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-muted/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("trackerSpeed")}</p>
                <p className="text-sm font-bold tabular-nums">{speed ? t("cardsPerSecond", { count: Math.round(speed).toLocaleString() }) : "…"}</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("trackerTimeLeft")}</p>
                <p className="text-sm font-bold">{eta ?? "…"}</p>
              </div>
            </div>
          )}
          {failed && order.generate_error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{t("generateFailed", { error: order.generate_error })}</p>}
          {done && <p className="text-center text-xs text-muted-foreground">{t("trackerDoneHint")}</p>}
          {generating && <p className="text-center text-xs text-muted-foreground">{t("trackerHint")}</p>}
        </div>
      )}
    </Modal>
  );
}
