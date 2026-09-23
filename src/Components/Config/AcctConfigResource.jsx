import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/Utils/Lib/cn";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { useSelector } from "react-redux";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { describeConfirmAction } from "@/Components/MakerChecker/confirmActionText";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { configKycApi } from "@/Services/Config/config.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { blockNegativeKeyDown, blurOnWheel, clampNonNegative } from "@/Utils/Lib/numberInput";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import {
  useAcctDormancyActions,
  useAcctOperationModes,
  useAcctProdTypes,
  useAcctSequenceTypes,
  useChannels,
  useCurrencies,
  useFrequencies,
  useOwnershipTypes,
  usePartyTypes,
  useTransactions,
} from "@/Hooks/Master/masterHooks";
import { matchesAction } from "@/Utils/Lib/actionAliases";
import { splitFieldsIntoColumns, orderedFields } from "@/Utils/Lib/formFieldColumns";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { AccountConfigurationCards } from "./AccountConfigurationCards";

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
    // Confirmed straight from a real /user/login menu_array: this entity's
    // menu_name is literally "Account Product" (menu_id 49, parent_menu_id
    // 48 = "Account", the non-clickable group header — see
    // acctConfigRoutes.jsx). menuName MUST match that exactly, or every
    // allowed(menus, ..., menuName) permission check below silently
    // evaluates false and every action button (Add/Edit/Authorize/Delete)
    // stays hidden regardless of the user's actual grants — this is NOT
    // the same as Digital Product's own child, which really is named just
    // "Digital Product" (menu_id 31); the two only look alike in a
    // truncated sidebar label.
    // Was bare "Product" — inconsistent with Digital Product's own
    // corresponding entity, which names itself "Digital Product" in full
    // rather than just "Product" (see DigitalProductResource.jsx's
    // CONFIGS.product.title). "Account Product" matches that convention and
    // the page's own real menu_name (menuName below), so the header,
    // breadcrumb (routeConfig.js), Add button, and Modal titles all read
    // clearly instead of an ambiguous bare "Product".
    title: "Account Product",
    menuName: "Account Product",
    readOnlyOnEdit: ["inst_profile_id", "product_code"],
    // Confirmed live: the backend has a NOT-NULL DB constraint on
    // effective_from — submitting without it doesn't even get a clean
    // validation message, it 500s ("null value in column effective_from
    // ... violates not-null constraint"). Guarded client-side same as the
    // lookup fields below, so a user gets one clear toast instead of that.
    required: ["effective_from", "effective_to"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["product_code", "Product code", "text"],
      ["product_name", "Product name", "text"],
      ["description", "Description", "textarea"],
      ["product_type", "Product type", "text", "acctProdTypes"],
      // Confirmed live against the real API: "version" must be a NUMBER.
      // Sending it as a string (even "1") makes the backend's strict JSON
      // decoder fail entirely — reported back as a flatly misleading
      // "Invalid Request / request body is not valid JSON" 400, with no
      // hint it's this field. This was the actual root cause of that
      // error on this form, not a validation/required-field problem.
      ["version", "Version", "number"],
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
      ["frequency", "Frequency", "text", "frequencies"],
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
// Confirmed live (2026-09): the backend now sends ONE umbrella "Account"
// menu node (menu_id 48) carrying every action (Add/View/Edit/Delete/
// Authorise/Change Status) directly on itself, with none of the 17
// per-entity children (Account Product/Product Ownership/.../Statement
// Configuration) this file was originally built against actually present
// in a real /user/login menu_array — every allowed(menus, action,
// config.menuName) check below silently evaluated false for every action
// on every entity, leaving Add/Edit/Authorize/etc. all invisible. Checking
// the specific per-entity name first (kept in case the backend ever does
// split it out again) and falling back to the umbrella "Account" node
// covers both shapes without guessing which one is live.
const allowed = (menus, action, menuName) =>
  (menus ?? []).some(
    (m) =>
      (new RegExp(`^${menuName}$`, "i").test(String(m?.menu_name).trim()) ||
        String(m?.menu_name).trim().toLowerCase() === "account") &&
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
  const nameValue = firstMatchingKey(item, [/^name$/i, /_name$/i]);
  // For non-id-based lookups (every *_code/*_type field on acct_product),
  // the backend expects a string enum/code, never the record's own numeric
  // id — confirmed live: product_type's real options are the enum strings
  // "SAVING"/"WALLET"/"CURRENT" (the acct_prod_type master list's own
  // `name`, since it has no separate `code` field), and submitting the
  // numeric id there instead ("product_type": 1) got a flatly misleading
  // "Invalid Request / request body is not valid JSON" 400 back — the body
  // WAS valid JSON, the enum value just wasn't one the backend recognized.
  // So the value fallback chain must end at `name`, never at id.
  const value = idBased ? idOf(item) : (codeValue ?? nameValue ?? idOf(item));
  const label = nameValue ?? codeValue ?? String(idOf(item));
  return { value, label };
};

export function AcctConfigResource({ entity }) {
  const config = CONFIGS[entity];
  // CONFIGS' own titles/field labels are plain hardcoded English (not
  // t()-driven), so switching the app to Portuguese silently left this
  // page untranslated — tr() looks each one up in a flat EN->PT table
  // instead; see configFieldLabels.js for why.
  const tr = useConfigLabel();
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
  const { frequencies = [] } = useFrequencies(entity === "acct_product_statement_config");
  const [acctProducts, setAcctProducts] = useState([]);
  useEffect(() => {
    if (!needsAcctProducts) return;
    // acct_product's get_active only returns bare {id} records (no name),
    // unlike every other lookup's get_active — confirmed live. Use list
    // with a large limit instead, same "full batch" tradeoff profilesApi
    // uses for its own removed getall endpoint, so the dropdown can show
    // product_name instead of the raw id.
    configKycApi("acct_product")
      .list({ page: 1, limit: 500 })
      .then((response) => setAcctProducts(rowsOf(response)))
      .catch((error) => notifications.error(error.message));
  }, [needsAcctProducts]);
  const lookups = useMemo(
    () => ({
      institutions: { idBased: true, items: institutions },
      acctProducts: { idBased: true, items: acctProducts },
      // Confirmed live (2026-09) against the real add endpoints, one field
      // at a time: ownership_type_code, party_type_code, channel_code,
      // transaction_type_code, currency_code, frequency, dormancy_action,
      // sequence_type, and operation_mode ALL want the master record's
      // numeric id, not its name string — sending the name decodes as
      // valid JSON but the backend can't map it and reports the same
      // misleading "Invalid Request / request body is not valid JSON" 400
      // as every other type-mismatch case here (frequency/dormancy_action
      // additionally 500 as a bare Postgres FK-constraint violation when
      // left out entirely, confirming these are real foreign keys, not
      // free-text enum columns). A "_code" suffix on the field name is NOT
      // a reliable signal either way — only acctProdTypes (product_type on
      // acct_product itself) is confirmed to want the literal enum string.
      // idBased so the value submitted is the id while the dropdown/label
      // still shows the name.
      ownershipTypes: { idBased: true, items: ownershipTypes },
      partyTypes: { idBased: true, items: partyTypes },
      channels: { idBased: true, items: channels },
      transactions: { idBased: true, items: transactions },
      acctProdTypes: { idBased: false, items: acctProdTypes },
      currencies: { idBased: true, items: currencies },
      operationModes: { idBased: true, items: operationModes },
      dormancyActions: { idBased: true, items: dormancyActions },
      sequenceTypes: { idBased: true, items: sequenceTypes },
      frequencies: { idBased: true, items: frequencies },
    }),
    [institutions, acctProducts, ownershipTypes, partyTypes, channels, transactions, acctProdTypes, currencies, operationModes, dormancyActions, sequenceTypes, frequencies],
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
  // Human-readable identity for a row, for confirm dialogs — same idea as
  // Institution's own confirm dialogs showing the institution's name/code
  // instead of its raw id. acct_product itself has its own name/code; every
  // other acct_* sub-entity has no name of its own, it's identified by the
  // Account Product it belongs to (acct_product_id), so that product's
  // resolved name is shown instead.
  const describeActionRow = (row) => {
    if (!row) return "";
    if (entity === "acct_product") return row.product_name || row.product_code || String(idOf(row));
    const productLabel = labelFor("acctProducts", row.acct_product_id);
    return productLabel && productLabel !== "-" ? productLabel : String(idOf(row));
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
    [saving, setSaving] = useState(false),
    [actionPending, setActionPending] = useState(false);
  // Shows the maker's proposed changes inside the Authorize/Reject confirm
  // dialog, same pattern as InstitutionBrandingPage.jsx — fetched only
  // while that dialog is actually open, via the entity's own /pending
  // endpoint (payload {id}).
  const pendingInfo = usePendingChanges(
    service.pending,
    action ? idOf(action.row) : null,
    Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type),
  );
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
  // Refetch on every live push rather than reconciling in place — the
  // in-place merge previously used (insertNew: false) silently dropped
  // brand-new records from another user/tab entirely (confirmed live: the
  // socket frame arrived, but nothing changed on screen until a manual
  // refresh). A refetch is always correct regardless of page/sort/search.
  useLiveChannel(
    API_ENDPOINTS.CONFIG_ACCT[entity.toUpperCase()].LIST,
    () => void load(),
  );
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
    // Same fix as DigitalProductResource.jsx/KycConfigResource.jsx, widened
    // to cover every FilterSelect-driven field, not just "_id"-suffixed
    // ones — acct_product also has *_code/*_type lookups (currency_code,
    // product_type, ...) with the same problem: FilterSelect has no native
    // form control, so nothing stops a submit while one is still blank.
    // Left unguarded, a blank *_id/number field reaches the API as an
    // empty string where a number is expected, and this backend reports
    // that as a flatly misleading "request body is not valid JSON" 400
    // instead of a real validation message.
    const missingField = config.fields.find(
      ([key, , , lookupKey]) =>
        (lookupKey || config.required?.includes(key)) && (form[key] === "" || form[key] == null),
    );
    if (missingField) {
      const label = tr(missingField[1]).toLowerCase();
      const verb = missingField[3] ? "select" : "enter";
      notifications.error(`Please ${verb} ${/^[aeiou]/.test(label) ? "an" : "a"} ${label}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(
          config.fields
            .filter(([key]) => !editing || !config.readOnlyOnEdit?.includes(key))
            // Plain (non-lookup) "number" fields left untouched keep their
            // initial "" from the Add-button's reset (see the
            // "Add {config.title}" button below) — send 0 instead of "",
            // since a blank string in a numeric field is exactly the kind
            // of thing this backend rejects as "not valid JSON".
            .map(([key, , type, lookupKey]) => [
              key,
              !lookupKey && type === "number" && (form[key] === "" || form[key] == null) ? 0 : form[key],
            ]),
        ),
        is_draft: draft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const response = await (editing ? service.edit(payload) : service.add(payload));
      notifications.success(apiMessage(response, `${tr(config.title)} saved`));
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
    setActionPending(true);
    try {
      const { row, type } = action;
      // Every action in this lifecycle takes {id, narration} per the API
      // reference (auth/deauth/delete/deleteAuth/deactivate/reactivate/
      // submit all list it) — narration was previously only sent for
      // deauth, silently dropping it everywhere else.
      const narration = action.reason || "";
      const payload = { id: idOf(row), narration };
      const response =
        type === "submit"
          ? await service.submit(payload)
          : type === "auth"
            ? await service.auth(payload)
            : type === "deleteAuth"
              ? await service.deleteAuth(payload)
              : type === "deauth"
                ? await service.deauth(payload)
                : type === "deactivate"
                  ? await service.deactivate(payload)
                  : type === "reactivate"
                    ? await service.reactivate(payload)
                    : await service.delete(payload);
      notifications.success(apiMessage(response, `${tr(config.title)} action completed`));
      setAction(null);
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setActionPending(false);
    }
  };
  const columns = [
    ...config.fields.slice(0, 4).map(([key, label, type, lookupKey]) => ({
      key,
      label: tr(label),
      render: (row) => (lookupKey ? labelFor(lookupKey, row[key]) : type === "boolean" ? (row[key] ? tr("Yes") : tr("No")) : String(row[key] ?? "-")),
    })),
    {
      key: "status",
      label: tr("Status"),
      render: (row) => <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : row.status === 0 ? "INACTIVE" : "-"))} variant="solid" />,
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      render: (row) => <StatusBadge status={String(row.process_status_name ?? "-")} />,
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      render: (row) => <StatusBadge status={String(row.auth_status ?? "-")} />,
    },
    {
      key: "actions",
      label: tr("Actions"),
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
          <RowActions
            buttons={buttons}
            onView={() => setView(row)}
            onEdit={() => {
              setEditing(row);
              setForm({ ...row });
            }}
            onAudit={() => setAudit(row)}
            onSubmit={() => setAction({ row, type: "submit", label: "Submit" })}
            onAuthorize={() => setAction({ row, type: pendingType, label: "Authorize" })}
            onDeauthorize={() => setAction({ row, type: "deauth", label: "Reject", reason: "" })}
            onDeactivate={() => setAction({ row, type: "deactivate", label: "Deactivate" })}
            onReactivate={() => setAction({ row, type: "reactivate", label: "Reactivate" })}
            onDelete={() => setAction({ row, type: "delete", label: "Delete" })}
          />
        );
      },
    },
  ];
  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{tr(config.title)}</h1>
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
                <Plus size={14} /> {tr("Add")} {tr(config.title)}
              </button>
            )
          }
          rows={rows}
          value={tab}
          onChange={setTab}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={`${tr("Search")} ${tr(config.title).toLowerCase()}...`}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={idOf}
          isLoading={loading}
          title={tr(config.title)}
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
          title={`${editing ? tr("Edit") : tr("Add")} ${tr(config.title)}`}
          size="lg"
          growWithContent
          onClose={() => {
            setEditing(null);
            setForm({});
          }}
          footer={
            <>
              <button onClick={() => void save(true)} disabled={saving} className="rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50">
                {tr("Save draft")}
              </button>
              <button onClick={() => void save(false)} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {tr("Save")}
              </button>
            </>
          }
        >
          {/* Two independent flex-column stacks, not a single 2-col CSS
              grid — see formFieldColumns.js for why: a real grid pairs
              left/right cells into shared rows, so a tall field (a
              dropdown) next to a short one (a checkbox) stretches the short
              cell's row to match, stranding it with a large gap before the
              next row. */}
          {(() => {
            // Only actually split into two grid columns when there's a
            // second column's worth of fields — splitFieldsIntoColumns
            // returns an empty second column for a short form (its own
            // SINGLE_COLUMN_THRESHOLD), and forcing md:grid-cols-2 anyway
            // reserved a whole empty half-width column next to it.
            const columns = splitFieldsIntoColumns(orderedFields(config.fields)).filter((columnFields) => columnFields.length > 0);
            return (
          <div className={cn("grid gap-x-8 gap-y-3", columns.length > 1 && "md:grid-cols-2")}>
            {columns.map((columnFields, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-3">
                {columnFields.map(([key, label, type, lookupKey]) => {
                  const isReadOnly = Boolean(editing && config.readOnlyOnEdit?.includes(key));
                  if (type === "boolean") {
                    return (
                      <CheckboxPill
                        key={key}
                        checked={Boolean(form[key])}
                        onChange={(next) => setForm({ ...form, [key]: next })}
                        label={tr(label)}
                        disabled={isReadOnly}
                        className="self-start"
                      />
                    );
                  }
                  return (
                    <label key={key} className="text-sm font-semibold">
                      {tr(label)}
                      {lookupKey ? (
                        <FilterSelect
                          className="mt-1.5"
                          value={form[key] ?? ""}
                          onChange={(value) => setForm({ ...form, [key]: value })}
                          disabled={isReadOnly}
                          options={[{ value: "", label: `${tr("Select")} ${tr(label).toLowerCase()}` }, ...optionsFor(lookupKey)]}
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
                          type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                          min={type === "number" ? 0 : undefined}
                          value={form[key] ?? ""}
                          disabled={isReadOnly}
                          onKeyDown={type === "number" ? blockNegativeKeyDown : undefined}
                          onWheel={type === "number" ? blurOnWheel : undefined}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              [key]: type === "number" ? clampNonNegative(event.target.value) : event.target.value,
                            })
                          }
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
            );
          })()}
        </Modal>
      )}
      {view && (
        <Modal
          open
          title={entity === "acct_product" ? `${view.product_name ?? tr(config.title)} — Configurations` : `${tr("View")} ${tr(config.title)}`}
          subtitle={entity === "acct_product" ? "Only the configurations enabled for this product are shown" : undefined}
          size={entity === "acct_product" ? "xl" : "md"}
          growWithContent={entity === "acct_product"}
          onClose={() => setView(null)}
        >
          {/* Account Product's own field-by-field dump (19 boolean flags
              plus the rest) is noise here — the cards below already convey
              which configs are enabled, that's what this view is for. A
              short identifying summary (institution/code/name/description/
              status) still belongs up top so it's clear which product this
              is. Every other entity keeps the full plain field list. */}
          {entity === "acct_product" ? (
            <>
              <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Institution profile", labelFor("institutions", view.inst_profile_id)],
                  ["Product code", view.product_code ?? "-"],
                  ["Product name", view.product_name ?? "-"],
                  ["Description", view.description || "-"],
                  ["Status", view.status_name ?? (view.status === 1 ? "ACTIVE" : view.status === 0 ? "INACTIVE" : "-")],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-3">
                    <dt className="text-xs text-muted-foreground">{tr(label)}</dt>
                    <dd className="text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <AccountConfigurationCards
                product={view}
                onNavigate={() => setView(null)}
                onEditProduct={() => {
                  setEditing(view);
                  setForm({ ...view });
                }}
              />
            </>
          ) : (
            <dl className="grid gap-3">
              {config.fields.map(([key, label, type, lookupKey]) => (
                <div key={key} className="rounded-xl border p-3">
                  <dt className="text-xs text-muted-foreground">{tr(label)}</dt>
                  <dd className="text-sm font-semibold">
                    {lookupKey ? labelFor(lookupKey, view[key]) : type === "boolean" ? (view[key] ? tr("Yes") : tr("No")) : String(view[key] ?? "-")}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={tr(config.title)}
          onClose={() => setAudit(null)}
          fields={config.fields.map(([key, label]) => [key, tr(label)])}
          fetchAudit={(p, value) => service.audit({ id: idOf(audit), page: p, limit: value }).then(mapAuditResponse)}
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
          pending={actionPending}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          <textarea
            value={action.reason ?? ""}
            onChange={(event) => setAction({ ...action, reason: event.target.value })}
            placeholder={tr("Narration")}
            className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm"
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
