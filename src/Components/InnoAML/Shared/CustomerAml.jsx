import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, RefreshCw, ShieldAlert } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { useMenuPermission } from "@/Hooks/usePermission";
import { amlScreeningApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { BandBadge, EffectiveResult, partyLabel, when } from "./amlShared";
import { ScreeningDetailModal } from "./ScreeningDetail";

import { Button } from "@/Components/Common/Button";
const first = (response) => rowsOf(response)[0] ?? null;

// A customer's current AML result (screening/customer shape, also the `aml`
// field of the customer get/pending replies): the worst effective score of
// its latest run, and that run's screenings — one per person or company.
export function CustomerAmlResult({ result, onOpenScreening }) {
  const { t } = useTranslation("aml");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <BandBadge band={result.band} score={result.score} showAction />
        <span className="text-xs text-muted-foreground">
          {t("partiesMatched", { matched: result.matched_parties ?? 0, parties: result.parties ?? 0 })} · {result.screened_by} · {when(result.screened_at)}
        </span>
      </div>
      <ul className="divide-y rounded-xl border">
        {(result.screenings ?? []).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">{partyLabel(s)}</span>
            <span className="flex items-center gap-2">
              <EffectiveResult row={s} />
              <span className="text-[11px] text-muted-foreground">{t("matchCount", { count: s.match_count ?? 0 })}</span>
              {onOpenScreening && (
                <button type="button" onClick={() => onOpenScreening(s.id)} title={t("openScreening")} className="rounded-lg p-1.5 text-primary hover:bg-muted">
                  <Eye size={14} />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Loads a customer's result, with Re-screen (Edit on Screenings) and each
// screening's detail.
export function CustomerAmlModal({ customerKind, referenceId, onClose }) {
  const { t } = useTranslation("aml");
  const canRescreen = useMenuPermission("Screenings")("Edit");
  const [result, setResult] = useState(null);
  const [missing, setMissing] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);
  const body = { customer_kind: customerKind, reference_id: referenceId };

  const load = useCallback(() => {
    amlScreeningApi
      .customer({ customer_kind: customerKind, reference_id: referenceId })
      .then((r) => setResult(first(r)))
      .catch((error) => setMissing(error.message));
  }, [customerKind, referenceId]);
  useEffect(() => load(), [load]);

  const rescreen = async () => {
    setBusy(true);
    try {
      const response = await amlScreeningApi.rescreen(body);
      notifications.success(apiMessage(response, t("rescreened")));
      setMissing("");
      setResult(first(response));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("customerResult")}
      footer={
        canRescreen && (
          <Button disabled={busy} onClick={() => void rescreen()}>
            {busy ? <Spinner size={13} /> : <RefreshCw size={14} />} {t("rescreen")}
          </Button>
        )
      }
    >
      {missing ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{missing}</p>
      ) : !result ? (
        <div className="flex justify-center py-8">
          <Spinner size={20} />
        </div>
      ) : (
        <CustomerAmlResult result={result} onOpenScreening={setOpenId} />
      )}
      {openId && <ScreeningDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </Modal>
  );
}

// The AML result on the existing customer screens (wizard and the checker's
// dialog), next to risk but never combined with it. Absent until the
// customer's first submit.
export function CustomerAmlBadge({ aml, customerKind, referenceId, className = "mb-4" }) {
  const { t } = useTranslation("aml");
  const canView = useMenuPermission("Screenings")("View");
  const [open, setOpen] = useState(false);
  if (!aml) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${className}`}>
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <ShieldAlert size={14} className="text-muted-foreground" /> {t("amlResult")}
      </span>
      {aml.status === "ERROR" ? <span className="text-[11px] font-semibold text-destructive">{t("screeningFailed")}</span> : <BandBadge band={aml.band} score={aml.score} showAction />}
      <span className="text-[11px] text-muted-foreground">{t("partiesMatched", { matched: aml.matched_parties ?? 0, parties: aml.parties ?? 0 })}</span>
      {canView && referenceId && (
        <button type="button" onClick={() => setOpen(true)} className="ml-auto text-[11px] font-bold text-primary">
          {t("viewScreenings")}
        </button>
      )}
      {open && <CustomerAmlModal customerKind={customerKind} referenceId={referenceId} onClose={() => setOpen(false)} />}
    </div>
  );
}
