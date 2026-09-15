import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, History, Pencil, Plus, Send, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { configKycApi } from "@/Services/Config/config.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import {
  useAcctDormancyActions,
  useAcctOperationModes,
  useAcctProdTypes,
  useAcctSequenceTypes,
  useChannels,
  useCurrencies,
  useOwnershipTypes,
  usePartyTypes,
  useTransactions,
} from "@/Hooks/Master/masterHooks";
import { matchesAction } from "@/Utils/Lib/actionAliases";

// "Account" (acct_product) plus its 16 sub-configs — every sub-config below
// is scoped to a parent via acct_product_id (see fields), matching the
// backend's config/acct reference (2026-09). Every field here maps 1:1 to
// the payload documented there; only `narration`/`is_draft` (Add/Edit) and
// `id`/`narration` (every action after Add) are handled generically, same
// as KycConfigResource.jsx.
//
// Field shape: [key, label, type, lookupKey?]. `type` is one of
// text/number/boolean/textarea/date. `lookupKey` (when present) renders a
// FilterSelect fed by the matching entry in the `lookups` map built below,
// instead of a bare input — used for every acct_product_id/institution
// reference and every *_code field backed by a Master (Reference Data)
// list.
const CONFIGS = {
  acct_product: {
    // The real sidebar leaf for this entity is named "Product" (under the
    // "Account" group header, which is itself not a clickable menu item —
    // see acctConfigRoutes.jsx). menuName MUST match the backend's real
    // menu_name exactly, or every allowed(menus, ..., menuName) permission
    // check below silently evaluates false and every action button
    // (Add/Edit/Authorize/Delete) stays hidden regardless of the user's
    // actual grants.
    title: "Product",
    menuName: "Account Product",
    readOnlyOnEdit: ["inst_profile_id", "product_code"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["product_code", "Product code", "text"],
      ["product_name", "Product name", "text"],
      ["description", "Description", "textarea"],
      ["product_type", "Product type", "text", "acctProdTypes"],
      ["version", "Version", "text"],
      ["effective_from", "Effective from", "date"],
      ["effective_to", "Effective to", "date"],
      ["currency_code", "Currency", "text", "currencies"],
      ["branch_required", "Branch required", "boolean"],
      ["kyc_required", "KYC required", "boolean"],
      ["minimum_kyc_level", "Minimum KYC level", "number"],
      ["ownership_config_enabled", "Ownership config enabled", "boolean"],
      ["party_type_config_enabled", "Party type config enabled", "boolean"],
      ["opening_config_enabled", "Opening config enabled", "boolean"],
      ["numbering_config_enabled", "Numbering config enabled", "boolean"],
      ["currency_config_enabled", "Currency config enabled", "boolean"],
      ["balance_config_enabled", "Balance config enabled", "boolean"],
      ["interest_config_enabled", "Interest config enabled", "boolean"],
      ["tax_config_enabled", "Tax config enabled", "boolean"],
      ["transaction_config_enabled", "Transaction config enabled", "boolean"],
      ["channel_config_enabled", "Channel config enabled", "boolean"],
      ["lifecycle_config_enabled", "Lifecycle config enabled", "boolean"],
      ["dormancy_config_enabled", "Dormancy config enabled", "boolean"],
      ["joint_config_enabled", "Joint config enabled", "boolean"],
      ["minor_config_enabled", "Minor config enabled", "boolean"],
      ["group_config_enabled", "Group config enabled", "boolean"],
      ["nominee_config_enabled", "Nominee config enabled", "boolean"],
      ["statement_config_enabled", "Statement config enabled", "boolean"],
      ["alert_config_enabled", "Alert config enabled", "boolean"],
      ["eligibility_config_enabled", "Eligibility config enabled", "boolean"],
      ["accting_config_enabled", "Accounting config enabled", "boolean"],
    ],
  },
  acct_product_ownership: {
    title: "Product Ownership",
    menuName: "Product Ownership",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["ownership_type_code", "Ownership type", "text", "ownershipTypes"],
      ["allowed", "Allowed", "boolean"],
      ["min_holders", "Minimum holders", "number"],
      ["max_holders", "Maximum holders", "number"],
    ],
  },
  acct_product_party_type: {
    title: "Product Party Type",
    menuName: "Product Party Type",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["party_type_code", "Party type", "text", "partyTypes"],
      ["allowed", "Allowed", "boolean"],
    ],
  },
  acct_product_transaction: {
    title: "Product Transaction",
    menuName: "Product Transaction",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["transaction_type_code", "Transaction type", "text", "transactions"],
      ["allowed", "Allowed", "boolean"],
      ["authentication_required", "Authentication required", "boolean"],
      ["transaction_pin_required", "Transaction PIN required", "boolean"],
    ],
  },
  acct_product_channel: {
    title: "Product Channel",
    menuName: "Product Channel",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["channel_code", "Channel", "text", "channels"],
      ["allowed", "Allowed", "boolean"],
    ],
  },
  acct_product_balance_config: {
    title: "Product Balance Configuration",
    menuName: "Product Balance Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["minimum_balance", "Minimum balance", "number"],
      ["maximum_balance", "Maximum balance", "number"],
      ["minimum_available_balance", "Minimum available balance", "number"],
      ["maximum_available_balance", "Maximum available balance", "number"],
      ["minimum_operational_balance", "Minimum operational balance", "number"],
      ["negative_balance_allowed", "Negative balance allowed", "boolean"],
      ["overdraft_allowed", "Overdraft allowed", "boolean"],
      ["maximum_overdraft_amount", "Maximum overdraft amount", "number"],
    ],
  },
  acct_product_group_config: {
    title: "Product Group Configuration",
    menuName: "Product Group Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["group_acct_allowed", "Group account allowed", "boolean"],
      ["minimum_members", "Minimum members", "number"],
      ["maximum_members", "Maximum members", "number"],
      ["primary_owner_required", "Primary owner required", "boolean"],
    ],
  },
  acct_product_interest_config: {
    title: "Interest Configuration",
    menuName: "Interest Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["interest_enabled", "Interest enabled", "boolean"],
      ["calculation_method", "Calculation method", "text"],
      ["rate_type", "Rate type", "text"],
      ["base_rate", "Base rate", "number"],
      ["spread", "Spread", "number"],
      ["day_count_convention", "Day count convention", "text"],
      ["accrual_frequency", "Accrual frequency", "text"],
      ["calculation_frequency", "Calculation frequency", "text"],
      ["posting_frequency", "Posting frequency", "text"],
      ["posting_day", "Posting day", "number"],
      ["minimum_balance_for_interest", "Minimum balance for interest", "number"],
      ["maximum_balance_for_interest", "Maximum balance for interest", "number"],
    ],
  },
  acct_product_joint_config: {
    title: "Joint Configuration",
    menuName: "Joint Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["joint_allowed", "Joint allowed", "boolean"],
      ["minimum_holders", "Minimum holders", "number"],
      ["maximum_holders", "Maximum holders", "number"],
      ["operation_mode", "Operation mode", "text", "operationModes"],
    ],
  },
  acct_product_lifecycle_config: {
    title: "Lifecycle Configuration",
    menuName: "Lifecycle Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["opening_allowed", "Opening allowed", "boolean"],
      ["activation_required", "Activation required", "boolean"],
      ["freeze_allowed", "Freeze allowed", "boolean"],
      ["block_allowed", "Block allowed", "boolean"],
      ["dormant_allowed", "Dormant allowed", "boolean"],
      ["closure_allowed", "Closure allowed", "boolean"],
      ["closure_requires_zero_balance", "Closure requires zero balance", "boolean"],
      ["closure_requires_approval", "Closure requires approval", "boolean"],
      ["reactivation_allowed", "Reactivation allowed", "boolean"],
    ],
  },
  acct_product_dormancy_config: {
    title: "Dormancy Configuration",
    menuName: "Dormancy Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["dormancy_enabled", "Dormancy enabled", "boolean"],
      ["inactivity_days", "Inactivity days", "number"],
      ["dormancy_action", "Dormancy action", "text", "dormancyActions"],
      ["reactivation_allowed", "Reactivation allowed", "boolean"],
      ["reactivation_method", "Reactivation method", "text"],
      ["priority", "Priority", "number"],
    ],
  },
  acct_product_minor_config: {
    title: "Minor Configuration",
    menuName: "Minor Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["minor_allowed", "Minor allowed", "boolean"],
      ["minimum_age", "Minimum age", "number"],
      ["maximum_age", "Maximum age", "number"],
      ["guardian_required", "Guardian required", "boolean"],
      ["conversion_age", "Conversion age", "number"],
      ["conversion_product_id", "Conversion product", "number", "acctProducts"],
    ],
  },
  acct_product_nominee_config: {
    title: "Nominee Configuration",
    menuName: "Nominee Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["nominee_allowed", "Nominee allowed", "boolean"],
      ["nominee_required", "Nominee required", "boolean"],
      ["minimum_nominees", "Minimum nominees", "number"],
      ["maximum_nominees", "Maximum nominees", "number"],
      ["relationship_required", "Relationship required", "boolean"],
    ],
  },
  acct_product_numbering_config: {
    title: "Numbering Configuration",
    menuName: "Numbering Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["generation_method", "Generation method", "text"],
      ["acct_number_length", "Account number length", "number"],
      ["prefix", "Prefix", "text"],
      ["branch_code_included", "Branch code included", "boolean"],
      ["product_code_included", "Product code included", "boolean"],
      ["currency_code_included", "Currency code included", "boolean"],
      ["check_digit_enabled", "Check digit enabled", "boolean"],
      ["sequence_type", "Sequence type", "text", "sequenceTypes"],
    ],
  },
  acct_product_opening_config: {
    title: "Opening Configuration",
    menuName: "Opening Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["opening_allowed", "Opening allowed", "boolean"],
      ["minimum_age", "Minimum age", "number"],
      ["maximum_age", "Maximum age", "number"],
      ["initial_deposit_required", "Initial deposit required", "boolean"],
      ["minimum_initial_deposit", "Minimum initial deposit", "number"],
      ["approval_required", "Approval required", "boolean"],
      ["automatic_activation", "Automatic activation", "boolean"],
    ],
  },
  acct_product_statement_config: {
    title: "Statement Configuration",
    menuName: "Statement Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["statement_enabled", "Statement enabled", "boolean"],
      ["frequency", "Frequency", "text"],
      ["transaction_history_enabled", "Transaction history enabled", "boolean"],
      ["monthly_statement", "Monthly statement", "boolean"],
      ["email_delivery", "Email delivery", "boolean"],
      ["paper_statement", "Paper statement", "boolean"],
    ],
  },
  acct_product_alert_config: {
    title: "Alert Configuration",
    menuName: "Alert Configuration",
    readOnlyOnEdit: ["acct_product_id"],
    fields: [
      ["acct_product_id", "Account product", "number", "acctProducts"],
      ["low_balance_alert", "Low balance alert", "boolean"],
      ["low_balance_threshold", "Low balance threshold", "number"],
      ["credit_alert", "Credit alert", "boolean"],
      ["debit_alert", "Debit alert", "boolean"],
      ["interest_alert", "Interest alert", "boolean"],
      ["fee_alert", "Fee alert", "boolean"],
    ],
  },
};

