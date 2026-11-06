import { useVisiblePoll } from "@/Hooks/useVisiblePoll";
import { CopyButton } from "@/Components/Common/CopyButton";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, FileText, Undo2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { TabButton } from "@/Components/Common/ListView";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/InnoCBS/Accounts/accountShared";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { notifications } from "@/Utils/Lib/notifications";
import { NarrationDialog, Section } from "../Deposits/depositShared";
import { MiniTable, useInstitutionScope } from "../Loans/loanShared";
import { ProofSheet, QUEUE_EVERY, Variance, kindLabel, notesText, readTransfers, sessionOwner } from "./tellerShared";

// What only this user can complete, on the desk.
export function WaitingPanel({ waiting, onChanged }) {
  const { t } = useTranslation("corebank");
  if (!waiting.rows.length) return null;
  return (
    <Section title={t("waitingForMeN", { count: waiting.rows.length })}>
      <div data-tour="teller-waiting">
        <TransferRows rows={waiting.rows} onChanged={onChanged} />
      </div>
    </Section>
  );
}

// Cash Transfers: waiting for me, my pending requests, and all (filtered).
export function Transfers({ waiting }) {
  const { t } = useTranslation("corebank");
  const me = useOwnIds().userId;
  const [view, setView] = useState(waiting.closes.length ? "closes" : waiting.rows.length ? "waiting" : "all");
  const [filters, setFilters] = useState({ kind: "", status: "" });
  const tabs = [
    ["all"],
    ["waiting", waiting.rows.length],
    ["closes", waiting.closes.length],
    ["mine"],
  ];
  const select = (key, blank, values, prefix) => (
    <FilterSelect
      size="sm"
      className="w-40"
      value={filters[key]}
      onChange={(v) => setFilters((f) => ({ ...f, [key]: v }))}
      options={[{ value: "", label: t(blank) }, ...values.map((k) => ({ value: k, label: t(`${prefix}${k}`) }))]}
    />
  );
  const hint = { waiting: "waitingHint", closes: "closesHint" }[view];
  return (
    <Section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="thin-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
          {tabs.map(([key, count]) => (
            <TabButton key={key} active={view === key} onClick={() => setView(key)}>
              {t(`transfersTab_${key}`)}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{count}</span>
              )}
            </TabButton>
          ))}
        </div>
        {view === "all" && (
          <div className="flex flex-wrap gap-2">
            {select("kind", "anyKind", ["REQUISITION", "ISSUE", "RETURN", "TRANSFER"], "transfer_")}
            {select("status", "anyStatus", ["PENDING", "COMPLETED", "REJECTED", "CANCELLED"], "transferStatus_")}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{t(hint)}</p>}
      {view === "waiting" && <TransferRows rows={waiting.rows} onChanged={waiting.reload} />}
      {view === "closes" && <PendingCloses tills={waiting.closes} onChanged={waiting.reload} />}
      {view === "mine" && (
        <TransferTable
          query={{ status: "PENDING" }}
          keep={(r) => String(r.requested_user_id) === String(me)}
          onChanged={waiting.reload}
        />
      )}
      {view === "all" && (
        <TransferTable
          query={Object.fromEntries(Object.entries(filters).filter(([, v]) => v))}
          onChanged={waiting.reload}
        />
      )}
    </Section>
  );
}

// Transfers for a query (latest first, at most 200), read again every
// QUEUE_EVERY and after an action.
export function TransferTable({ query, keep, onChanged }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const key = JSON.stringify(query);
  // Read again on a timer, so a refusal shows here rather than as a toast
  // every time.
  const load = useCallback(
    ({ force = true } = {}) =>
      readTransfers(scope(JSON.parse(key)), { force })
        .then((r) => {
          setRows(Array.isArray(r?.data) ? r.data : []);
          setError("");
        })
        .catch((e) => {
          setRows((prev) => prev ?? []);
          setError(e.message);
        }),
    [key, scope],
  );
  useEffect(() => {
    void load({ force: false });
  }, [load]);
  useVisiblePoll(load, QUEUE_EVERY);
  if (!rows) return <PageSkeleton />;
  return (
    <TransferRows
      rows={keep ? rows.filter(keep) : rows}
      empty={error || t("noTransfers")}
      onChanged={() => {
        void load();
        onChanged?.();
      }}
    />
  );
}

