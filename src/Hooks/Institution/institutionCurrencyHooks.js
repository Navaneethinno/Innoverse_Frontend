import { useCallback, useEffect, useState } from "react";
import { institutionCurrencyApi } from "@/Services/Institution/institutionCurrency.api";
import { useEntityListQuery } from "@/Hooks/Institution/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { masterApi } from "@/Services/Master/master.api";
export function useInstitutionCurrenciesQuery() {
  // Live-reconciled in place (Live Updates guide §3) — see
  // useEntityListQuery.js's `livePath` option.
  return useEntityListQuery(institutionCurrencyApi.list, {
    livePath: API_ENDPOINTS.INSTITUTION.INSTITUTION_CURRENCY.LIST,
  });
}
export function useInstitutionCurrencyMutation(method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await institutionCurrencyApi[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Institution currency action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Institution currency action failed"); throw error; } }, [method]); return { ...state, mutateAsync }; }
export function useMasterCurrencies() { const [state, setState] = useState({ currencies: [], loading: true, error: null }); useEffect(() => { let cancelled = false; masterApi.currencyList().then((currencies) => { if (!cancelled) setState({ currencies, loading: false, error: null }); }).catch((error) => { if (!cancelled) setState({ currencies: [], loading: false, error }); }); return () => { cancelled = true; }; }, []); return state; }
