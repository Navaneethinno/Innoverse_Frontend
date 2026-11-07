import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { Facts, NarrationDialog } from "@/Components/InnoCBS/Deposits/depositShared";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { boundDeviceApi } from "@/Services/PaysePay/paysePay.api";
import { notifications } from "@/Utils/Lib/notifications";
import { CheckCircle2, Clock, ListChecks, Unlink } from "lucide-react";
import { usePagedList, when } from "./docShared";

const TABS = [
  ["ALL", "paysePay:bd_tab_ALL", ListChecks],
  ["BOUND", "paysePay:bd_tab_BOUND", CheckCircle2],
  ["PENDING", "paysePay:bd_tab_PENDING", Clock],
  ["UNBOUND", "paysePay:bd_tab_UNBOUND", Unlink],
];
// An unbind waiting for a checker (the row's pending_unbind fields).
const unbindPending = (r) => Boolean(r.pending_unbind ?? r.pending_unbind_by ?? r.pending_unbind_at);

// GLOBAL SETTINGS > Bound Devices (menu 225): the customers' bound devices.
// Unbind is proposed by one user and authorised by another (Self at once).
export function BoundDevices() {
  const { t } = useTranslation(["paysePay", "common"]);
  const [status, setStatus] = useState("BOUND");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setQ(search.trim()), 400);
    return () => window.clearTimeout(id);
  }, [search]);
  const list = usePagedList(boundDeviceApi.list, { status, ...(q ? { search: q } : {}) }, { sizeKey: "page_size" });

  const act = async (verb, row, reason) => {
    setBusy(true);
    try {
      const r = await boundDeviceApi[verb](verb === "unbind" ? { id: row.id, reason } : { id: row.id });
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "device_name",
      label: t("bd_device"),
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{r.device_name || r.device_model || "—"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{[r.platform, r.device_model, r.device_id].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    {
      key: "entity",
      label: t("bd_customer"),
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{r.entity_name ?? r.party_name ?? r.login_id ?? "—"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{[r.party, r.entity_type, r.entity_id].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { key: "role", label: t("bd_role"), render: (r) => <span className="text-xs">{t(`bd_role_${r.role}`, { defaultValue: r.role ?? "—" })}</span> },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={unbindPending(r) ? "PENDING" : r.status} label={unbindPending(r) ? t("bd_unbindPending") : t(`bd_tab_${r.status}`, { defaultValue: r.status })} /> },
    { key: "bound_at", label: t("bd_boundAt"), render: (r) => <span className="whitespace-nowrap text-xs">{when(r.bound_at)}</span> },
    { key: "last_seen_at", label: t("bd_lastSeen"), render: (r) => <span className="whitespace-nowrap text-xs">{when(r.last_seen_at)}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <RowActions
          buttons={{
            view: true,
            delete: r.status === "BOUND" && !unbindPending(r),
            authorize: unbindPending(r) && Boolean(r.can_authorize),
            deauthorize: unbindPending(r) && Boolean(r.can_authorize),
          }}
          onView={() => setOpen(r)}
          onDelete={() => setDialog({ verb: "unbind", row: r })}
          onAuthorize={() => setDialog({ verb: "auth", row: r })}
          onDeauthorize={() => setDialog({ verb: "deauth", row: r })}
        />
      ),
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <PageTitle>{t("bd_title")}</PageTitle>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("bd_subtitle")}</p>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <StatusFilterTabs bare tabs={TABS} value={status} onChange={setStatus} rows={list.rows} total={list.total} serverFiltered search={search} onSearch={setSearch} searchPlaceholder={t("bd_searchHint")} />
        <DataTable bare serverSorted rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} columns={columns} title={t("bd_title")} emptyTitle={t("bd_empty")} />
      </div>

      {open && (
        <Modal open onClose={() => setOpen(null)} title={open.device_name || open.device_id} size="lg">
          <Facts
            rows={[
              [t("common:institution"), open.inst_profile_name ?? open.institution],
              [t("bd_customer"), open.entity_name ?? open.party_name],
              [t("bd_party"), [open.party, open.entity_type, open.entity_id].filter(Boolean).join(" · ")],
              [t("bd_login"), open.login_id],
              [t("bd_deviceId"), open.device_id],
              [t("bd_model"), open.device_model],
              [t("bd_platform"), open.platform],
              [t("bd_role"), open.role],
              [t("common:status"), open.status],
              [t("bd_boundAt"), when(open.bound_at)],
              [t("bd_coolingUntil"), when(open.cooling_until)],
              [t("bd_lastSeen"), when(open.last_seen_at)],
              [t("bd_blockedUntil"), when(open.blocked_until)],
              [t("bd_integrity"), open.integrity_verdict],
              unbindPending(open) && [t("bd_unbindBy"), open.pending_unbind_by],
              unbindPending(open) && [t("bd_unbindAt"), when(open.pending_unbind_at)],
              unbindPending(open) && [t("bd_unbindReason"), open.pending_unbind_reason],
            ]}
          />
        </Modal>
      )}

      {dialog && (
        <NarrationDialog
          title={t(`bd_confirm_${dialog.verb}`)}
          hint={t(`bd_confirmHint_${dialog.verb}`)}
          confirmLabel={t(`bd_do_${dialog.verb}`)}
          variant={dialog.verb === "auth" ? "primary" : "danger"}
          required={dialog.verb === "unbind"}
          label={dialog.verb === "unbind" ? t("bd_reason") : undefined}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(reason) => act(dialog.verb, dialog.row, reason)}
        />
      )}
    </div>
  );
}
