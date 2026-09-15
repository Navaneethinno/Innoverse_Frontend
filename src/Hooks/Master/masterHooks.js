import { useCallback, useEffect, useState } from "react";
import { masterApi } from "@/Services/Master/master.api";

export function useInstitutionTypes() {
  const [types, setTypes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTypes(await masterApi.institutionTypeList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load institution types"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { types, loading, error };
}

export function useLanguages() {
  const [languages, setLanguages] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    try {
      setLanguages(await masterApi.languageList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load languages"));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { languages, error };
}

export function useTimezones() {
  const [timezones, setTimezones] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTimezones(await masterApi.timezoneList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load timezones"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { timezones, loading, error };
}

export function useKycDataFields(enabled = true) {
  const [dataFields, setDataFields] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setDataFields(await masterApi.kycDataFieldList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load KYC data fields"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { dataFields, error };
}

export function useKycProcesses(enabled = true) {
  const [processes, setProcesses] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setProcesses(await masterApi.kycProcessList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load KYC processes"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { processes, error };
}

export function useKycDocumentTypes(enabled = true) {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setDocumentTypes(await masterApi.kycDocumentTypeList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load KYC document types"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { documentTypes, error };
}

export function useChannels(enabled = true) {
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setChannels(await masterApi.channelList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load channels"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { channels, error };
}

export function useTransactions(enabled = true) {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setTransactions(await masterApi.transactionList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load transaction types"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { transactions, error };
}

export function useOwnershipTypes(enabled = true) {
  const [ownershipTypes, setOwnershipTypes] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setOwnershipTypes(await masterApi.ownershipList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load ownership types"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { ownershipTypes, error };
}

export function usePartyTypes(enabled = true) {
  const [partyTypes, setPartyTypes] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setPartyTypes(await masterApi.partyTypeList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load party types"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { partyTypes, error };
}

export function useAcctProdTypes(enabled = true) {
  const [acctProdTypes, setAcctProdTypes] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setAcctProdTypes(await masterApi.acctProdTypeList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load account product types"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { acctProdTypes, error };
}

export function useAcctOperationModes(enabled = true) {
  const [operationModes, setOperationModes] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setOperationModes(await masterApi.acctOperationModeList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load operation modes"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { operationModes, error };
}

export function useAcctDormancyActions(enabled = true) {
  const [dormancyActions, setDormancyActions] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setDormancyActions(await masterApi.acctDormancyActionList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load dormancy actions"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { dormancyActions, error };
}

export function useAcctSequenceTypes(enabled = true) {
  const [sequenceTypes, setSequenceTypes] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setSequenceTypes(await masterApi.acctSequenceList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load account sequence types"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { sequenceTypes, error };
}

export function useCurrencies(enabled = true) {
  const [currencies, setCurrencies] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setCurrencies(await masterApi.currencyList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load currencies"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { currencies, error };
}

export function useResidencyTypes(enabled = true) {
  const [residencyTypes, setResidencyTypes] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setResidencyTypes(await masterApi.residencyTypeList());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load residency types"));
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);
  return { residencyTypes, error };
}