const idOf = (row) => row?.id;
const rowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));
const allowed = (menus, action, menuName) =>
  (menus ?? []).some(
    (m) =>
      new RegExp(`^${menuName}$`, "i").test(String(m?.menu_name).trim()) &&
      (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)),
  );
// Master (reference data) endpoints don't share one consistent field naming
// convention — confirmed live shapes include plain {code, name} for some
// entities but {currency_code, currency_name} / {channel_id, channel_name}
// for others (see InstitutionCurrencyPage.jsx / InstitutionChannelPage.jsx,
// the only two of these lists with a previously-confirmed shape). Rather
// than guess a single field name per lookup and silently fall back to the
// numeric id when it's wrong (which is exactly what showed plain
// "1"/"2"/"3" instead of currency names in the Currency dropdown), scan
// each record's own keys for anything ending in "_code"/"_name" as well as
// the bare "code"/"name".
function firstMatchingKey(item, patterns) {
  const keys = Object.keys(item ?? {});
  for (const pattern of patterns) {
    const key = keys.find((k) => pattern.test(k));
    if (key && item[key] != null && item[key] !== "") return item[key];
  }
  return undefined;
}
const optionOf = (item, idBased) => {
  const codeValue = firstMatchingKey(item, [/^code$/i, /_code$/i]);
  const value = idBased ? idOf(item) : (codeValue ?? idOf(item));
  const label = firstMatchingKey(item, [/^name$/i, /_name$/i]) ?? codeValue ?? String(idOf(item));
  return { value, label };
};

