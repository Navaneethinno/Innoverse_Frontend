import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { useSelector } from "react-redux";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { describeConfirmAction } from "@/Components/MakerChecker/confirmActionText";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { reconcileSetter } from "@/Utils/Lib/liveReconcile";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { configKycApi } from "@/Services/Config/config.api";
import { matchesAction } from "@/Utils/Lib/actionAliases";
import { useChannels } from "@/Hooks/Master/masterHooks";
import { useTransactions } from "@/Hooks/Master/masterHooks";
import { useResidencyTypes } from "@/Hooks/Master/masterHooks";
import { AddDigitalProductWizard } from "./AddDigitalProductWizard";
import { EditDigitalProductWizard } from "./EditDigitalProductWizard";
import { ViewDigitalProductWizard } from "./ViewDigitalProductWizard";
import { CONFIGS, DigitalProductFieldInput } from "./digitalProductFields";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

const idOf = (r) => r?.id;
const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
// Same key -> lookup-list mapping DigitalProductFieldInput uses for its
// dropdown options, reused here to resolve a row's raw lookup id (e.g.
// product_id, kyc_group_id) to a readable name — for the table columns and
// for the Authorize/Deauth/Delete confirm dialog, which previously showed
// the row's raw numeric id instead (confirmed live: none of these
// sub-entities' rows carry a companion "<field>_name", unlike KYC config's
// rows, so the resolution has to go through these already-fetched lists).
const LOOKUP_LIST_BY_KEY = {
  inst_profile_id: "institutions",
  acct_product_id: "accountProducts",
  kyc_group_id: "kycGroups",
  channel_id: "channels",
  transaction_type_id: "transactions",
  residency_type_id: "residencyTypes",
};
function resolveLookupLabel(key, value, lookups) {
  if (value == null || value === "") return "-";
  const listKey = LOOKUP_LIST_BY_KEY[key];
  if (!listKey) return String(value);
  const list = lookups[listKey] ?? [];
  const match = list.find((item) => String(item.id) === String(value));
  return match ? (match.name ?? match.code ?? String(value)) : String(value);
}
const allowed = (menus, action, title) =>
  (menus ?? []).some(
    (m) =>
      new RegExp(title, "i").test(String(m?.menu_name)) &&
      (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)),
  );
