import { useCallback, useEffect, useRef, useState } from "react";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

const EMPTY = { fields: [], risk_actions: [] };

// POST <base>/options for an institution (omitted = the user's own): the
// fields a criterion can use and the risk actions. `loadValues(field_code)`
// fetches (once, cached per institution) that field's options.
export function useRiskOptions(api, instProfileId) {
  const [options, setOptions] = useState(EMPTY);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const requested = useRef(new Set());
  const inst = instProfileId ? { inst_profile_id: instProfileId } : {};

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setValues({});
    requested.current = new Set();
    api
      .options(instProfileId ? { inst_profile_id: instProfileId } : {})
      .then((response) => !cancelled && setOptions({ ...EMPTY, ...(rowsOf(response)[0] ?? {}) }))
      .catch((error) => !cancelled && notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, instProfileId]);

  const loadValues = useCallback(
    (fieldCode) => {
      if (!fieldCode || requested.current.has(fieldCode)) return;
      requested.current.add(fieldCode);
      api
        .options({ ...inst, field_code: fieldCode })
        .then((response) => {
          const field = (rowsOf(response)[0]?.fields ?? []).find((f) => f.field_code === fieldCode);
          setValues((v) => ({ ...v, [fieldCode]: field?.values ?? [] }));
        })
        .catch((error) => {
          requested.current.delete(fieldCode);
          notifications.error(error.message);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, instProfileId],
  );

  const fieldName = (code) => options.fields.find((f) => f.field_code === code)?.name ?? code;
  const actionName = (id) => options.risk_actions.find((a) => a.id === id)?.name ?? (id ? `#${id}` : "-");
  const valueName = (code, id) => values[code]?.find((v) => v.id === id)?.name ?? `#${id}`;

  return { options, values, loading, loadValues, fieldName, actionName, valueName };
}