export function AcctConfigResource({ entity }) {
  const config = CONFIGS[entity];
  const menus = useSelector((state) => state.menu.menuArray);
  const service = useMemo(() => configKycApi(entity), [entity]);
  const needsAcctProducts = entity !== "acct_product";
  const { data: institutions = [] } = useActiveInstitutionsQuery();
  const { ownershipTypes = [] } = useOwnershipTypes(entity === "acct_product_ownership");
  const { partyTypes = [] } = usePartyTypes(entity === "acct_product_party_type");
  const { channels = [] } = useChannels(entity === "acct_product_channel");
  const { transactions = [] } = useTransactions(entity === "acct_product_transaction");
  const { acctProdTypes = [] } = useAcctProdTypes(entity === "acct_product");
  const { currencies = [] } = useCurrencies(entity === "acct_product");
  const { operationModes = [] } = useAcctOperationModes(entity === "acct_product_joint_config");
  const { dormancyActions = [] } = useAcctDormancyActions(entity === "acct_product_dormancy_config");
  const { sequenceTypes = [] } = useAcctSequenceTypes(entity === "acct_product_numbering_config");
  const [acctProducts, setAcctProducts] = useState([]);
  useEffect(() => {
    if (!needsAcctProducts) return;
    configKycApi("acct_product")
      .getActive()
      .then((response) => setAcctProducts(rowsOf(response)))
      .catch((error) => notifications.error(error.message));
  }, [needsAcctProducts]);
  const lookups = useMemo(
    () => ({
      institutions: { idBased: true, items: institutions },
      acctProducts: { idBased: true, items: acctProducts },
      ownershipTypes: { idBased: false, items: ownershipTypes },
      partyTypes: { idBased: false, items: partyTypes },
      channels: { idBased: false, items: channels },
      transactions: { idBased: false, items: transactions },
      acctProdTypes: { idBased: false, items: acctProdTypes },
      currencies: { idBased: false, items: currencies },
      operationModes: { idBased: false, items: operationModes },
      dormancyActions: { idBased: false, items: dormancyActions },
      sequenceTypes: { idBased: false, items: sequenceTypes },
    }),
    [institutions, acctProducts, ownershipTypes, partyTypes, channels, transactions, acctProdTypes, currencies, operationModes, dormancyActions, sequenceTypes],
  );
  const optionsFor = (lookupKey) => {
    const { idBased, items } = lookups[lookupKey] ?? { idBased: false, items: [] };
    return items.map((item) => optionOf(item, idBased));
  };
  const labelFor = (lookupKey, value) => {
    const { idBased, items } = lookups[lookupKey] ?? { idBased: false, items: [] };
    const match = items.find((item) => String(optionOf(item, idBased).value) === String(value));
    return match ? optionOf(match, idBased).label : String(value ?? "-");
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
    [view, setView] = useState(null),
    [audit, setAudit] = useState(null),
    [action, setAction] = useState(null),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await service.list({ page, limit });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? response?.data?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [service, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(API_ENDPOINTS.CONFIG_ACCT[entity.toUpperCase()].LIST, () => void load());
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (tab === "all" || statusBucket(row) === tab) &&
          JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, tab, search],
  );
  const save = async (draft) => {
    // Same fix as DigitalProductResource.jsx/KycConfigResource.jsx: "_id"
    // fields rendered via FilterSelect have no native form control, so
    // nothing stops a submit while one is still empty ("") — caught here
    // before it reaches the API as a malformed number field.
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
        is_draft: draft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const response = await (editing ? service.edit(payload) : service.add(payload));
      notifications.success(apiMessage(response, `${config.title} saved`));
      setEditing(null);
      setForm({});
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const run = async () => {
    try {
      const { row, type } = action;
      const response =
        type === "submit"
          ? await service.submit({ id: idOf(row) })
          : type === "auth"
            ? await service.auth({ id: idOf(row) })
            : type === "deleteAuth"
              ? await service.deleteAuth({ id: idOf(row) })
              : type === "deauth"
                ? await service.deauth({ id: idOf(row), description: action.reason || "UNDEFINED" })
                : type === "deactivate"
                  ? await service.deactivate({ id: idOf(row) })
                  : type === "reactivate"
                    ? await service.reactivate({ id: idOf(row) })
                    : await service.delete({ id: idOf(row) });
      notifications.success(apiMessage(response, `${config.title} action completed`));
      setAction(null);
      void load();
    } catch (error) {
      notifications.error(error.message);
    }
  };
  const columns = [
    ...config.fields.slice(0, 4).map(([key, label, type, lookupKey]) => ({
      key,
      label,
      render: (row) => (lookupKey ? labelFor(lookupKey, row[key]) : type === "boolean" ? (row[key] ? "Yes" : "No") : String(row[key] ?? "-")),
    })),
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={String(row.status_name ?? row.status ?? "-")} variant="solid" />,
    },
    {
      key: "process_status_name",
      label: "Process Status",
      render: (row) => <StatusBadge status={String(row.process_status_name ?? "-")} />,
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      render: (row) => <StatusBadge status={String(row.auth_status ?? "-")} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => {
        const buttons = getMakerCheckerButtons(row, {
          canAdd: allowed(menus, "Add", config.menuName),
          canEdit: allowed(menus, "Edit", config.menuName),
          canAuthorize: allowed(menus, "Authorize", config.menuName),
          canDelete: allowed(menus, "Delete", config.menuName),
          canChangeStatus: allowed(menus, "Deactivate", config.menuName) || allowed(menus, "Reactivate", config.menuName),
        });
        const pendingType = buttons.isPendingDelete ? "deleteAuth" : "auth";
        return (
          <div className="flex flex-wrap justify-center gap-1">
            <UiTooltip label="View">
              <button type="button" className={actionButtonClass("view")} onClick={() => setView(row)}>
                <Eye size={14} />
              </button>
            </UiTooltip>
            {buttons.edit && (
              <button
                type="button"
                className={actionButtonClass("edit")}
                onClick={() => {
                  setEditing(row);
                  setForm({ ...row });
                }}
              >
                <Pencil size={14} />
              </button>
            )}
            {buttons.audit && (
              <button type="button" className={actionButtonClass("audit")} onClick={() => setAudit(row)}>
                <History size={14} />
              </button>
            )}
            {buttons.submitDraft && (
              <button
                type="button"
                className={actionButtonClass("submit")}
                onClick={() => setAction({ row, type: "submit", label: "Submit" })}
              >
                <Send size={14} />
              </button>
            )}
            {buttons.authorize && (
              <button
                type="button"
                className={actionButtonClass("auth")}
                onClick={() => setAction({ row, type: pendingType, label: "Authorize" })}
              >
                <ShieldCheck size={14} />
              </button>
            )}
            {buttons.deauthorize && (
              <button
                type="button"
                className={actionButtonClass("deauth")}
                onClick={() => setAction({ row, type: "deauth", label: "Reject", reason: "" })}
              >
                <ShieldOff size={14} />
              </button>
            )}
            {buttons.deactivate && (
              <button
                type="button"
                className={actionButtonClass("deauth")}
                onClick={() => setAction({ row, type: "deactivate", label: "Deactivate" })}
              >
                <ShieldOff size={14} />
              </button>
            )}
            {buttons.activate && (
              <button
                type="button"
                className={actionButtonClass("auth")}
                onClick={() => setAction({ row, type: "reactivate", label: "Reactivate" })}
              >
                <ShieldCheck size={14} />
              </button>
            )}
            {buttons.delete && (
              <button
                type="button"
                className={actionButtonClass("delete")}
                onClick={() => setAction({ row, type: "delete", label: "Delete" })}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      },
    },
  ];
  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{config.title}</h1>
      </div>
      <div
        className="mb-4 overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <StatusFilterTabs
          actions={
            allowed(menus, "Add", config.menuName) && (
              <button
                className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
                onClick={() => {
                  setForm(Object.fromEntries(config.fields.map(([key, , type]) => [key, type === "boolean" ? false : ""])));
                  setEditing(null);
                }}
              >
                <Plus size={14} /> Add {config.title}
              </button>
            )
          }
          rows={rows}
          value={tab}
          onChange={setTab}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={idOf}
          isLoading={loading}
          title={config.title}
          serverPagination={{
            page,
            limit,
            totalPages: pagination.totalPages ?? 1,
            totalRecords: pagination.totalRecords ?? rows.length,
            onPageChange: setPage,
            onLimitChange: (next) => {
              setLimit(next);
              setPage(1);
            },
          }}
          bare
        />
      </div>
      {(editing || Object.keys(form).length > 0) && (
        <Modal
          open
          title={`${editing ? "Edit" : "Add"} ${config.title}`}
          onClose={() => {
            setEditing(null);
            setForm({});
          }}
        >
          <div className="grid gap-3">
            {config.fields.map(([key, label, type, lookupKey]) => {
              const isReadOnly = Boolean(editing && config.readOnlyOnEdit?.includes(key));
              return (
                <label key={key} className={type === "boolean" ? "flex items-center gap-2 text-sm font-semibold" : "text-sm font-semibold"}>
                  {type === "boolean" ? <span>{label}</span> : label}
                  {lookupKey ? (
                    <FilterSelect
                      className="mt-1.5"
                      value={form[key] ?? ""}
                      onChange={(value) => setForm({ ...form, [key]: value })}
                      disabled={isReadOnly}
                      options={[{ value: "", label: `Select ${label.toLowerCase()}` }, ...optionsFor(lookupKey)]}
                    />
                  ) : type === "textarea" ? (
                    <textarea
                      value={form[key] ?? ""}
                      disabled={isReadOnly}
                      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                      className="mt-1.5 min-h-24 w-full rounded-xl border px-3 py-2.5"
                    />
                  ) : (
                    <input
                      type={type === "number" ? "number" : type === "boolean" ? "checkbox" : type === "date" ? "date" : "text"}
                      checked={type === "boolean" ? Boolean(form[key]) : undefined}
                      value={type !== "boolean" ? (form[key] ?? "") : undefined}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          [key]: type === "boolean" ? event.target.checked : type === "number" ? Number(event.target.value) : event.target.value,
                        })
                      }
                      className={type === "boolean" ? "h-4 w-4 rounded border" : "mt-1.5 w-full rounded-xl border px-3 py-2.5"}
                    />
                  )}
                </label>
              );
            })}
            <div className="flex justify-end gap-2">
              <button onClick={() => void save(true)} disabled={saving} className="rounded-xl border px-4 py-2 text-sm font-bold">
                Save draft
              </button>
              <button onClick={() => void save(false)} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
      {view && (
        <Modal open title={`View ${config.title}`} onClose={() => setView(null)}>
          <dl className="grid gap-3">
            {config.fields.map(([key, label, type, lookupKey]) => (
              <div key={key} className="rounded-xl border p-3">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-sm font-semibold">
                  {lookupKey ? labelFor(lookupKey, view[key]) : type === "boolean" ? (view[key] ? "Yes" : "No") : String(view[key] ?? "-")}
                </dd>
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
          fetchAudit={(p, value) => service.audit({ id: idOf(audit), page: p, limit: value }).then(mapAuditResponse)}
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${action.label} ${config.title}`}
          description={String(idOf(action.row))}
          confirmLabel={action.label}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {action.type === "deauth" && (
            <textarea value={action.reason} onChange={(event) => setAction({ ...action, reason: event.target.value })} />
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
