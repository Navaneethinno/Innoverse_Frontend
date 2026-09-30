import { useEffect, useState } from "react";
import { activeCorpMasterOptions } from "@/Services/Epurse/onboarding.api";
import { masterApi } from "@/Services/Master/master.api";

const CORP_MASTER_NAMES = [
  "corp_address_type",
  "corp_relationship_type",
  "corp_document_type",
  "corp_tax_type",
  "corp_screening_type",
  "corp_company_type",
];

// The institution's own Active corp_ masters, keyed by master name, each as
// [{id, code, name}] — the wizard sends codes but rules/ids need ids.
// validation_rule/verification_method are the shared (non-corp_) masters
// already exposed by onboarding.api.js's own masterApis, so this only needs
// activeCorpMasterOptions for the corp_-prefixed ones.
export function useCorpOnboardingMasters(enabled = true) {
  const [state, setState] = useState({ masters: {}, countries: [], loading: true });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    Promise.all([
      Promise.all(CORP_MASTER_NAMES.map((name) => activeCorpMasterOptions(name).catch(() => []))),
      masterApi.countryList().catch(() => []),
    ]).then(([lists, countries]) => {
      if (cancelled) return;
      setState({
        masters: Object.fromEntries(CORP_MASTER_NAMES.map((name, i) => [name, lists[i]])),
        countries,
        loading: false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return state;
}
