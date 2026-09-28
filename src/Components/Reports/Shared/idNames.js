import { useEffect, useMemo, useState } from "react";
import { masterApi } from "@/Services/Master/master.api";
import { request, rowsOf } from "@/Services/Epurse/onboarding.api";
import { institutionsApi } from "@/Services/Institution/institutions.api";
import { mapInstitutionListResponse } from "@/Hooks/Institution/institutionHooks";

// Report `values` carry raw foreign keys (business_nature_id: 3). This turns
// them into names by one rule instead of a hand-kept table: a field
// `<base>_id` names the `<base>` master — a platform list (country,
// currency, gender, ...) or /master_config/[corp_|indv_]<base>/list, trying
// the customer type's own prefix first. Each list loads once per session
// and only when a record uses it; an id that can't be resolved stays "#id".

const labelOf = (r) => r?.name ?? r?.currency_name ?? r?.inst_profile_name ?? r?.display_name ?? r?.alpha_code ?? r?.code;
const toMap = (list) => new Map((list ?? []).filter((r) => r?.id != null).map((r) => [String(r.id), labelOf(r)]));
const masterList = (path) => request(path, { page: 1, limit: 1000 }).then(rowsOf);

// Platform lists that don't live under /master_config/<base>.
const PLATFORM = {
  country: () => masterApi.countryList(),
  currency: () => masterApi.currencyList(),
  gender: () => masterApi.genderList(),
  party_type: () => masterApi.partyTypeList(),
  ownership: () => masterApi.ownershipList(),
  residency_type: () => masterApi.residencyTypeList(),
  inst_profile: () => institutionsApi.getActive().then((r) => mapInstitutionListResponse(r).institutions.map((i) => ({ ...i, id: i.id ?? i.inst_profile_id }))),
  risk_action: () => masterList("/master_config/risk_action/list"),
  province: () => masterList("/master_config/province/list"),
  district: () => masterList("/master_config/district/list"),
  village: () => masterList("/master_config/village/list"),
};
// Field bases that mean another master.
const ALIASES = { nationality: "country", citizenship: "country", address_proof_type: "document_type" };

// "country_of_incorporation_id" -> "country", "annual_turnover_currency_id" -> "currency".
function masterBase(field) {
  const base = String(field).replace(/_id$/, "");
  if (ALIASES[base]) return ALIASES[base];
  if (/(^|_)country(_|$)/.test(base) || /^country_of_/.test(base)) return "country";
  if (/currency$/.test(base)) return "currency";
  if (/nationality/.test(base)) return "country";
  const place = /^(province|district|village)(_|$)/.exec(base);
  if (place) return place[1];
  return base;
}

// Which prefixes to try for an entity: a corporate customer's masters are
// corp_, an individual's indv_, anything else unprefixed first.
function prefixesFor(entity) {
  const e = String(entity ?? "");
  if (/corp/.test(e)) return ["corp_", "", "indv_"];
  if (/indv|individual/.test(e)) return ["indv_", "", "corp_"];
  return ["", "indv_", "corp_"];
}

const cache = new Map(); // key -> Promise<Map<id, name>>
function loadNames(base, entity) {
  const prefixes = PLATFORM[base] ? [] : prefixesFor(entity);
  const key = PLATFORM[base] ? base : `${prefixes[0]}${base}`;
  if (!cache.has(key)) {
    const promise = PLATFORM[base]
      ? PLATFORM[base]().then(toMap).catch(() => new Map())
      : prefixes.reduce(
          (prev, prefix) => prev.then((found) => (found.size ? found : masterList(`/master_config/${prefix}${base}/list`).then(toMap).catch(() => new Map()))),
          Promise.resolve(new Map()),
        );
    cache.set(key, promise);
  }
  return cache.get(key);
}

export const isIdField = (field, value) => /_id$/.test(String(field)) && (typeof value === "number" || /^\d+$/.test(String(value ?? "")));

// Every <base> the value tree refers to by id.
function collectBases(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => collectBases(v, out));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([k, v]) => (isIdField(k, v) ? out.add(masterBase(k)) : collectBases(v, out)));
  return out;
}

// name(field, id) for every id in `values` (and optional extra trees), as
// the lists arrive; "#id" until then or when not found.
export function useIdNames(entity, ...trees) {
  const [names, setNames] = useState({});
  const basesKey = [...collectBases(trees)].sort().join(",");
  useEffect(() => {
    let cancelled = false;
    basesKey
      .split(",")
      .filter(Boolean)
      .forEach((base) =>
        loadNames(base, entity).then((map) => !cancelled && setNames((all) => ({ ...all, [base]: map }))),
      );
    return () => {
      cancelled = true;
    };
  }, [basesKey, entity]);
  return useMemo(() => (field, id) => names[masterBase(field)]?.get(String(id)) ?? `#${id}`, [names]);
}

// Keys whose plain wording would read badly.
const LABELS = { payload: "Onboarding form", inst_profile_id: "Institution", onboarding_definition_id: "Customer type", id_front_image: "ID front", id_back_image: "ID back" };

// "business_nature_id" -> "Business nature", "id_front_image" -> "ID front".
export const fieldLabel = (field) => {
  if (LABELS[field]) return LABELS[field];
  const text = String(field ?? "")
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "";
};
