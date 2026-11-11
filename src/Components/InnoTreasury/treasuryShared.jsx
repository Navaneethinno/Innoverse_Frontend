import { API_ENDPOINTS } from "@/Utils/Constant";
import { useEffect, useState } from "react";
import { recordApi } from "@/Services/api/recordApi";
import { request, rowsOf } from "@/Services/Epurse/onboarding.api";
import { useL } from "@/Components/InnoCBS/cbsOps";

// InnoTreasury (Admin 24): shared record APIs and choices.
export const T = API_ENDPOINTS.TREASURY.ROOT;
export const counterpartyApi = recordApi(`${T}/counterparty`);
export const exposureLimitApi = recordApi(`${T}/exposure_limit`);
export const policyApi = recordApi(`${T}/investment_policy`);
export const bankAccountApi = recordApi(`${T}/bank_account`, ["close_day"]);
export const dematApi = recordApi(`${T}/demat_account`);
export const securityApi = recordApi(`${T}/security`);
export const reserveReqApi = recordApi(`${T}/statutory_requirement`);
export const almApi = recordApi(`${T}/alm_assumption`);
export const alertRuleApi = recordApi(`${T}/alert_rule`);
export const placementApi = recordApi(`${T}/placement`);
export const borrowingApi = recordApi(`${T}/borrowing`);
export const collateralApi = recordApi(`${T}/collateral`);
export const guaranteeApi = recordApi(`${T}/guarantee`);
export const fixedAssetApi = recordApi(`${T}/fixed_asset`, ["action", "depreciate", "events"]);

// Active records of a treasury master as choices ({ value: code, label, row }).
export function useActive(api, { value = (r) => r.code, label = (r) => `${r.code} · ${r.name}` } = {}) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api
      .active({})
      .then((r) => setRows(rowsOf(r).map((x) => ({ ...x, ...(x.setup ?? {}) }))))
      .catch(() => {});
  }, [api]);
  return rows.map((r) => ({ value: String(value(r)), label: label(r), row: r }));
}

const optionsCall = (b) => request(`${T}/options`, b);
let treasuryOptions = null;
let treasuryLoad = null;
// /config/treasury/options: currencies, deal and entry types, asset actions,
// branches, users, GL accounts (loaded once).
export function useTreasuryOptions() {
  const [, bump] = useState(0);
  useEffect(() => {
    if (treasuryOptions) return;
    treasuryLoad ??= optionsCall({}).then((r) => (treasuryOptions = rowsOf(r)[0] ?? r?.data ?? {}));
    treasuryLoad.then(() => bump((n) => n + 1)).catch(() => {});
  }, []);
  return treasuryOptions ?? {};
}
// Choices of a list that holds { value, label } items or plain codes.
export const choices = (list) => (list ?? []).map((x) => (x && typeof x === "object" ? { value: String(x.value ?? x.code ?? x.id), label: x.label ?? (x.code ? `${x.code} · ${x.name ?? ""}` : x.name) } : { value: x, label: x }));
export const glChoices = (list) => (list ?? []).map((g) => ({ value: String(g.id), label: `${g.gl_code} · ${g.name}${g.currency_code ? ` · ${g.currency_code}` : ""}` }));

export const useF = () => {
  const L = useL();
  return (key, type = "text", extra = {}) => ({ key, label: L(key), type, ...extra });
};
export const toNum = (keys) => (x) => ({ ...x, ...Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k] === "" || x[k] == null ? 0 : Number(x[k])])) });
export const today = () => new Date().toISOString().slice(0, 10);
// { INTERBANK: "1", ... } as "Interbank 1 · ..."
export const mapText = (o) =>
  Object.entries(o ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ") || "—";
