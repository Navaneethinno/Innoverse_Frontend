import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, ListChecks, Plus } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { Modal } from "@/Components/Common/Modal";
import { NoAccess } from "@/Components/Common/NoAccess";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { ProductStatus } from "@/Components/InnoCBS/Settings/DepositProducts/productShared";
import { usePagedList } from "@/Hooks/usePagedList";
import { usePagePermission } from "@/Hooks/usePermission";
import { rewardsCampaignApi } from "@/Services/Campaigns/campaigns.api";
import { formatDateTime } from "@/Utils/Lib/dateFormat";
import { notifications } from "@/Utils/Lib/notifications";
import { NarrationDialog } from "./NarrationDialog";
import { firstOf } from "./usePagedList";

export const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";
export const labelClass = "text-xs font-semibold text-slate-700";

export const amount = (v) => String(v).replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
export const whole = (v) => String(v).replace(/\D/g, "").slice(0, 9);

const TABS = [
  ["all", "campaigns:tabAll", ListChecks],
  ["pending", "campaigns:tabPending", Clock3],
];

// The dropdowns of /config/rewards/campaign/options.
export function useRewardOptions() {
  const { scope } = useInstitutionScope();
  const [options, setOptions] = useState({});
  useEffect(() => {
    let cancelled = false;
    rewardsCampaignApi
      .options(scope())
      .then((r) => !cancelled && setOptions(firstOf(r) ?? {}))
      .catch((e) => !cancelled && notifications.error(e.message));
    return () => {
      cancelled = true;
    };
  }, [scope]);
  return options;
}

export const byId = (list) => (list ?? []).map((x) => ({ value: x.id, label: x.code && x.name !== x.code ? `${x.name} (${x.code})` : x.name }));
// Transaction types come from the server as bare codes (AGENT_CASH_IN).
export const byTxnType = (list) => byId(list);
export const byCode = (list) => (list ?? []).map((x) => ({ value: x.code, label: x.name }));
export const labelsOf = (ids, options) => (ids ?? []).map((id) => options.find((o) => String(o.value) === String(id))?.label ?? id);

// A record's setup to show (in force, or the proposal of a new one) and to
// edit (the proposal when one waits).
// Until the first approval `setup` is {} and the proposed values are in `pending`.
export const shownSetup = (r) => (r?.setup && Object.keys(r.setup).length ? r.setup : (r?.pending ?? {}));
export const editedSetup = (r) => r?.pending ?? r?.setup ?? {};

// The row's translated names. process_status 1: nothing waiting.
export const statusProduct = (r) => ({ ...r, pending: null, pending_action: Number(r.process_status) > 1 ? (r.process_status_name ?? "") : "" });

// The `history` of a get: [{ action, payload, narration, actor, at }].
export function RewardHistory({ history }) {
  const { t } = useTranslation(["campaigns", "common"]);
  if (!history?.length) return <EmptyNote>{t("noHistory")}</EmptyNote>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <SimpleTable columns={[t("historyAction"), t("historyActor"), t("historyAt"), t("narration")]}>
        <tbody>
          {history.map((h, i) => (
            <tr key={`${h.at}-${i}`} className="border-t border-border">
              <td className="px-3 py-2 font-semibold">{t(`pending_${h.action}`, { defaultValue: h.action })}</td>
              <td className="px-3 py-2">{h.actor ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2">{h.at ? formatDateTime(h.at) : "—"}</td>
              <td className="px-3 py-2">{h.narration || "—"}</td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>
    </div>
  );
}

// `get` as { record, history }, for a detail dialog.
export function useRewardRecord(api, id, onClose) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get({ id })
      .then((r) => !cancelled && setState(firstOf(r) ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [api, id, onClose]);
  return state;
}

export function RecordDialogFrame({ title, record, history, children, onClose }) {
  const { t } = useTranslation(["campaigns", "common"]);
  return (
    <Modal open size="xl" onClose={onClose} title={title}>
      {!record ? (
        <p className="text-sm text-muted-foreground">{t("common:loading", { defaultValue: "Loading…" })}</p>
      ) : (
        <div className="grid gap-4">
          <ProductStatus product={statusProduct(record)} />
          {children}
          <p className="text-sm font-bold">{t("history")}</p>
          <RewardHistory history={history} />
        </div>
      )}
    </Modal>
  );
}

// A paged maker-checker list of rewards records (Rewards Campaigns,
// Vouchers): All | Waiting, search, and the row's `actions` gated on rights.
export function RewardRecords({ api, title, subtitle, addLabel, searchPlaceholder, emptyTitle, columns, Form, View, nameOf }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setQ(search.trim()), 400);
    return () => window.clearTimeout(id);
  }, [search]);
  const call = useCallback(({ tab: which, ...body }) => (which === "pending" ? api.pending : api.list)(body), [api]);
  const list = usePagedList(call, scope({ tab, ...(q ? { search: q } : {}) }));
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [action, setAction] = useState(null);
  const closeView = useCallback(() => setViewing(null), []);
  if (!can("View")) return <NoAccess />;
  const open = async (row) => {
    try {
      setEditing(firstOf(await api.get({ id: row.id }))?.record ?? row);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const all = [
    ...columns,
    { key: "status", label: t("common:status"), render: (r) => <ProductStatus product={statusProduct(r)} /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => {
        // What the server allows on this row, within this user's rights.
        const a = r.actions ?? {};
        return (
          <RowActions
            buttons={{
              view: true,
              edit: Boolean(a.edit) && can("Edit"),
              delete: Boolean(a.delete) && can("Delete"),
              deactivate: Boolean(a.deactivate) && can("Change Status"),
              activate: Boolean(a.reactivate) && can("Change Status"),
              authorize: Boolean(a.auth) && can("Authorize"),
              deauthorize: Boolean(a.deauth) && can("Authorize"),
            }}
            onView={() => setViewing(r.id)}
            onEdit={() => void open(r)}
            onDelete={() => setAction({ verb: "delete", row: r })}
            onDeactivate={() => setAction({ verb: "deactivate", row: r })}
            onReactivate={() => setAction({ verb: "reactivate", row: r })}
            onAuthorize={() => setAction({ verb: "auth", row: r })}
            onDeauthorize={() => setAction({ verb: "deauth", row: r })}
          />
        );
      },
    },
  ];
  const labels = { auth: t("common:authorize"), deauth: t("common:deauthorize"), delete: t("common:delete"), deactivate: t("common:deactivate"), reactivate: t("common:reactivate") };
  return (
    <div>
      <div className="mb-4">
        <PageTitle>{title}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
        <StatusFilterTabs
          tabs={TABS}
          serverFiltered
          total={list.total}
          rows={list.rows}
          value={tab}
          onChange={setTab}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={searchPlaceholder}
          actions={
            can("Add") && (
              <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
                {addLabel}
              </Button>
            )
          }
          bare
        />
        <DataTable columns={all} rows={list.rows} rowKey={(r) => r.id} isLoading={list.loading} title={title} emptyTitle={emptyTitle} serverPagination={list.pagination} />
      </div>
      {editing && (
        <Form
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
      {viewing && <View id={viewing} onClose={closeView} />}
      {action && (
        <NarrationDialog
          title={`${labels[action.verb]} · ${nameOf(action.row)}`}
          confirmLabel={labels[action.verb]}
          destructive={action.verb !== "auth" && action.verb !== "reactivate"}
          needsNarration={action.verb === "deauth"}
          run={(narration) => api[action.verb]({ id: action.row.id, narration })}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