// Transfer rows with the buttons the server allows (actions): Approve a
// requisition, Accept a return or transfer, Reject with a reason, Cancel
// one's own.
function TransferRows({ rows, empty, onChanged }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [deciding, setDeciding] = useState(null);
  const [day, setDay] = useState(null);
  const decide = async (note) => {
    const { verb, row } = deciding;
    try {
      const r = await tellerApi[`transfer_${verb}`](
        scope({ transfer_id: row.id, ...(note ? { note } : {}) }),
      );
      if (r?.message) notifications.success(r.message);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setDeciding(null);
      onChanged?.();
    }
  };
  const fromTo = (code, kind) => (
    <span className="text-xs">
      <b className="font-mono">{code}</b>{" "}
      <span className="text-muted-foreground">{kindLabel(t, kind)}</span>
    </span>
  );
  return (
    <>
      {day && <ProofSheet till={{ id: day.from_till_id ?? day.till_id, code: day.from_till_code, currency: day.currency }} sessionId={day.till_session_id} onClose={() => setDay(null)} />}
      <MiniTable
        rows={rows}
        rowKey={(r) => r.id}
        empty={empty ?? t("noTransfers")}
        columns={[
          {
            key: "requested_at",
            label: t("requested"),
            render: (r) => (
              <span className="text-xs leading-tight">
                <b className="block">{accountDate(r.requested_at)}</b>
                <span className="text-muted-foreground">{r.requested_by}</span>
              </span>
            ),
          },
          {
            key: "kind",
            label: t("kind"),
            render: (r) => <span className="text-xs font-semibold">{t(`transfer_${r.kind}`)}</span>,
          },
          { key: "from", label: t("from"), render: (r) => fromTo(r.from_till_code, r.from_till_kind) },
          { key: "to", label: t("to"), render: (r) => fromTo(r.to_till_code, r.to_till_kind) },
          {
            key: "amount",
            label: t("amount"),
            align: "right",
            render: (r) => <b className="tabular-nums">{money(r.amount, r.currency)}</b>,
          },
          {
            key: "reference",
            label: t("reference"),
            wrap: true,
            render: (r) => (
              <span className="text-xs leading-tight">
                <span className="block font-mono">{r.reference} <CopyButton value={r.reference} /></span>
                {r.narration && <span className="text-muted-foreground">{r.narration}</span>}
              </span>
            ),
          },
          {
            key: "status",
            label: t("status"),
            wrap: true,
            render: (r) => (
              <span className="text-xs leading-tight">
                <StatusBadge status={r.status} />
                {r.status === "PENDING" && !r.actions?.approve && (
                  <span className="mt-0.5 block text-muted-foreground">
                    {r.kind === "TRANSFER"
                      ? t("waitingFor", { code: r.to_till_code })
                      : t("waitingForCustodian")}
                  </span>
                )}
                {r.decided_by && r.status !== "PENDING" && (
                  <span className="mt-0.5 block text-muted-foreground">
                    {r.decided_by} · {accountDate(r.decided_at)}
                  </span>
                )}
                {r.decision_note && (
                  <span className="mt-0.5 block italic text-muted-foreground">{r.decision_note}</span>
                )}
                {r.rrn && <span className="mt-0.5 block font-mono text-[10px]">{r.rrn} <CopyButton value={r.rrn} /></span>}
              </span>
            ),
          },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <span className="flex flex-wrap justify-end gap-1">
                {r.kind === "RETURN" && Number(r.till_session_id) > 0 && (
                  <Button size="sm" variant="outline" icon={FileText} onClick={() => setDay(r)}>
                    {t("tellersDay")}
                  </Button>
                )}
                {r.actions?.approve && (
                  <Button
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => setDeciding({ verb: "approve", row: r })}
                  >
                    {t(r.kind === "REQUISITION" ? "approve" : "accept")}
                  </Button>
                )}
                {r.actions?.reject && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={XCircle}
                    onClick={() => setDeciding({ verb: "reject", row: r })}
                  >
                    {t("reject")}
                  </Button>
                )}
                {r.actions?.cancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Undo2}
                    onClick={() => setDeciding({ verb: "cancel", row: r })}
                  >
                    {t("cancelRequest")}
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
      {deciding && (
        <NarrationDialog
          title={t(`decide_${deciding.verb}`, {
            amount: money(deciding.row.amount, deciding.row.currency),
            from: deciding.row.from_till_code,
            to: deciding.row.to_till_code,
          })}
          hint={t(`decideHint_${deciding.verb}`)}
          confirmLabel={t(
            deciding.verb === "approve"
              ? deciding.row.kind === "REQUISITION"
                ? "approve"
                : "accept"
              : deciding.verb === "reject"
                ? "reject"
                : "cancelRequest",
          )}
          variant={deciding.verb === "approve" ? "primary" : "danger"}
          required={deciding.verb === "reject"}
          onClose={() => setDeciding(null)}
          onSave={decide}
        />
      )}
    </>
  );
}

