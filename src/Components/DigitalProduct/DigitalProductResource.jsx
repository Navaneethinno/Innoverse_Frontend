import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, History, Pencil, Plus, Send, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { digitalProductApi } from "@/Services/DigitalProduct/digitalProduct.api";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { configKycApi } from "@/Services/Config/config.api";

const CONFIGS = {
  product: {
    title: "Product",
    readOnlyOnEdit: ["inst_profile_id"],
    fields: [
      ["inst_profile_id", "Institution profile", "number"],
      ["code", "Code", "text"],
      ["name", "Name", "text"],
      ["description", "Description", "textarea"],
      ["multiple_accounts_allowed", "Multiple accounts allowed", "boolean"],
      ["max_accounts", "Maximum accounts", "number"],
      ["multiple_cards_allowed", "Multiple cards allowed", "boolean"],
      ["max_cards", "Maximum cards", "number"],
    ],
    deactivate: true,
  },
  product_map: {
    title: "Product Map",
    readOnlyOnEdit: ["product_id"],
    fields: [
      ["product_id", "Products", "number"],
      ["acct_product_id", "Account product", "number"],
      ["allowed", "Allowed", "boolean"],
      ["primary_account_product", "Primary account product", "boolean"],
      ["priority", "Priority", "number"],
    ],
  },
  security_config: {
    title: "Security Config",
    readOnlyOnEdit: ["product_id"],
    fields: [
      ["product_id", "Product ID", "number"],
      ["login_pin_inherit", "Login PIN inherit", "boolean"],
      ["login_pin_required", "Login PIN required", "boolean"],
      ["login_pin_length", "Login PIN length", "number"],
      ["login_pin_type", "Login PIN type", "text"],
      ["transaction_pin_inherit", "Transaction PIN inherit", "boolean"],
      ["transaction_pin_required", "Transaction PIN required", "boolean"],
      ["transaction_pin_length", "Transaction PIN length", "number"],
      ["transaction_pin_type", "Transaction PIN type", "text"],
      ["login_transaction_pin_same_inherit", "Same PIN inherit", "boolean"],
      ["login_transaction_pin_same", "Same PIN", "boolean"],
    ],
  },
  kyc_config: {
    title: "KYC Config",
    readOnlyOnEdit: ["product_id"],
    fields: [
      ["product_id", "Product ID", "number"],
      ["kyc_group_id", "KYC group", "number"],
      ["minimum_kyc_level", "Minimum KYC level", "number"],
    ],
  },
  kyc_level: {
    title: "KYC Level",
    readOnlyOnEdit: ["kyc_config_id"],
    fields: [
      ["kyc_config_id", "KYC config ID", "number"],
      ["kyc_level", "KYC level", "number"],
      ["level_name", "Level name", "text"],
    ],
  },
  channel_config: {
    title: "Channel Config",
    readOnlyOnEdit: ["product_id"],
    fields: [
      ["product_id", "Product ID", "number"],
      ["channel_id", "Channel ID", "number"],
      ["enabled", "Enabled", "boolean"],
      ["session_timeout_seconds", "Session timeout seconds", "number"],
      ["user_activity_timeout_seconds", "User activity timeout seconds", "number"],
    ],
  },
  channel_transaction: {
    title: "Channel Transaction",
    readOnlyOnEdit: ["channel_config_id"],
    fields: [
      ["channel_config_id", "Channel config ID", "number"],
      ["transaction_type_id", "Transaction type ID", "number"],
      ["allowed", "Allowed", "boolean"],
      ["authentication_required", "Authentication required", "boolean"],
      ["transaction_pin_required", "Transaction PIN required", "boolean"],
    ],
  },
  eligibility_config: {
    title: "Eligibility Config",
    readOnlyOnEdit: ["product_id"],
    fields: [
      ["product_id", "Product ID", "number"],
      ["age_restriction_inherit", "Age restriction inherit", "boolean"],
      ["minimum_age", "Minimum age", "number"],
      ["maximum_age", "Maximum age", "number"],
      ["residency_restriction_inherit", "Residency restriction inherit", "boolean"],
    ],
  },
  residency: {
    title: "Residency",
    readOnlyOnEdit: ["eligibility_config_id"],
    fields: [
      ["eligibility_config_id", "Eligibility config ID", "number"],
      ["residency_type_id", "Residency type ID", "number"],
      ["allowed", "Allowed", "boolean"],
    ],
  },
};
const idOf = (r) => r?.id;
const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
const allowed = (menus, action, title) =>
  (menus ?? []).some(
    (m) =>
      new RegExp(title, "i").test(String(m?.menu_name)) &&
      (m.actions ?? []).some(
        (a) => String(a?.action_name ?? a?.name).toLowerCase() === action.toLowerCase(),
      ),
  );