function Editor({ open, config, value, setValue, editing, saving, onClose, onSave, institutions, accountProducts, kycGroups, channels, transactions, residencyTypes, tr }) {
  if (!open) return null;
  const lookups = { institutions, accountProducts, kycGroups, channels, transactions, residencyTypes };
  return (
    <Modal
      open
      onClose={onClose}
      title={`${editing ? tr("Edit") : tr("Add")} ${tr(config.title)}`}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            {tr("Cancel")}
          </button>
          <button
            type="submit"
            form="digital-product-form"
            data-mode="draft"
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            {tr("Save as draft")}
          </button>
          <button
            type="submit"
            form="digital-product-form"
            data-mode="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            {editing ? tr("Save changes") : `${tr("Add")} ${tr(config.title)}`}
          </button>
        </>
      }
    >
      <form
        id="digital-product-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(e.nativeEvent.submitter?.dataset?.mode === "draft");
        }}
        className="grid gap-4"
      >
        {config.fields.map(([key, label, type]) =>
          type === "boolean" ? (
            <CheckboxPill
              key={key}
              checked={Boolean(value[key])}
              onChange={(next) => setValue({ ...value, [key]: next })}
              label={tr(label)}
            />
          ) : (
            <label key={key} className="text-sm font-semibold text-slate-700">
              {tr(label)}
              <DigitalProductFieldInput
                fieldKey={key}
                type={type}
                value={value[key]}
                onChange={(next) => setValue({ ...value, [key]: next })}
                lookups={lookups}
              />
            </label>
          ),
        )}
      </form>
    </Modal>
  );
}
export function DigitalProductResource({ entity }) {
  const config = CONFIGS[entity];
  const tr = useConfigLabel();
  const menus = useSelector((s) => s.menu.menuArray);
  const api = useMemo(() => digitalProductApi(entity), [entity]);
  const { data: institutions = [], error: institutionsError } = useActiveInstitutionsQuery();
  const [accountProducts, setAccountProducts] = useState([]);
  const [kycGroups, setKycGroups] = useState([]);
  const { channels = [], error: channelsError } = useChannels(entity === "channel_config");
  const { transactions = [], error: transactionsError } = useTransactions(entity === "channel_transaction");
  const { residencyTypes = [], error: residencyTypesError } = useResidencyTypes(entity === "residency");
  // These four dropdown sources use hooks whose error state was previously
  // never read here — a failed fetch (session hiccup, transient network
  // error, a permission change) left the dropdown silently empty with zero
  // feedback, indistinguishable from "the option list is genuinely empty".
  // Every other dropdown source in this file already surfaces its fetch
  // error via notifications.error in its own .catch; this brings these four
  // in line with that instead of swallowing the error.
  useEffect(() => {
    if (institutionsError) notifications.error(institutionsError.message);
  }, [institutionsError]);
  useEffect(() => {
    if (channelsError) notifications.error(channelsError.message);
  }, [channelsError]);
  useEffect(() => {
    if (transactionsError) notifications.error(transactionsError.message);
  }, [transactionsError]);
  useEffect(() => {
    if (residencyTypesError) notifications.error(residencyTypesError.message);
  }, [residencyTypesError]);
  useEffect(() => {
    if (entity !== "kyc_config") return;
    configKycApi("kyc_group")
      .getActive({ view: "dropdown" })
      .then((response) => setKycGroups(rowsOf(response)))
      .catch((error) => notifications.error(error.message));
  }, [entity]);
  useEffect(() => {
    if (entity !== "product_map") return;
    configKycApi("acct_product")
      .getActive({ view: "dropdown" })
      .then((response) => setAccountProducts(rowsOf(response)))
      .catch((error) => notifications.error(error.message));
  }, [entity]);
  const lookups = useMemo(
    () => ({ institutions, accountProducts, kycGroups, channels, transactions, residencyTypes }),
    [institutions, accountProducts, kycGroups, channels, transactions, residencyTypes],
  );
  // Human-readable identity for a row in confirm dialogs — same idea as
  // Institution's own confirm dialogs, which show the institution's name
  // instead of its raw id. Uses the entity's own first configured field,
  // resolved through the same lookup lists the table columns use.
  const describeActionRow = (row) => {
    if (!row) return "";
    if (row.name) return row.name;
    const [firstKey, , firstType] = config.fields[0];
    const resolved =
      firstType === "boolean" ? (row[firstKey] ? tr("Yes") : tr("No")) : resolveLookupLabel(firstKey, row[firstKey], lookups);
    return resolved && resolved !== "-" ? resolved : String(idOf(row));
  };
  const [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({}),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("all"),
    [form, setForm] = useState({}),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [view, setView] = useState(null),
    [audit, setAudit] = useState(null),
    [action, setAction] = useState(null),
    [saving, setSaving] = useState(false),
    [wizardOpen, setWizardOpen] = useState(false),
    [editWizardProduct, setEditWizardProduct] = useState(null),
    [viewWizardProduct, setViewWizardProduct] = useState(null);
  // Shows the maker's proposed changes inside the Authorize/Reject confirm
  // dialog, same pattern as InstitutionBrandingPage.jsx — fetched only
  // while that dialog is actually open, via the entity's own /pending
  // endpoint (payload {id}).
  const pendingInfo = usePendingChanges(
    api.pending,
    action ? idOf(action.row) : null,
    Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type),
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.list({ page, limit });
      setRows(rowsOf(r));
      setPagination(r?.pagination ?? r?.data?.pagination ?? {});
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  // Reconcile in place instead of refetching (Live Updates guide §3) — see
  // AcctConfigResource.jsx's identical comment for why inserts are skipped
  // on this server-paginated list.
  useLiveChannel(
    `/digital_product/${entity}/list`,
    reconcileSetter(setRows, { insertNew: false }),
  );
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (tab === "all" || statusBucket(r) === tab) &&
          JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, tab, search],
  );
  const save = async (is_draft) => {
    // "_id" fields rendered as a plain <input required> get real HTML5
    // required-field validation for free from the <form>. The ones rendered
    // as FilterSelect (product_id, inst_profile_id, kyc_group_id,
    // acct_product_id) are a custom component with no underlying native
    // control, so that validation never applied to them — a user could
    // submit with one still empty ("") and the backend would reject the
    // resulting number field with a misleading "request body is not valid
    // JSON" 400, instead of a clear "select an institution" message. Catch
    // it here before it ever reaches the API.
    const missingField = config.fields.find(
      ([key]) => key.endsWith("_id") && (form[key] === "" || form[key] == null),
    );
    if (missingField) {
      const label = tr(missingField[1]).toLowerCase();
      notifications.error(`Please select ${/^[aeiou]/.test(label) ? "an" : "a"} ${label}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(
          config.fields
            .filter(([key]) => !editing || !config.readOnlyOnEdit?.includes(key))
            .map(([key]) => [key, form[key] === "" ? null : form[key]]),
        ),
        is_draft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const r = await (editing ? api.edit(payload) : api.add(payload));
      notifications.success(apiMessage(r, `${tr(config.title)} saved`));
      setOpen(false);
      setEditing(null);
      setForm({});
      void load();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const run = async () => {
    try {
      const id = idOf(action.row);
      // Every action in this lifecycle takes {id, narration} per the API
      // reference — narration was previously only sent for deauth (and
      // hardcoded for submit), silently dropping it everywhere else.
      const narration = action.reason || "";
      const payload = { id, narration };
      const r =
        action.type === "submit"
          ? await api.submit(payload)
          : action.type === "auth"
            ? await api.auth(payload)
            : action.type === "deauth"
              ? await api.deauth(payload)
              : action.type === "delete"
                ? await api.delete(payload)
                : action.type === "deactivate"
                  ? await api.deactivate(payload)
                  : action.type === "reactivate"
                    ? await api.reactivate(payload)
                    : await api.deleteAuth(payload);
      notifications.success(apiMessage(r, `${tr(config.title)} action completed`));
      setAction(null);
      void load();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const columns = [
    ...config.fields
      .slice(0, 3)
      .map(([key, label, type]) => ({
        key,
        label: tr(label),
        render: (r) => (type === "boolean" ? (r[key] ? tr("Yes") : tr("No")) : resolveLookupLabel(key, r[key], lookups)),
      })),
    {
      key: "status",
      label: tr("Status"),
      render: (r) =>
        r.status_name != null || r.status != null ? (
          <StatusBadge status={String(r.status_name ?? (r.status === 1 ? "ACTIVE" : "INACTIVE"))} />
        ) : (
          "—"
        ),
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      render: (r) =>
        r.process_status_name ? (
          <StatusBadge status={String(r.process_status_name)} />
        ) : (
          "—"
        ),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      render: (r) =>
        r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "—",
    },
    {
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (r) => {
        // Same button flow as InstitutionProfile/MasterConfig everywhere else:
        // Edit/Delete show whenever the permission is granted, regardless of
        // status; Authorize/Deauthorize show only while pending AND it isn't
        // a pending-delete (that goes through the dedicated Delete Auth
        // endpoint instead, since /auth never covers delete per the API docs).
        const visibility = getMakerCheckerButtons(r, {
          canAdd: allowed(menus, "Add", config.menuName ?? config.title),
          canEdit: allowed(menus, "Edit", config.menuName ?? config.title),
          canAuthorize: allowed(menus, "Authorize", config.menuName ?? config.title),
          canDelete: allowed(menus, "Delete", config.menuName ?? config.title),
          canChangeStatus:
            allowed(menus, "Deactivate", config.menuName ?? config.title) ||
            allowed(menus, "Reactivate", config.menuName ?? config.title),
        });
        const pendingType = visibility.isPendingDelete ? "deleteAuth" : "auth";
        return (
          <RowActions
            buttons={visibility}
            onView={() => {
              // Digital Product's own View opens the read-only 9-step
              // ViewDigitalProductWizard instead of a plain single-entity
              // view modal — see viewWizardProduct below. Every other
              // entity keeps the original single view modal, unchanged.
              if (entity === "product") {
                setViewWizardProduct(r);
                return;
              }
              setView(r);
            }}
            onEdit={() => {
              // Digital Product's own Edit opens the 9-step
              // EditDigitalProductWizard instead of a single-entity Editor
              // — see wizardOpen above for the matching Add case. Every
              // other entity (reached only via its own still-existing
              // route) keeps the original single Editor modal + individual
              // API, unchanged.
              if (entity === "product") {
                setEditWizardProduct(r);
                return;
              }
              setForm(Object.fromEntries(config.fields.map(([k]) => [k, r[k] ?? ""])));
              setEditing(r);
              setOpen(true);
            }}
            onAudit={() => setAudit(r)}
            onSubmit={() => setAction({ type: "submit", row: r, label: "Submit", reason: "" })}
            onAuthorize={() => setAction({ type: pendingType, row: r, label: "Authorize", reason: "" })}
            onDeauthorize={() => setAction({ type: "deauth", row: r, label: "Deauthorize", reason: "" })}
            onDeactivate={() => setAction({ type: "deactivate", row: r, label: "Deactivate", reason: "" })}
            onReactivate={() => setAction({ type: "reactivate", row: r, label: "Reactivate", reason: "" })}
            onDelete={() => setAction({ type: "delete", row: r, label: "Delete", reason: "" })}
          />
        );
      },
    },
  ];
  // Digital Product's own "+ Add Digital Product" launches the 9-step
  // AddDigitalProductWizard instead of this file's own single-entity Editor
  // — see AddDigitalProductWizard.jsx. Every other entity (reached only via
  // its own still-existing route, since the sidebar no longer links to it
  // directly) keeps the original single Editor modal + individual API,
  // completely unchanged.
  const addAction = allowed(menus, "Add", config.menuName ?? config.title) ? (
    <button
      onClick={() => {
        if (entity === "product") {
          setWizardOpen(true);
          return;
        }
        setForm(Object.fromEntries(config.fields.map(([k, , type]) => [k, type === "boolean" ? false : ""])));
        setEditing(null);
        setOpen(true);
      }}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
    >
      <Plus size={14} /> {tr("Add")} {tr(config.title)}
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">{tr(config.title)}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {tr("Manage")} {tr(config.title).toLowerCase()} {tr("configuration")}.
          </p>
        </div>
      </div>
      <div className="mb-4 overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs
        rows={rows}
        value={tab}
        onChange={setTab}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={`${tr("Search")} ${tr(config.title).toLowerCase()}...`}
        actions={addAction}
      bare /><DataTable
          columns={columns}
          rows={visible}
          rowKey={idOf}
          isLoading={loading}
          title={tr(config.title)}
          serverPagination={{
            page,
            totalPages: pagination.totalPages ?? 1,
            totalRecords: pagination.totalRecords ?? rows.length,
            onPageChange: setPage,
            limit,
            onLimitChange: (next) => {
              setLimit(next);
              setPage(1);
            },
          }}
        bare
        compact
      /></div>
      {entity === "product" && wizardOpen && (
        <AddDigitalProductWizard
          onClose={() => setWizardOpen(false)}
          onSuccess={() => {
            setWizardOpen(false);
            void load();
          }}
        />
      )}
      {entity === "product" && editWizardProduct && (
        <EditDigitalProductWizard
          product={editWizardProduct}
          onClose={() => setEditWizardProduct(null)}
          onSaved={() => void load()}
        />
      )}
      {entity === "product" && viewWizardProduct && (
        <ViewDigitalProductWizard product={viewWizardProduct} onClose={() => setViewWizardProduct(null)} />
      )}
      <Editor
        open={open}
        config={config}
        value={form}
        setValue={setForm}
        editing={editing}
        saving={saving}
        institutions={institutions}
        accountProducts={accountProducts}
        kycGroups={kycGroups}
        channels={channels}
        transactions={transactions}
        residencyTypes={residencyTypes}
        onSave={save}
        onClose={() => setOpen(false)}
        tr={tr}
      />
      {view && (
        <Modal open title={`${tr("View")} ${tr(config.title)}`} onClose={() => setView(null)}>
          <dl className="grid gap-3">
            {config.fields.map(([key, label]) => (
              <div key={key} className="rounded-xl border p-3">
                <dt className="text-xs text-slate-400">{tr(label)}</dt>
                <dd className="text-sm font-semibold">{String(view[key] ?? "-")}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={tr(config.title)}
          onClose={() => setAudit(null)}
          fields={config.fields.map(([key, label]) => [key, tr(label)])}
          fetchAudit={(p, limit) =>
            api.audit({ id: idOf(audit), page: p, limit }).then(mapAuditResponse)
          }
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${tr(action.label)} ${tr(config.title)}`}
          description={describeConfirmAction(action.type, describeActionRow(action.row), tr)}
          confirmLabel={tr(action.label)}
          destructive={["deauth", "delete", "deleteAuth"].includes(action.type)}
          confirmDisabled={action.type === "deauth" && !action.reason?.trim()}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          <textarea
            className="mt-3 min-h-20 w-full rounded-xl border p-3"
            value={action.reason ?? ""}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder={tr("Narration")}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
