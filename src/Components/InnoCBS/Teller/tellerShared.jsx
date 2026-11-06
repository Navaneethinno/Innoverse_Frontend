import { LinkButton } from "@/Components/Common/TextButtons";
import { sharedReader } from "@/Hooks/useVisiblePoll";
import { CopyButton } from "@/Components/Common/CopyButton";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { accountDate, money } from "@/Components/InnoCBS/Accounts/accountShared";
import { tellerApi, tellerProofExport } from "@/Services/Accounting/accounting.api";
import { ExportButtons } from "@/Components/Reports/Shared/reportShared";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Facts } from "../Deposits/depositShared";
import { MiniTable, useInstitutionScope } from "../Loans/loanShared";
import { slipReference } from "../coreBankingShared";

// The transfer queue isn't pushed: read again this often on the desk and
// the queue (and after every action).
export const QUEUE_EVERY = 60000;

export const readTransfers = sharedReader((body) => tellerApi.transfers(body));

export const kindLabel = (t, kind) => t(`kind_${kind}`, { defaultValue: kind });

export const sessionOwner = (s) => s?.user_name ?? "—";

export const sessionOwnerId = (s) => String(s?.user_id ?? "");

// A slip number for counter work, made once per dialog and kept across
// retries: the same slip on the same till never posts twice.
export const newSlip = (till) => slipReference(`${till.code}-${Date.now().toString(36).toUpperCase()}`);

// "1000×42 · 200×2": a count by note.
export const notesText = (d) =>
  d && typeof d === "object" && Object.keys(d).length
    ? Object.entries(d)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([note, count]) => `${note}×${count}`)
        .join(" · ")
    : "—";

// The till's money: balance, cash promised either way, what's available
// and its limit.
export function BalanceFacts({ till }) {
  const { t } = useTranslation("corebank");
  const m = (v) => money(v ?? "0", till.currency);
  return (
    <Facts
      rows={[
        [t("balance"), m(till.balance), "font-black"],
        [t("available"), m(till.available ?? till.balance), "font-black text-emerald-700"],
        [t("pendingOut"), m(till.pending_out), Number(till.pending_out) ? "text-amber-700" : undefined],
        [t("pendingIn"), m(till.pending_in), Number(till.pending_in) ? "text-sky-700" : undefined],
        [t("cashLimit"), Number(till.cash_limit) ? m(till.cash_limit) : t("noLimit")],
      ]}
    />
  );
}

export function SessionTable({ sessions, currency, onProof }) {
  const { t } = useTranslation("corebank");
  return (
    <MiniTable
      rows={sessions}
      empty={t("noSessions")}
      columns={[
        {
          key: "opened_at",
          label: t("opened"),
          render: (s) => <span className="text-xs">{accountDate(s.opened_at)}</span>,
        },
        {
          key: "closed_at",
          label: t("closed"),
          render: (s) => (
            <span className="text-xs">{s.closed_at ? accountDate(s.closed_at) : "—"}</span>
          ),
        },
        {
          key: "user_name",
          label: t("teller"),
          render: (s) => <span className="text-xs">{sessionOwner(s)}</span>,
        },
        {
          key: "opening_counted",
          label: t("openingCount"),
          align: "right",
          render: (s) => money(s.opening_counted, currency),
        },
        {
          key: "closing_expected",
          label: t("expected"),
          align: "right",
          render: (s) => money(s.closing_expected, currency),
        },
        {
          key: "closing_counted",
          label: t("closingCount"),
          align: "right",
          render: (s) => money(s.closing_counted, currency),
        },
        {
          key: "variance",
          label: t("variance"),
          align: "right",
          render: (s) => <Variance value={s.variance} currency={currency} />,
        },
        {
          key: "denominations",
          label: t("byNote"),
          wrap: true,
          render: (s) => <span className="font-mono text-[11px]">{notesText(s.denominations)}</span>,
        },
        onProof && {
          key: "proof",
          label: "",
          render: (s) => (
            <LinkButton onClick={() => onProof(s.id)}>
              {t("proofSheet")}
            </LinkButton>
          ),
        },
      ].filter(Boolean)}
    />
  );
}

export const Variance = ({ value, currency }) => {
  const n = Number(value);
  if (value == null || value === "") return "—";
  return (
    <b
      className={cn(n < 0 && "text-red-700", n > 0 && "text-amber-700")}
      data-tour="till-variance"
    >
      {money(value, currency)}
    </b>
  );
};

