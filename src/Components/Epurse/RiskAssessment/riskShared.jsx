import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOwnershipTypes, usePartyTypes } from "@/Hooks/Master/masterHooks";
import { corpMasterApis, masterApis, rowsOf } from "@/Services/Epurse/onboarding.api";
import { corporateRiskApi, individualRiskApi } from "@/Services/Epurse/risk.api";

// What differs between Individual Risk (menu 97) and Corporate Risk (98):
// the API, the menu name and the customer-type fields. Everything else —
// criteria, levels, test score — is the same screen.
export const RISK_KINDS = {
  individual: {
    api: individualRiskApi,
    menuName: "Individual Risk",
    titleKey: "individualTitle",
    subtitleKey: "individualSubtitle",
    typeFields: ["party_type_id", "ownership_id", "ownership_sub_type_id"],
    requiredTypeFields: ["party_type_id", "ownership_id"],
  },
  corporate: {
    api: corporateRiskApi,
    menuName: "Corporate Risk",
    titleKey: "corporateTitle",
    subtitleKey: "corporateSubtitle",
    typeFields: ["party_type_id", "company_type_id"],
    requiredTypeFields: ["party_type_id", "company_type_id"],
  },
};

// Active rows of a lifecycle master, keeping every column (sub types need
// their ownership_id to be filtered by the chosen ownership).
function useActiveRows(lifecycle, enabled) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!enabled) return;
    lifecycle
      .list({ page: 1, limit: 200 })
      .then((r) => setRows(rowsOf(r).filter((row) => Number(row.status) === 1)))
      .catch(() => setRows([]));
  }, [lifecycle, enabled]);
  return rows;
}

// Picker options for each customer-type field of a kind.
export function useCustomerTypeOptions(kind) {
  const individual = kind === "individual";
  const { partyTypes = [] } = usePartyTypes(true);
  const { ownershipTypes = [] } = useOwnershipTypes(individual);
  const subTypes = useActiveRows(masterApis.ownership_sub_type, individual);
  const companyTypes = useActiveRows(corpMasterApis.corp_company_type, !individual);
  return { partyTypes, ownershipTypes, subTypes, companyTypes };
}

// "Customer × Individual › Student" / "Customer × Private company" for a row.
export function customerTypeLabel(row) {
  const base = [row.party_type_name, row.ownership_name ?? row.company_type_name].filter(Boolean).join(" × ");
  return row.ownership_sub_type_name ? `${base} › ${row.ownership_sub_type_name}` : base || "-";
}

// A level's colour dot + name, as the lists and the test panel show it.
export function LevelChip({ level }) {
  if (!level) return "-";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold">
      <span className="h-2.5 w-2.5 rounded-full border" style={{ background: level.color_code || "transparent" }} />
      {level.name ?? level.code}
    </span>
  );
}

// The 0–100 band the levels cover, one coloured segment per level.
export function LevelBar({ levels }) {
  const { t } = useTranslation("risk");
  const sorted = [...(levels ?? [])].sort((a, b) => Number(a.min_score) - Number(b.min_score));
  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  // 0, every boundary, and the end — each tick sits under its own position.
  const ticks = [...new Set([0, ...sorted.map((l) => clamp(l.max_score))])];
  return (
    <div>
      <div className="flex h-6 gap-0.5 overflow-hidden rounded-lg bg-muted" aria-label={t("levelsCoverage")}>
        {sorted.map((l, i) => {
          const width = Math.max(0, clamp(l.max_score) - clamp(l.min_score));
          return (
            <span
              key={i}
              title={`${l.name || l.code}: ${l.min_score}–${l.max_score}`}
              style={{ width: `${width}%`, background: l.color_code || "var(--muted-foreground)" }}
              className="flex h-full min-w-0 items-center justify-center truncate px-1 text-[10px] font-bold text-white [text-shadow:0_1px_1px_rgb(0_0_0/0.35)]"
            >
              {width >= 12 ? l.name || l.code : ""}
            </span>
          );
        })}
      </div>
      <div className="relative mt-1 h-3 text-[10px] tabular-nums text-muted-foreground">
        {ticks.map((n) => (
          <span key={n} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${n}%` }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

// The per-criterion breakdown of a score ({field_code, value_id, score,
// weight, points}), named from the setup's `options` (see useRiskOptions).
// value_id 0 means the customer gave no answer for that field.
export function RiskPointsTable({ points, risk }) {
  const { t } = useTranslation("risk");
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="font-semibold">{t("criterion")}</th>
          <th className="text-right font-semibold">{t("scoreCol")}</th>
          <th className="text-right font-semibold">{t("weight")}</th>
          <th className="text-right font-semibold">{t("points")}</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {(points ?? []).map((p) => (
          <tr key={p.field_code}>
            <td className="py-0.5">
              {risk.fieldName(p.field_code)}
              {p.value_id != null && <span className="text-muted-foreground"> · {p.value_id === 0 ? t("noAnswer") : risk.valueName(p.field_code, p.value_id)}</span>}
            </td>
            <td className="text-right">{p.score}</td>
            <td className="text-right">{p.weight}%</td>
            <td className="text-right font-bold">{p.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Weights are decimals; keep sums free of float noise (33.3 + 33.3 + 33.4).
export const round2 = (n) => Math.round(Number(n) * 100) / 100;
