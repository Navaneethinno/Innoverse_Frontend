import { useEffect, useState } from "react";
import { masterApi } from "@/Services/Master/master.api";
import { extProvidersApi } from "@/Services/Transactions/transactions.api";
import { masterRows, rowsOf, request } from "@/Services/Epurse/onboarding.api";

// Everything the limit rule editor picks from (Global Settings > Limit
// handoff, "Lists you need"), loaded once per page load and shared.
// A list that fails comes back empty rather than blocking the screen.
let listsPromise = null;
const safe = (promise) => promise.catch(() => []);
const activeRows = (path) => safe(request(path, { view: "dropdown" }).then(rowsOf));

function loadLists() {
  return Promise.all([
    safe(masterRows("/master/limit_category")),
    safe(masterRows("/master/limit_dimension")),
    safe(masterRows("/master/limit_type")),
    safe(masterApi.currencyList()),
    safe(masterApi.transactionList()),
    safe(masterApi.channelList()),
    safe(masterApi.partyTypeList()),
    safe(masterApi.ownershipList()),
    activeRows("/config/kyc/group/get_active"),
    activeRows("/config/digital_product/product/get_active"),
  ]).then(([categories, dimensions, limitTypes, currencies, transactions, channels, partyTypes, ownerships, kycSchemes, products]) => {
    const pick = (rows, label = (r) => r.name ?? r.code ?? r.short_desc ?? String(r.id)) => rows.map((r) => ({ value: String(r.id), label: label(r) }));
    return {
      categories,
      dimensions,
      limitTypes,
      currencies,
      // Options for a LIST condition, keyed by its value_source.
      sources: {
        DIRECTION: [
          { value: "CREDIT", label: "CREDIT" },
          { value: "DEBIT", label: "DEBIT" },
        ],
        TRANSACTION: pick(transactions, (r) => r.short_desc ?? r.name ?? r.key),
        CHANNEL: pick(channels, (r) => r.name ?? r.channel_name ?? r.code),
        PARTY_TYPE: pick(partyTypes, (r) => r.name ?? r.party_type_name),
        OWNERSHIP: pick(ownerships, (r) => r.name ?? r.ownership_name),
        KYC_SCHEME: pick(kycSchemes),
        PRODUCT: pick(products, (r) => r.name ?? r.product_name ?? r.code),
      },
    };
  });
}

export function useLimitLists() {
  const [lists, setLists] = useState(null);
  useEffect(() => {
    let cancelled = false;
    listsPromise ??= loadLists();
    listsPromise.then((data) => !cancelled && setLists(data)).catch(() => {
      listsPromise = null;
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return lists;
}

// The EXT_PROVIDER / EXT_PROVIDER_GROUP condition options: the live
// providers and groups of the limit group's institution.
export function useProviderSources(instProfileId) {
  const [sources, setSources] = useState({ EXT_PROVIDER: [], EXT_PROVIDER_GROUP: [] });
  useEffect(() => {
    let cancelled = false;
    extProvidersApi
      .providers(instProfileId ? { inst_profile_id: instProfileId } : {})
      .then((r) => {
        if (cancelled) return;
        const { providers = [], groups = [] } = rowsOf(r)[0] ?? {};
        const pick = (rows) => rows.map((x) => ({ value: String(x.id), label: `${x.name} (${x.code})` }));
        setSources({ EXT_PROVIDER: pick(providers), EXT_PROVIDER_GROUP: pick(groups) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [instProfileId]);
  return sources;
}

export const currencyCode = (c) => c.alpha_code ?? c.code ?? c.currency_code;
