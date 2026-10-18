import { useEffect, useState } from "react";
import { amlSetupApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

// The band codes the user's institutions use (from their AML setups), for
// the band filters. Codes are unique per institution; the same code across
// institutions is offered once. get_active needs only a login, so the
// filters fill for anyone who can open the screen or report.
export function useAmlBands() {
  const [bands, setBands] = useState([]);
  useEffect(() => {
    amlSetupApi
      .getActive()
      .then((r) => {
        const byCode = new Map();
        rowsOf(r).forEach((setup) => (setup.levels ?? []).forEach((l) => !byCode.has(l.code) && byCode.set(l.code, l)));
        setBands([...byCode.values()].sort((a, b) => Number(a.min_score) - Number(b.min_score)));
      })
      .catch(() => setBands([]));
  }, []);
  return bands;
}
