import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, PackageX, Undo2, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { TabButton } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { Toggle } from "@/Components/Common/Toggle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { ActionButtons, Facts, Problems, Section, inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { usePagedList } from "@/Hooks/usePagedList";
import { usePagePermission } from "@/Hooks/usePermission";
import { cardReturnsApi } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Labelled } from "./cardOpsShared";

const STATUSES = ["PENDING", "COMPLETED", "REJECTED"];
export const HOLDER_TYPES = ["USER", "AGENT", "BRANCH"];
const OUTCOMES = ["RESTOCK", "DESTROYED", "LOST"];

// An error in the user's language when its error_code is a known card one.
export const cardErrorText = (t, e) => (e?.code ? t(`cards:err_${String(e.code).replace(/\./g, "_")}`, { defaultValue: e.message }) : e?.message);

// CARDS > Card Returns (menu 252): instant cards a holder sends back; a
// checker (not the maker, unless Self) decides each card.
export function CardReturns() {
  const { t } = useTranslation(["cards", "common"]);
  const { scope } = useInstitutionScope();
  const location = useLocation();
  const [openId, setOpenId] = useState(location.state?.recordId ?? null);
  const [status, setStatus] = useState("");
  const [holderType, setHolderType] = useState("");
  const list = usePagedList(cardReturnsApi.list, scope({ ...(status ? { status } : {}), ...(holderType ? { holder_type: holderType } : {}) }), { livePath: cardReturnsApi.listPath, enabled: !openId });

  if (openId) {
    return (
      <ReturnView
        id={openId}
        onBack={() => {
          setOpenId(null);
          list.reload();
        }}
      />
    );
  }

  const columns = [
    {
      key: "return_ref",
      label: t("ret_ref"),
      align: "left",
      render: (r) => (
        <button type="button" onClick={() => setOpenId(r.id)} className="font-mono text-xs font-bold text-primary hover:underline">
          {r.return_ref}
        </button>
      ),
    },
    { key: "holder", label: t("ret_holder"), render: (r) => <span className="text-xs">{r.holder_name} <span className="text-[10px] text-muted-foreground">· {t(`ret_holder_${r.holder_type}`, { defaultValue: r.holder_type })}</span></span> },
    { key: "cards", label: t("ret_cards"), render: (r) => <span className="text-xs tabular-nums">{r.cards}</span> },
    { key: "reason", label: t("ret_reason"), render: (r) => <span className="text-xs">{r.reason}</span> },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} /> },
    { key: "created_time", label: t("ret_created"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setOpenId(r.id)} /> },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-5">
        <PageTitle>{t("ret_title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("ret_subtitle")}</p>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          <TabButton active={!status} onClick={() => setStatus("")}>
            {t("ret_all")}
          </TabButton>
          {STATUSES.map((s) => (
            <TabButton key={s} active={status === s} onClick={() => setStatus(s)}>
              {t(`ret_status_${s}`)}
            </TabButton>
          ))}
        </div>
        <FilterSelect className="w-48" value={holderType} onChange={setHolderType} options={[{ value: "", label: t("ret_anyHolder") }, ...HOLDER_TYPES.map((h) => ({ value: h, label: t(`ret_holder_${h}`) }))]} />
      </div>
      <DataTable bare rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} columns={columns} rowKey={(r) => r.id} title={t("ret_title")} emptyTitle={t("ret_none")} emptyDescription={t("ret_noneHint")} />
    </div>
  );
}

