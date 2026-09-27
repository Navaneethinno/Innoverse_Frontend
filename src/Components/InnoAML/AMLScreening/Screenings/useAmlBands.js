import { useEffect, useState } from "react";
import { amlSetupApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

// The band codes the user's institutions use (from their AML setups), for
// the band filters. Codes are unique per institution; the same code across
// institutions is offered once.
export function useAmlBands() {
  const [bands, setBands] = useState([]);
  useEffect(() => {
    amlSetupApi
      .list({ page: 1, limit: 100 })
      .then((r) => {
        const byCode = new Map();
        rowsOf(r).forEach((setup) => (setup.levels ?? []).forEach((l) => !byCode.has(l.code) && byCode.set(l.code, l)));
        setBands([...byCode.values()]);
      })
      .catch(() => setBands([]));
  }, []);
  return bands;
}