// Tills whose close waits for a vault custodian: approve the difference (it
// is booked and the till closes) or send it back for a recount (a reason is
// required; the till is open again).
function PendingCloses({ tills, onChanged }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [deciding, setDeciding] = useState(null);
  const [proof, setProof] = useState(null);
  const decide = async (note) => {
    const { verb, till } = deciding;
    try {
      const r = await tellerApi[verb](scope({ id: till.id, ...(note ? { note } : {}) }));
      if (r?.message) notifications.success(r.message);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setDeciding(null);
      onChanged?.();
    }
  };
  return (
    <>
      <MiniTable
        rows={tills}
        rowKey={(x) => x.id}
        empty={t("noPendingCloses")}
        columns={[
          {
            key: "till",
            label: t("till"),
            render: (x) => (
              <span className="text-xs leading-tight">
                <b className="block font-mono">{x.code}</b>
                <span className="text-muted-foreground">{x.branch_name}</span>
              </span>
            ),
          },
          { key: "teller", label: t("teller"), render: (x) => <span className="text-xs">{sessionOwner(x.session)}</span> },
          { key: "expected", label: t("expected"), align: "right", render: (x) => money(x.session?.closing_expected, x.currency) },
          { key: "counted", label: t("closingCount"), align: "right", render: (x) => money(x.session?.closing_counted, x.currency) },
          { key: "variance", label: t("variance"), align: "right", render: (x) => <Variance value={x.session?.variance} currency={x.currency} /> },
          { key: "notes", label: t("byNote"), wrap: true, render: (x) => <span className="font-mono text-[11px]">{notesText(x.session?.denominations)}</span> },
          {
            key: "actions",
            label: "",
            render: (x) => (
              <span className="flex flex-wrap justify-end gap-1">
                <Button size="sm" variant="ghost" icon={FileText} onClick={() => setProof(x)}>
                  {t("proofSheet")}
                </Button>
                <Button size="sm" icon={CheckCircle2} onClick={() => setDeciding({ verb: "close_approve", till: x })}>
                  {t("approveDifference")}
                </Button>
                <Button size="sm" variant="danger" icon={XCircle} onClick={() => setDeciding({ verb: "close_reject", till: x })}>
                  {t("sendBackRecount")}
                </Button>
              </span>
            ),
          },
        ]}
      />
      {deciding && (
        <NarrationDialog
          title={t(deciding.verb === "close_approve" ? "approveDifference" : "sendBackRecount")}
          hint={t(deciding.verb === "close_approve" ? "approveDifferenceHint" : "sendBackHint", {
            amount: money(deciding.till.session?.variance, deciding.till.currency),
            code: deciding.till.code,
          })}
          confirmLabel={t(deciding.verb === "close_approve" ? "approveDifference" : "sendBackRecount")}
          variant={deciding.verb === "close_approve" ? "primary" : "danger"}
          required={deciding.verb === "close_reject"}
          onClose={() => setDeciding(null)}
          onSave={decide}
        />
      )}
      {proof && <ProofSheet till={proof} onClose={() => setProof(null)} />}
    </>
  );
}
