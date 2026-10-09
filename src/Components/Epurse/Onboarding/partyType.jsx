import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { useMenuContext } from "@/Pages/Sidebar/menuContext";

// Merchant-side customer types and risk set-ups are for merchants (party
// type 2) or agents (3). Customer-side ones have no choice: the module sets it.
export const MERCHANT_PARTY_TYPE = 2;
export const AGENT_PARTY_TYPE = 3;

export const useIsMerchantModule = () => String(useMenuContext()?.module ?? "").toUpperCase() === "MMS";

export const isAgentType = (row) => Number(row?.party_type_id) === AGENT_PARTY_TYPE || String(row?.party_type_name ?? "").toUpperCase() === "AGENT";

// The add body's party_type_id: only on the merchant side.
export const partyTypeBody = (isMerchant, value) => (isMerchant ? { party_type_id: Number(value) || MERCHANT_PARTY_TYPE } : {});

export function PartyTypeSelect({ value, onChange, disabled, className = "text-sm font-semibold text-slate-700" }) {
  const { t } = useTranslation("onboarding");
  return (
    <label className={className}>
      {t("partyType")}
      <FilterSelect
        className="mt-1.5"
        disabled={disabled}
        value={String(value || MERCHANT_PARTY_TYPE)}
        onChange={onChange}
        options={[
          { value: String(MERCHANT_PARTY_TYPE), label: t("partyType_MERCHANT") },
          { value: String(AGENT_PARTY_TYPE), label: t("partyType_AGENT") },
        ]}
      />
      <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("partyTypeHint")}</span>
    </label>
  );
}
