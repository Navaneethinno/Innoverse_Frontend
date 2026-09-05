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