// The session's cash in / out and every movement: DR is cash into the till,
// CR is cash out.
export function Movements({ session, currency }) {
  const { t } = useTranslation("corebank");
  return (
    <div className="grid gap-3" data-tour="till-movements">
      <Facts
        rows={[
          [t("openingCount"), money(session.opening_counted, currency)],
          [t("cashIn"), money(session.cash_in, currency), "text-emerald-700"],
          [t("cashOut"), money(session.cash_out, currency), "text-red-700"],
          session.variance != null && [t("variance"), money(session.variance, currency)],
        ]}
      />
      <MiniTable
        rows={session.movements ?? []}
        rowKey={(m) => m.txn_id ?? m.rrn}
        empty={t("noMovements")}
        columns={[
          {
            key: "at",
            label: t("time"),
            render: (m) => <span className="text-xs">{accountDate(m.at)}</span>,
          },
          {
            key: "txn_type",
            label: t("movement"),
            wrap: true,
            render: (m) => (
              <span className="text-xs leading-tight">
                <b className="block">{t(`move_${m.txn_type}`, { defaultValue: m.txn_type })}</b>
                <span className="text-muted-foreground">{m.description}</span>
              </span>
            ),
          },
          {
            key: "op",
            label: t("inOut"),
            render: (m) => (
              <span
                className={cn(
                  "text-xs font-bold",
                  m.op === "CR" ? "text-red-700" : "text-emerald-700",
                )}
              >
                {t(m.op === "CR" ? "out" : "in")}
              </span>
            ),
          },
          {
            key: "amount",
            label: t("amount"),
            align: "right",
            render: (m) => (
              <b className={cn(m.op === "CR" ? "text-red-700" : "text-emerald-700")}>
                {money(m.amount, currency)}
              </b>
            ),
          },
          {
            key: "rrn",
            label: "RRN",
            render: (m) => <span className="font-mono text-xs">{m.rrn} <CopyButton value={m.rrn} /></span>,
          },
        ]}
      />
    </div>
  );
}

// A session's proof sheet: everything the till did, by type, against the
// opening and closing counts (opening + in − out is what the books expect).
// No session: the till's current one.
export function ProofSheet({ till, sessionId, onClose }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [proof, setProof] = useState(null);
  const body = useMemo(() => ({ id: till.id, ...(sessionId ? { session_id: sessionId } : {}) }), [till.id, sessionId]);
  useEffect(() => {
    tellerApi
      .proof(scope(body))
      .then((r) => setProof(recordOf(r) ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setProof({});
      });
  }, [body, scope]);
  const c = proof?.currency ?? till.currency;
  const session = proof?.session ?? {};
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={t("proofTitle", { code: proof?.till_code ?? till.code })}
      footer={<ExportButtons formats={["XLSX", "CSV"]} exportFile={(format) => tellerProofExport(scope({ ...body, format }))} />}
    >
      {!proof ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-3" data-tour="teller-proof">
          <Facts
            rows={[
              [t("till"), `${proof.till_code ?? till.code} · ${proof.till_name ?? till.name ?? ""}`],
              [t("branch"), proof.branch_name ?? till.branch_name],
              [t("teller"), sessionOwner(session)],
              [t("opened"), accountDate(session.opened_at)],
              [t("closed"), session.closed_at ? accountDate(session.closed_at) : "—"],
              [t("status"), t(`sessionStatus_${session.status}`, { defaultValue: session.status ?? "—" })],
              [t("openingCount"), money(proof.opening_counted, c)],
            ]}
          />
          <MiniTable
            rows={proof.lines ?? []}
            rowKey={(l) => l.txn_type}
            empty={t("noMovements")}
            columns={[
              { key: "name", label: t("movement"), render: (l) => <span className="text-xs font-semibold">{l.name ?? l.txn_type}</span> },
              { key: "count", label: t("count"), align: "right" },
              { key: "cash_in", label: t("cashIn"), align: "right", render: (l) => <span className="tabular-nums text-emerald-700">{money(l.cash_in, c)}</span> },
              { key: "cash_out", label: t("cashOut"), align: "right", render: (l) => <span className="tabular-nums text-red-700">{money(l.cash_out, c)}</span> },
            ]}
          />
          <Facts
            rows={[
              [t("totalIn"), money(proof.total_in, c), "text-emerald-700"],
              [t("totalOut"), money(proof.total_out, c), "text-red-700"],
              [t("expected"), money(proof.expected, c), "font-black"],
              proof.counted != null && [t("closingCount"), money(proof.counted, c), "font-black"],
              proof.variance != null && [t("variance"), <Variance key="v" value={proof.variance} currency={c} />],
              session.denominations && [t("byNote"), notesText(session.denominations)],
            ]}
          />
          {proof.balanced && (
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={14} /> {t("balanced")}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
