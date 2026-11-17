import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { SearchBox } from "@/Components/Common/SearchBox";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { miniApi } from "@/Services/Merchant/mms.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog } from "../../InnoCBS/Deposits/depositShared";
import { MmsStatus } from "../mmsShared";

// MMS › Agents › Paga-Daki Mini (Admin_36 §2): customers who registered on
// USSD or the app to take payments as a small business. Approve (opens the
// Mini wallet, makes the code, sends the SMS) or reject a PENDING one;
// suspend an APPROVED one, reactivate a SUSPENDED one. The Agents menu's
// rights: Authorise approves and rejects, Change Status suspends and
// reactivates. The server decides what a status allows
// (workflow.invalid_status); the buttons follow the record's status.
const STATUSES = ["all", "PENDING", "APPROVED", "REJECTED", "SUSPENDED", "CANCELLED"];

// The list reply: the records in data, pagination beside it.
const listOf = (r) => {
  const rows = Array.isArray(r?.data) ? r.data : (r?.data?.items ?? []);
  const p = r?.pagination ?? {};
  const total = Number(p.total_records ?? p.totalRecords ?? p.total ?? rows.length) || 0;
  return { rows, total };
};
const one = (r) => (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? null;
const when = (s) => (s ? new Date(s).toLocaleString() : null);
const money = (v, cur) => (v == null || v === "" ? null : `${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ` ${cur}` : ""}`);

export function MiniRegistrations() {
  const { t } = useTranslation(["mms", "common"]);
  // A service provider sees every institution's registrations.
  const canChoose = useCanChooseInstitution();
  const [status, setStatus] = useState("PENDING");
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [typed]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(listOf(await miniApi.list({ ...(status !== "all" ? { status } : {}), ...(search ? { search } : {}), page, limit })));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [status, search, page, limit]);
  useEffect(() => {
    load();
  }, [load]);
  useLiveChannel(miniApi.listPath, () => load());

  const decision = useMiniDecision(() => {
    load();
    setViewing(null);
  });

  const columns = [
    {
      key: "business_name",
      label: t("miniBusiness"),
      align: "left",
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{r.business_name}</p>
          <p className="text-[10px] text-muted-foreground">{r.business_type_label ?? r.business_type}</p>
        </div>
      ),
    },
    {
      key: "customer_name",
      label: t("miniCustomer"),
      align: "left",
      render: (r) => (
        <div>
          <p className="text-xs">{r.customer_name || "—"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{r.phone_number}</p>
        </div>
      ),
    },
    ...(canChoose ? [{ key: "inst_profile_name", label: t("common:institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> }] : []),
    { key: "code", label: t("miniCode"), render: (r) => <span className="font-mono text-xs">{r.code || "—"}</span> },
    { key: "channel", label: t("miniChannel"), render: (r) => <span className="text-xs">{r.channel ?? "—"}</span> },
    { key: "created_at", label: t("miniRegistered"), render: (r) => <span className="whitespace-nowrap text-xs">{when(r.created_at) ?? "—"}</span> },
    { key: "status", label: t("common:status"), render: (r) => <MmsStatus value={r.status} /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} />,
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold", status === s ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {s === "all" ? t("agentsTab_all") : t(`status_${s}`, { defaultValue: s })}
            </button>
          ))}
        </div>
        <SearchBox className="min-w-56 flex-1" search={typed} onSearch={setTyped} placeholder={t("miniSearch")} />
      </div>
      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("agentsTab_mini")}
        emptyTitle={t("miniEmpty")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          totalRecords: result.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
      {viewing && <MiniDetail id={viewing.id} first={viewing} decision={decision} onClose={() => setViewing(null)} />}
      {decision.dialogs}
    </>
  );
}

// One registration: the customer, the business, the monthly amount and NUIT;
// once approved its code and Mini wallet; the decision so far. Its buttons
// follow its status.
function MiniDetail({ id, first, decision, onClose }) {
  const { t } = useTranslation(["mms", "common"]);
  const [r, setR] = useState(first);
  useEffect(() => {
    let gone = false;
    miniApi
      .get({ id })
      .then((res) => !gone && one(res) && setR(one(res)))
      .catch((e) => notifications.error(e.message));
    return () => {
      gone = true;
    };
  }, [id]);
  return (
    <Modal open onClose={onClose} size="lg" title={r.business_name} footer={<ActionButtons busy={decision.busy} buttons={decision.buttons(r)} />}>
      <div className="mb-3 flex items-center gap-2">
        <MmsStatus value={r.status} />
        <span className="text-xs text-muted-foreground">{r.channel}</span>
      </div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("miniCustomer")}</p>
      <Facts className="mb-4" rows={[[t("name"), r.customer_name || "—"], [t("miniPhone"), r.phone_number], [t("miniNuit"), r.nuit || "—"], [t("miniTerms"), when(r.terms_accepted_at)]]} />
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("miniBusiness")}</p>
      <Facts className="mb-4" rows={[[t("name"), r.business_name], [t("miniType"), r.business_type_label ?? r.business_type], [t("miniMonthly"), money(r.monthly_amount, r.currency_code)], [t("miniRegistered"), when(r.created_at)]]} />
      {(r.code || r.acct_num) && (
        <>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("miniWallet")}</p>
          <Facts className="mb-4" rows={[[t("miniCode"), r.code], [t("miniAccount"), r.acct_num], [t("miniBalance"), money(r.avail_bal, r.currency_code)]]} />
        </>
      )}
      {r.decided_at && (
        <>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("miniDecision")}</p>
          <Facts rows={[[t("miniDecidedBy"), r.decided_by], [t("miniDecidedAt"), when(r.decided_at)], [t("miniNote"), r.decision_note || "—"]]} />
        </>
      )}
    </Modal>
  );
}

// Approve / reject a PENDING registration (Authorise), suspend an APPROVED
// one or reactivate a SUSPENDED one (Change Status). Reject and suspend need
// a reason: the customer is told it.
const KINDS = {
  approve: { from: "PENDING", right: "Authorise", icon: CheckCircle2, variant: "primary", required: false },
  reject: { from: "PENDING", right: "Authorise", icon: XCircle, variant: "danger", required: true },
  suspend: { from: "APPROVED", right: "Change Status", icon: PauseCircle, variant: "danger", required: true },
  reactivate: { from: "SUSPENDED", right: "Change Status", icon: PlayCircle, variant: "primary", required: false },
};

function useMiniDecision(onDone) {
  const { t } = useTranslation("mms");
  const can = usePagePermission();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (narration) => {
    setBusy(true);
    try {
      const response = await miniApi[dialog.kind]({ id: dialog.r.id, narration });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      onDone();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const buttons = (r) =>
    Object.entries(KINDS)
      .filter(([, k]) => k.from === r.status && can(k.right))
      .map(([kind, k]) => ({ key: kind, label: t(`mini_${kind}`), icon: k.icon, variant: k.variant, run: () => setDialog({ kind, r }) }));
  const k = dialog && KINDS[dialog.kind];
  const dialogs = dialog && (
    <NarrationDialog
      title={t(`mini_${dialog.kind}Title`, { name: dialog.r.business_name })}
      hint={t(`mini_${dialog.kind}Hint`)}
      label={k.required ? t("miniReasonTold") : undefined}
      required={k.required}
      variant={k.variant}
      confirmLabel={t(`mini_${dialog.kind}`)}
      busy={busy}
      onClose={() => setDialog(null)}
      onSave={save}
    />
  );
  return { buttons, dialogs, busy };
}
