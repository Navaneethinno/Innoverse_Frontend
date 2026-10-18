import { useEffect, useState } from "react";
import { activeMasterOptions, kycSchemeApi, request, rowsOf } from "@/Services/Epurse/onboarding.api";
import { masterApi } from "@/Services/Master/master.api";
import { notifications } from "@/Utils/Lib/notifications";

// The onboarding catalogue (/indv_onboarding_catalog) is gone with the form
// builder; its lists are platform masters now (Admin portal update: master
// lists). A list that fails to load comes back empty, and the KYC scheme
// then falls back to free text for it. Fetched once per page load, shared.
const masterList = (path) => request(path, {}).then(rowsOf).catch(() => []);
let catalogPromise = null;
export function useOnboardingCatalog() {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    let cancelled = false;
    catalogPromise ??= Promise.all([
      masterApi.kycProcessList().catch(() => []),
      masterApi.transactionList().catch(() => []),
      masterList("/master/limit_type"),
      masterList("/master/kyc_upgrade_trigger"),
      masterList("/master/document_purpose"),
      masterList("/master/validation_type"),
    ]).then(([kycProcesses, transactions, limitTypes, upgradeTriggers, documentPurposes, validationTypes]) => ({
      kyc_processes: kycProcesses,
      transactions,
      limit_types: limitTypes,
      kyc_upgrade_triggers: upgradeTriggers,
      document_purposes: documentPurposes,
      validation_types: validationTypes,
    }));
    catalogPromise
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((error) => {
        catalogPromise = null;
        if (!cancelled) notifications.error(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return catalog;
}

const MASTER_NAMES = [
  "document_type",
  "address_type",
  "employment",
  "relationship_type",
  "source_of_fund",
  "validation_rule",
  "verification_method",
];

// The institution's own Active masters, keyed by master name, each as
// [{id, code, name}] — the wizard sends codes (guide §8) but rules need ids.
export function useOnboardingMasters(enabled = true) {
  const [state, setState] = useState({ masters: {}, countries: [], residencyTypes: [], kycGroups: [], loading: true });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    Promise.all([
      Promise.all(MASTER_NAMES.map((name) => activeMasterOptions(name).catch(() => []))),
      masterApi.countryList().catch(() => []),
      masterApi.residencyTypeList().catch(() => []),
      kycSchemeApi.list({ page: 1, limit: 200 }).then(rowsOf).catch(() => []),
    ]).then(([lists, countries, residencyTypes, kycGroups]) => {
      if (cancelled) return;
      setState({
        masters: Object.fromEntries(MASTER_NAMES.map((name, i) => [name, lists[i]])),
        countries,
        residencyTypes,
        kycGroups: kycGroups.filter((g) => Number(g.status) === 1),
        loading: false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return state;
}