// Send back cards one holder holds (picked in Card Stock).
export function ReturnDialog({ holder, cards, onClose, onDone }) {
  const { t } = useTranslation(["cards", "common"]);
  const { scope } = useInstitutionScope();
  const [reason, setReason] = useState("");
  const [items, setItems] = useState(() => cards.map((c) => ({ inventory_id: c.id, pan_masked: c.pan_masked, condition: "UNUSED", note: "" })));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const patch = (i, change) => setItems((list) => list.map((x, j) => (j === i ? { ...x, ...change } : x)));

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardReturnsApi.add(
        scope({
          holder_type: holder.type,
          holder_id: Number(holder.id),
          reason: reason.trim(),
          items: items.map(({ inventory_id, condition, note }) => ({ inventory_id, condition, ...(note.trim() ? { note: note.trim() } : {}) })),
        }),
      );
      notifications.success(response?.message ?? t("ret_sent"));
      onDone();
    } catch (e) {
      setError(cardErrorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("ret_add", { count: cards.length })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon={Undo2} loading={busy} disabled={!reason.trim()} disabledReason={t("common:blockedFillRequired")} onClick={send}>
            {t("ret_send")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("ret_addHint", { name: holder.name })}</p>
        <Labelled label={t("ret_reason")} required>
          <textarea className={`${inputClass} min-h-16`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Labelled>
        <SimpleTable columns={[t("card"), t("ret_condition"), t("ret_note")]}>
          <tbody>
            {items.map((x, i) => (
              <tr key={x.inventory_id} className="border-b border-border/60">
                <td className="px-3 py-2 font-mono">{x.pan_masked}</td>
                <td className="px-3 py-2">
                  <FilterSelect size="sm" value={x.condition} onChange={(v) => patch(i, { condition: v })} options={["UNUSED", "DAMAGED"].map((c) => ({ value: c, label: t(`ret_cond_${c}`) }))} />
                </td>
                <td className="px-3 py-2">
                  <input className={inputClass} value={x.note} maxLength={200} onChange={(e) => patch(i, { note: e.target.value })} />
                </td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
        <Problems message={error} />
      </div>
    </Modal>
  );
}

function ReturnView({ id, onBack }) {
  const { t } = useTranslation(["cards", "common"]);
  const can = usePagePermission();
  const [r, setR] = useState(null);
  const [deciding, setDeciding] = useState(false);
  const reload = useCallback(async () => {
    try {
      setR(rowsOf(await cardReturnsApi.get({ id }))[0] ?? null);
    } catch (e) {
      notifications.error(e.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  if (!r) return <PageSkeleton />;
  const buttons = [r.status === "PENDING" && can("Authorize") && { key: "decide", label: t("ret_decide"), icon: CheckCircle2, variant: "primary", run: () => setDeciding(true) }];

  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {t("ret_back")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 font-mono text-xl font-black">
              <PackageX size={18} className="text-primary" /> {r.return_ref}
            </h1>
            <StatusBadge status={r.status} />
          </div>
          <ActionButtons buttons={buttons} busy={false} />
        </div>
        <Facts
          className="mt-3"
          rows={[
            [t("ret_holder"), `${r.holder_name} · ${t(`ret_holder_${r.holder_type}`, { defaultValue: r.holder_type })}`],
            [t("ret_reason"), r.reason],
            [t("ret_createdBy"), r.created_by],
            [t("ret_created"), accountDate(r.created_time)],
            r.decided_by && [t("ret_decidedBy"), r.decided_by],
            r.decided_at && [t("ret_decidedAt"), accountDate(r.decided_at)],
          ]}
        />
      </div>
      <Section title={t("ret_cards")}>
        <div className="overflow-x-auto">
          <SimpleTable columns={[t("card"), t("ret_condition"), t("ret_note"), t("ret_outcome"), t("ret_certificate"), t("ret_witness")]}>
            <tbody>
              {(r.items ?? []).map((x) => (
                <tr key={x.inventory_id} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono">{x.pan_masked}</td>
                  <td className="px-3 py-2">{x.condition ? t(`ret_cond_${x.condition}`, { defaultValue: x.condition }) : "—"}</td>
                  <td className="px-3 py-2">{x.note || "—"}</td>
                  <td className="px-3 py-2">{x.outcome ? t(`ret_out_${x.outcome}`, { defaultValue: x.outcome }) : "—"}</td>
                  <td className="px-3 py-2">{x.certificate_ref || "—"}</td>
                  <td className="px-3 py-2">{x.witness || "—"}</td>
                </tr>
              ))}
            </tbody>
          </SimpleTable>
        </div>
      </Section>
      {deciding && (
        <DecideDialog
          ret={r}
          onClose={() => setDeciding(false)}
          onDone={() => {
            setDeciding(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

// The checker's decision: an outcome for every card, or a rejection.
function DecideDialog({ ret, onClose, onDone }) {
  const { t } = useTranslation(["cards", "common"]);
  const [reject, setReject] = useState(false);
  const [narration, setNarration] = useState("");
  const [items, setItems] = useState(() => (ret.items ?? []).map((x) => ({ inventory_id: x.inventory_id, pan_masked: x.pan_masked, outcome: x.condition === "DAMAGED" ? "DESTROYED" : "RESTOCK", certificate_ref: "", witness: "" })));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const patch = (i, change) => setItems((list) => list.map((x, j) => (j === i ? { ...x, ...change } : x)));
  const missing = items.some((x) => !x.outcome || (x.outcome === "DESTROYED" && (!x.certificate_ref.trim() || !x.witness.trim())));
  const blocked = reject ? (!narration.trim() ? t("ret_blockedNarration") : null) : missing ? t("ret_blockedOutcomes") : null;

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await cardReturnsApi.auth({
        id: ret.id,
        narration: narration.trim(),
        ...(reject ? { reject: true } : {}),
        items: items.map(({ inventory_id, outcome, certificate_ref, witness }) => ({ inventory_id, outcome, ...(outcome === "DESTROYED" ? { certificate_ref: certificate_ref.trim(), witness: witness.trim() } : {}) })),
      });
      notifications.success(response?.message ?? t("ret_decided"));
      onDone();
    } catch (e) {
      setError(cardErrorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t("ret_decide")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant={reject ? "danger" : "primary"} icon={reject ? XCircle : CheckCircle2} loading={busy} disabled={Boolean(blocked)} disabledReason={blocked} onClick={send}>
            {t(reject ? "ret_reject" : "ret_complete")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Toggle checked={reject} onChange={setReject} label={t("ret_rejectAll")} showLabel />
        {!reject && (
          <div className="overflow-x-auto">
            <SimpleTable columns={[t("card"), t("ret_outcome"), t("ret_certificate"), t("ret_witness")]}>
              <tbody>
                {items.map((x, i) => (
                  <tr key={x.inventory_id} className="border-b border-border/60">
                    <td className="px-3 py-2 font-mono">{x.pan_masked}</td>
                    <td className="px-3 py-2">
                      <FilterSelect size="sm" value={x.outcome} onChange={(v) => patch(i, { outcome: v })} options={OUTCOMES.map((o) => ({ value: o, label: t(`ret_out_${o}`) }))} />
                    </td>
                    <td className="px-3 py-2">
                      <input className={cn(inputClass, x.outcome !== "DESTROYED" && "opacity-50")} disabled={x.outcome !== "DESTROYED"} placeholder="CERT-2026-0042" value={x.certificate_ref} onChange={(e) => patch(i, { certificate_ref: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input className={cn(inputClass, x.outcome !== "DESTROYED" && "opacity-50")} disabled={x.outcome !== "DESTROYED"} placeholder="Jane Smith" value={x.witness} onChange={(e) => patch(i, { witness: e.target.value })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </SimpleTable>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("ret_outcomeHint")}</p>
          </div>
        )}
        <Labelled label={t(reject ? "ret_narrationRequired" : "ret_narration")} required={reject}>
          <textarea className={`${inputClass} min-h-16`} maxLength={500} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </Labelled>
        <Problems message={error} />
      </div>
    </Modal>
  );
}

