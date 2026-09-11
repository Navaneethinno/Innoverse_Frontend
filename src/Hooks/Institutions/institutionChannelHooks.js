import { useCallback, useEffect, useState } from "react";
import { institutionChannelApi } from "@/Services/Institutions/institutionChannel.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useEntityListQuery } from "@/Hooks/Institutions/useEntityListQuery";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { masterApi } from "@/Services/Master/master.api";
export function useInstitutionChannelsQuery() {
  const query = useEntityListQuery(institutionChannelApi.list);
  useLiveChannel(API_ENDPOINTS.INSTITUTION.INSTITUTION_CHANNEL.LIST, () => void query.refetch());
  return query;
}
export function useInstitutionChannelMutation(method) { const [state, setState] = useState({ isPending: false, error: null }); const mutateAsync = useCallback(async (payload) => { setState({ isPending: true, error: null }); try { const result = await institutionChannelApi[method](payload); setState({ isPending: false, error: null }); notifications.success(apiMessage(result, "Institution channel action completed")); return result; } catch (error) { setState({ isPending: false, error }); notifications.error(error instanceof Error ? error.message : "Institution channel action failed"); throw error; } }, [method]); return { ...state, mutateAsync }; }
export function useMasterChannels() { const [state, setState] = useState({ channels: [], loading: true, error: null }); useEffect(() => { let cancelled = false; masterApi.channelList().then((channels) => { if (!cancelled) setState({ channels, loading: false, error: null }); }).catch((error) => { if (!cancelled) setState({ channels: [], loading: false, error }); }); return () => { cancelled = true; }; }, []); return state; }
