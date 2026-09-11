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
