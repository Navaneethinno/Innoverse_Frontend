import { useCallback, useEffect, useState } from "react";
import { institutionCurrencyApi } from "@/Services/Institutions/institutionCurrency.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useEntityListQuery } from "@/Hooks/Institutions/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { masterApi } from "@/Services/Master/master.api";
export function useInstitutionCurrenciesQuery() {
  const query = useEntityListQuery(institutionCurrencyApi.list);
  useLiveChannel(API_ENDPOINTS.INSTITUTION.INSTITUTION_CURRENCY.LIST, () => void query.refetch());
  return query;
}
export function useInstitutionCurrencyMutation(method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await institutionCurrencyApi[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Institution currency action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Institution currency action failed"); throw error; } }, [method]); return { ...state, mutateAsync }; }
export function useMasterCurrencies() { const [state, setState] = useState({ currencies: [], loading: true, error: null }); useEffect(() => { let cancelled = false; masterApi.currencyList().then((currencies) => { if (!cancelled) setState({ currencies, loading: false, error: null }); }).catch((error) => { if (!cancelled) setState({ currencies: [], loading: false, error }); }); return () => { cancelled = true; }; }, []); return state; }
