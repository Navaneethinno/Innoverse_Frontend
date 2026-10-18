import { useCallback, useEffect, useState } from "react";
import { formFieldApi, formSectionApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// Form builder (Admin portal handoff: onboarding form builder, §4). The
// vocabulary (`types`) draws the field form: each field type lists the
// options it takes, each with a `kind` that picks its input. Fetched per
// mount, since the page's module decides whether it's the customer or the
// merchant library.
export function useFieldTypes() {
  const [vocabulary, setVocabulary] = useState(null);
  useEffect(() => {
    let cancelled = false;
    formFieldApi
      .types({})
      .then((response) => !cancelled && setVocabulary(rowsOf(response)[0] ?? { types: [], sources: [], file_formats: [] }))
      .catch((error) => {
        if (cancelled) return;
        notifications.error(error.message);
        setVocabulary({ types: [], sources: [], file_formats: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return vocabulary;
}

// Every record of a builder list (fields or sections) for pickers: the
// library is small, so one large page is enough.
function useWholeList(api) {
  const [rows, setRows] = useState(null);
  const reload = useCallback(
    () =>
      api
        .list({ page: 1, limit: 500 })
        .then((response) => setRows(rowsOf(response)))
        .catch((error) => {
          notifications.error(error.message);
          setRows([]);
        }),
    [api],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return { rows: rows ?? [], loading: rows === null, reload };
}

export const useFieldLibrary = () => useWholeList(formFieldApi);
export const useSectionLibrary = () => useWholeList(formSectionApi);

// Keys are lower-case letters, digits and underscores, start with a letter,
// at most 64 characters (§2). A suggestion from a name.
export const KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
export const keyFromName = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+$/, "")
    .slice(0, 64);

export const LIST_TYPES = new Set(["DROPDOWN", "RADIO", "CHECKBOXES"]);
