import { useEffect, useState } from "react";
import { masterApi } from "@/Services/Master/master.api";
export function useMasterChannels() { const [state, setState] = useState({ channels: [], loading: true, error: null }); useEffect(() => { let cancelled = false; masterApi.channelList().then((channels) => { if (!cancelled) setState({ channels, loading: false, error: null }); }).catch((error) => { if (!cancelled) setState({ channels: [], loading: false, error }); }); return () => { cancelled = true; }; }, []); return state; }