function Editor({ open, config, value, setValue, editing, saving, onClose, onSave, institutions, products, accountProducts, kycGroups }) {
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`${editing ? "Edit" : "Add"} ${config.title}`}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-2 text-sm font-bold text-slate-500">
            Cancel
          </button>
          <button
            type="submit"
            form="digital-product-form"
            data-mode="draft"
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            Save as draft
          </button>
          <button
            type="submit"
            form="digital-product-form"
            data-mode="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            {editing ? "Save changes" : `Add ${config.title}`}
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
        {config.fields.map(([key, label, type]) => (
          <label key={key} className="text-sm font-semibold text-slate-700">
            {label}
            {key === "kyc_group_id" ? (
              <FilterSelect
                className="mt-1.5"
                value={value[key] ?? ""}
                onChange={(next) => setValue({ ...value, [key]: next })}
                options={[
                  { value: "", label: "Select KYC group" },
                  ...kycGroups.map((group) => ({
                    value: group.id,
                    label: group.name ?? group.code ?? String(group.id),
                  })),
                ]}
              />
            ) : key === "acct_product_id" ? (
              <FilterSelect
                className="mt-1.5"
                value={value[key] ?? ""}
                onChange={(next) => setValue({ ...value, [key]: next })}
                options={[
                  { value: "", label: "Select account product" },
                  ...accountProducts.map((product) => ({
                    value: product.id,
                    label: product.name ?? product.code ?? String(product.id),
                  })),
                ]}
              />
            ) : key === "product_id" ? (
              <FilterSelect
                className="mt-1.5"
                value={value[key] ?? ""}
                onChange={(next) => setValue({ ...value, [key]: next })}
                options={[
                  { value: "", label: "Select product" },
                  ...products.map((product) => ({
                    value: product.id,
                    label: product.name ?? product.code ?? String(product.id),
                  })),
                ]}
              />
            ) : key === "inst_profile_id" ? (
              <FilterSelect
                className="mt-1.5"
                value={value[key] ?? ""}
                onChange={(next) => setValue({ ...value, [key]: next })}
                options={[
                  { value: "", label: "Select institution profile" },
                  ...institutions.map((institution) => ({
                    value: institution.id,
                    label: institution.name ?? String(institution.id),
                  })),
                ]}
              />
            ) : type === "textarea" ? (
              <textarea
                value={value[key] ?? ""}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
                className="mt-1.5 min-h-24 w-full rounded-xl border p-3"
              />
            ) : type === "boolean" ? (
              <input
                type="checkbox"
                checked={Boolean(value[key])}
                onChange={(e) => setValue({ ...value, [key]: e.target.checked })}
                className="ml-3"
              />
            ) : (
              <input
                required={key.endsWith("_id") || ["code", "name"].includes(key)}
                type={type}
                value={value[key] ?? ""}
                onChange={(e) =>
                  setValue({
                    ...value,
                    [key]: type === "number" ? Number(e.target.value) : e.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5"
              />
            )}
          </label>
        ))}
      </form>
    </Modal>
  );
}
export function DigitalProductResource({ entity }) {
  const config = CONFIGS[entity];
  const menus = useSelector((s) => s.menu.menuArray);
  const api = useMemo(() => digitalProductApi(entity), [entity]);
  const { data: institutions = [] } = useActiveInstitutionsQuery();
  const [products, setProducts] = useState([]);
  const [accountProducts, setAccountProducts] = useState([]);
  const [kycGroups, setKycGroups] = useState([]);
  useEffect(() => {
    if (entity !== "product_map") return;
    digitalProductApi("product")
      .getActive({ view: "dropdown" })
      .then((response) => setProducts(rowsOf(response)))
      .catch((error) => notifications.error(error.message));
  }, [entity]);
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
    [saving, setSaving] = useState(false);
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
  useLiveChannel(`/digital_product/${entity}/list`, () => void load());
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
      const label = missingField[1].toLowerCase();
      notifications.error(`Please select ${/^[aeiou]/.test(label) ? "an" : "a"} ${label}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(
          config.fields
            .filter(([key]) => !editing || !config.readOnlyOnEdit?.includes(key))
            .map(([key]) => [key, form[key]]),
        ),
        is_draft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const r = await (editing ? api.edit(payload) : api.add(payload));
      notifications.success(apiMessage(r, `${config.title} saved`));
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
      const r =
        action.type === "submit"
          ? await api.submit({ id, narration: "Submitted for review" })
          : action.type === "auth"
            ? await api.auth({ id })
            : action.type === "deauth"
              ? await api.deauth({ id, description: action.reason || "UNDEFINED" })
              : action.type === "delete"
                ? await api.delete({ id })
                : await api.deleteAuth({ id });
      notifications.success(apiMessage(r, `${config.title} action completed`));
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
        label,
        render: (r) => (type === "boolean" ? (r[key] ? "Yes" : "No") : String(r[key] ?? "—")),
      })),
    {
      key: "status",
      label: "Status",
      render: (r) =>
        r.status_name != null || r.status != null ? (
          <StatusBadge status={String(r.status_name ?? (r.status === 1 ? "ACTIVE" : "INACTIVE"))} />
        ) : (
          "—"
        ),
    },
    {
      key: "process_status_name",
      label: "Process Status",
      render: (r) =>
        r.process_status_name ? (
          <StatusBadge status={String(r.process_status_name)} variant="subtle" />
        ) : (
          "—"
        ),
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      render: (r) =>
        r.auth_status ? <StatusBadge status={String(r.auth_status)} variant="subtle" /> : "—",
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => {
        // Same button flow as InstitutionProfile/MasterConfig everywhere else:
        // Edit/Delete show whenever the permission is granted, regardless of
        // status; Authorize/Deauthorize show only while pending AND it isn't
        // a pending-delete (that goes through the dedicated Delete Auth
        // endpoint instead, since /auth never covers delete per the API docs).
        const visibility = getMakerCheckerButtons(r, {
          canAdd: allowed(menus, "Add", config.title),
          canEdit: allowed(menus, "Edit", config.title),
          canAuthorize: allowed(menus, "Authorize", config.title),
          canDelete: allowed(menus, "Delete", config.title),
        });
        const acts = [
          ...(visibility.submitDraft ? [["submit", "Submit", Send]] : []),
          ...(visibility.authorize
            ? [[visibility.isPendingDelete ? "deleteAuth" : "auth", "Authorize", ShieldCheck]]
            : []),
          ...(visibility.deauthorize ? [["deauth", "Deauthorize", ShieldOff]] : []),
          ...(visibility.delete ? [["delete", "Delete", Trash2]] : []),
        ];
        return (
          <div className="flex flex-wrap justify-center gap-1">
            <UiTooltip label="View">
              <button
                type="button"
                onClick={() => setView(r)}
                className={actionButtonClass("view")}
              >
                <Eye size={14} />
              </button>
            </UiTooltip>
            {visibility.edit && (
              <UiTooltip label="Edit">
                <button
                  type="button"
                  onClick={() => {
                    setForm(Object.fromEntries(config.fields.map(([k]) => [k, r[k] ?? ""])));
                    setEditing(r);
                    setOpen(true);
                  }}
                  className={actionButtonClass("edit")}
                >
                  <Pencil size={14} />
                </button>
              </UiTooltip>
            )}
            <UiTooltip label="Audit">
              <button
                type="button"
                onClick={() => setAudit(r)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <History size={14} />
              </button>
            </UiTooltip>
            {acts.map(([type, label, Icon]) => (
              <UiTooltip key={type} label={label}>
                <button
                  type="button"
                  onClick={() => setAction({ type, row: r, label, reason: "" })}
                  className={actionButtonClass(type)}
                >
                  <Icon size={14} />
                </button>
              </UiTooltip>
            ))}
          </div>
        );
      },
    },
  ];
  return (
    <div className="pt-3 pb-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500">
            Digital Product
          </p>
          <h1 className="text-xl font-black text-slate-800">{config.title}</h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage {config.title.toLowerCase()} configuration.
          </p>
        </div>
        {allowed(menus, "Add", config.title) && (
          <button
            onClick={() => {
              setForm(
                Object.fromEntries(
                  config.fields.map(([k, , type]) => [k, type === "boolean" ? false : ""]),
                ),
              );
              setEditing(null);
              setOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            <Plus size={14} /> Add {config.title}
          </button>
        )}
      </div>
      <StatusFilterTabs
        rows={rows}
        value={tab}
        onChange={setTab}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
      />
      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={idOf}
          isLoading={loading}
          title={config.title}
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
        />
      </div>
      <Editor
        open={open}
        config={config}
        value={form}
        setValue={setForm}
        editing={editing}
        saving={saving}
        institutions={institutions}
        products={products}
        accountProducts={accountProducts}
        kycGroups={kycGroups}
        onSave={save}
        onClose={() => setOpen(false)}
      />
      {view && (
        <Modal open title={`View ${config.title}`} onClose={() => setView(null)}>
          <dl className="grid gap-3">
            {config.fields.map(([key, label]) => (
              <div key={key} className="rounded-xl border p-3">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-sm font-semibold">{String(view[key] ?? "-")}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={config.title}
          onClose={() => setAudit(null)}
          fields={config.fields.map(([key, label]) => [key, label])}
          fetchAudit={(p, limit) =>
            api.audit({ id: idOf(audit), page: p, limit }).then(mapAuditResponse)
          }
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${action.label} ${config.title}`}
          description={String(action.row.name ?? idOf(action.row))}
          confirmLabel={action.label}
          destructive={["deauth", "delete", "deleteAuth"].includes(action.type)}
          confirmDisabled={action.type === "deauth" && !action.reason?.trim()}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {action.type === "deauth" && (
            <textarea
              className="mt-3 min-h-20 w-full rounded-xl border p-3"
              value={action.reason}
              onChange={(e) => setAction({ ...action, reason: e.target.value })}
              placeholder="Rejection reason"
            />
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
