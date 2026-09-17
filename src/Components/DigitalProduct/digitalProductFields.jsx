import { FilterSelect } from "@/Components/Common/FilterSelect";
import { blockNegativeKeyDown, blurOnWheel, clampNonNegative } from "@/Utils/Lib/numberInput";

// Field definitions + dropdown/input rendering shared between
// DigitalProductResource.jsx (the 9 existing standalone listing/Add/Edit
// pages) and AddDigitalProductWizard.jsx (the single Add Digital Product
// wizard) — kept in its own module, imported by both, so neither one
// imports the other (a DigitalProductResource <-> AddDigitalProductWizard
// cycle would otherwise exist, since the resource opens the wizard and the
// wizard used to reuse the resource's own CONFIGS/field-renderer).
export const CONFIGS = {
  product: {
    title: "Digital Product",
    menuName: "Digital Product",
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
    fields: [
      ["acct_product_id", "Account product", "number"],
      ["allowed", "Allowed", "boolean"],
      ["primary_account_product", "Primary account product", "boolean"],
      ["priority", "Priority", "number"],
    ],
  },
  security_config: {
    title: "Security Config",
    fields: [
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
    fields: [
      ["kyc_group_id", "KYC group", "number"],
      ["minimum_kyc_level", "Minimum KYC level", "number"],
    ],
  },
  kyc_level: {
    title: "KYC Level",
    fields: [
      ["kyc_level", "KYC level", "number"],
      ["level_name", "Level name", "text"],
    ],
  },
  channel_config: {
    title: "Channel Config",
    fields: [
      ["channel_id", "Channel", "number"],
      ["enabled", "Enabled", "boolean"],
      ["session_timeout_seconds", "Session timeout seconds", "number"],
      ["user_activity_timeout_seconds", "User activity timeout seconds", "number"],
    ],
  },
  channel_transaction: {
    title: "Channel Transaction",
    fields: [
      ["transaction_type_id", "Transaction type", "number"],
      ["allowed", "Allowed", "boolean"],
      ["authentication_required", "Authentication required", "boolean"],
      ["transaction_pin_required", "Transaction PIN required", "boolean"],
    ],
  },
  eligibility_config: {
    title: "Eligibility Config",
    fields: [
      ["age_restriction_inherit", "Age restriction inherit", "boolean"],
      ["minimum_age", "Minimum age", "number"],
      ["maximum_age", "Maximum age", "number"],
      ["residency_restriction_inherit", "Residency restriction inherit", "boolean"],
    ],
  },
  residency: {
    title: "Residency",
    fields: [
      ["residency_type_id", "Residency type", "number"],
      ["allowed", "Allowed", "boolean"],
    ],
  },
};

// The dropdown-driven control (or plain input/textarea/checkbox) for one
// field of one CONFIGS entry. `lookups` bundles every list either caller
// already fetches (institutions/accountProducts/kycGroups/channels/
// transactions/residencyTypes); a caller only needs to pass the ones
// relevant to the fields it renders.
export function DigitalProductFieldInput({ fieldKey: key, type, value, onChange, lookups = {}, disabled = false }) {
  const {
    institutions = [],
    accountProducts = [],
    kycGroups = [],
    channels = [],
    transactions = [],
    residencyTypes = [],
  } = lookups;
  if (key === "transaction_type_id") {
    return (
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "", label: "Select transaction type" },
          ...transactions.map((transaction) => ({
            value: transaction.id,
            label: transaction.name ?? transaction.code ?? String(transaction.id),
          })),
        ]}
      />
    );
  }
  if (key === "channel_id") {
    return (
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "", label: "Select channel" },
          ...channels.map((channel) => ({
            value: channel.id,
            label: channel.name ?? channel.code ?? String(channel.id),
          })),
        ]}
      />
    );
  }
  if (key === "kyc_group_id") {
    return (
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "", label: "Select KYC group" },
          ...kycGroups.map((group) => ({
            value: group.id,
            label: group.name ?? group.code ?? String(group.id),
          })),
        ]}
      />
    );
  }
  if (key === "acct_product_id") {
    return (
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "", label: "Select account product" },
          ...accountProducts.map((product) => ({
            value: product.id,
            label: product.name ?? product.code ?? String(product.id),
          })),
        ]}
      />
    );
  }
  if (key === "residency_type_id") {
    return (
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "", label: "Select residency type" },
          ...residencyTypes.map((type) => ({
            value: type.id,
            label: type.name ?? type.code ?? String(type.id),
          })),
        ]}
      />
    );
  }
  if (key === "inst_profile_id") {
    return (
      <FilterSelect
        className="mt-1.5"
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        options={[
          { value: "", label: "Select institution profile" },
          ...institutions.map((institution) => ({
            value: institution.id,
            label: institution.name ?? String(institution.id),
          })),
        ]}
      />
    );
  }
  if (type === "textarea") {
    return (
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1.5 min-h-24 w-full rounded-xl border p-3 disabled:bg-slate-50 disabled:text-slate-500"
      />
    );
  }
  // type === "boolean" never reaches here — both callers (the wizard's
  // DigitalProductStepFields and the standalone Editor in
  // DigitalProductResource.jsx) render a CheckboxPill directly for it
  // instead of going through this generic input.
  return (
    <input
      required={key.endsWith("_id") || ["code", "name"].includes(key)}
      type={type}
      min={type === "number" ? 0 : undefined}
      value={value ?? ""}
      onKeyDown={type === "number" ? blockNegativeKeyDown : undefined}
      onWheel={type === "number" ? blurOnWheel : undefined}
      onChange={(e) => onChange(type === "number" ? clampNonNegative(e.target.value) : e.target.value)}
      disabled={disabled}
      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 disabled:bg-slate-50 disabled:text-slate-500"
    />
  );
}
