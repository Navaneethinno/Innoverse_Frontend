import { useCallback, useEffect, useState } from "react";
import { useEntityListQuery } from "@/Hooks/Institution/useEntityListQuery";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { masterApi } from "@/Services/Master/master.api";
// Institution Currency and Institution Phone Code share these: `api` is
// one of the two institutionCurrency.api.js objects, `livePath` its LIST path.
export function useAssignmentListQuery(api, livePath, params = {}) {
  // Live-reconciled in place (Live Updates guide §3) — see
  // useEntityListQuery.js's `livePath` option.
  return useEntityListQuery(api.list, {
    page: params.page,
    limit: params.limit,
    filter: params.filter,
    sortBy: params.sort_by,
    livePath,
  });
}
export function useAssignmentMutation(api, method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await api[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Action failed"); throw error; } }, [api, method]); return { ...state, mutateAsync }; }
export function useMasterCurrencies() { const [state, setState] = useState({ currencies: [], loading: true, error: null }); useEffect(() => { let cancelled = false; masterApi.currencyList().then((currencies) => { if (!cancelled) setState({ currencies, loading: false, error: null }); }).catch((error) => { if (!cancelled) setState({ currencies: [], loading: false, error }); }); return () => { cancelled = true; }; }, []); return state; }
// /master/country rows that have a dialling code (uninhabited territories have none).
export function useDialCountries() { const [countries, setCountries] = useState([]); useEffect(() => { let cancelled = false; masterApi.countryList().then((rows) => { if (!cancelled) setCountries(rows.filter((c) => c.dial_code)); }).catch(() => {}); return () => { cancelled = true; }; }, []); return countries; }
