import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchPicker } from "@/Components/Common/SearchPicker";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { X } from "lucide-react";
import { listPage } from "@/Hooks/useServerList";
import { coreBankingApi, glAccountsApi, tellerApi } from "@/Services/Accounting/accounting.api";
import { cn } from "@/Utils/Lib/utils";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { loanFacilitiesApi, recordOf } from "@/Services/Loans/loans.api";

// Shared by the core banking screens (Teller, Borrower Groups, loans, liens,
// trial balance): the institution's branches and staff from Core Banking
// Setup, and pickers for a customer account and a loan facility.

// { branches: [{ id, code, name, status }], staff, users, loanOfficers }
// of the setup in effect; null while loading. `scope` adds the institution.
export function useCoreBanking(scope, enabled = true) {
  const [setup, setSetup] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    coreBankingApi
      .get(scope())
      .then((r) => {
        const d = recordOf(r) ?? {};
        const staff = d.setup?.staff ?? [];
        if (current)
          setSetup({
            branches: d.branches ?? [],
            staff,
            users: d.users ?? [],
            loanOfficers: staff.filter((s) => s.loan_officer),
          });
      })
      .catch(() => current && setSetup({ branches: [], staff: [], users: [], loanOfficers: [] }));
    return () => {
      current = false;
    };
  }, [scope, enabled]);
  return setup;
}

// Branch options for a select: open branches first ({ value: id, label }).
// `operational`: without the administrative head office (no tills, vaults or wallets there).
export const branchOptions = (setup, { openOnly = false, operational = false } = {}) =>
  (setup?.branches ?? [])
    .filter((b) => !openOnly || b.status !== "CLOSED")
    .filter((b) => !operational || b.head_office_type !== "ADMINISTRATIVE")
    .map((b) => ({ value: String(b.id), label: `${b.code} · ${b.name}` }));

// Loan officer options ({ value: user_id, label: name · branch }).
export const officerOptions = (setup) =>
  (setup?.loanOfficers ?? []).map((s) => ({
    value: String(s.user_id),
    label: [s.user_name, s.branch_code].filter(Boolean).join(" · "),
  }));

// The tills open now (a teller is working them), as select options; for
// payments made at a till ({ source: "TILL", till_id }).
export function useOpenTills(scope, enabled = true) {
  const [tills, setTills] = useState([]);
  useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    tellerApi
      .list(scope({ kind: "TILL", status: "ACTIVE", limit: 100 }))
      .then(
        (r) =>
          current &&
          setTills(
            (Array.isArray(r?.data) ? r.data : [])
              .filter((x) => x.session)
              .map((x) => ({ value: String(x.id), label: `${x.code} · ${x.name}` })),
          ),
      )
      .catch(() => current && setTills([]));
    return () => {
      current = false;
    };
  }, [scope, enabled]);
  return tills;
}

// A slip reference: 1-40 of A-Z a-z 0-9 . _ / -
export const slipReference = (v) =>
  String(v)
    .replace(/[^A-Za-z0-9._/-]/g, "")
    .slice(0, 40);

// A customer account by number or holder's name (its id is what the calls take).
export function AccountPick({ value, onChange, scope, filter }) {
  const { t } = useTranslation("corebank");
  return (
    <SearchPicker
      value={value}
      onChange={onChange}
      placeholder={t("searchAccount")}
      empty={t("noAccountFound")}
      search={(search) =>
        accountsApi
          .list(scope({ search, limit: 20 }))
          .then((r) => (Array.isArray(r?.data) ? r.data : []).filter((a) => !filter || filter(a)))
      }
      renderItem={(a) => (
        <>
          <b className="font-mono">{a.acct_num}</b> · {a.owner?.name ?? "—"}
          <span className="block truncate text-[10px] text-muted-foreground">
            {[a.acct_product_name, a.wallet_purpose, money(a.avail_bal, a.currency_code)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </>
      )}
    />
  );
}

// A loan facility by its number or the borrower's name.
export function FacilityPick({ value, onChange, scope }) {
  const { t } = useTranslation("corebank");
  return (
    <SearchPicker
      value={value}
      onChange={onChange}
      placeholder={t("searchFacility")}
      empty={t("noFacilityFound")}
      search={(search) =>
        loanFacilitiesApi
          .list(scope({ search, limit: 20 }))
          .then((r) => (Array.isArray(r?.data) ? r.data : []))
      }
      renderItem={(f) => (
        <>
          <b className="font-mono">{f.facility_number}</b> · {f.owner?.name ?? "—"}
          <span className="block truncate text-[10px] text-muted-foreground">
            {[
              f.loan_product_name,
              f.status_name ?? f.status,
              f.days_past_due ? t("dpd", { days: f.days_past_due }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </>
      )}
    />
  );
}

// Every live GL of the chart (groups and accounts), read once when asked.
export function useAllGls(enabled = true) {
  const [gls, setGls] = useState(null);
  useEffect(() => {
    if (!enabled || gls) return undefined;
    let cancelled = false;
    (async () => {
      const all = [];
      for (let page = 1; ; page += 1) {
        const row = listPage(await glAccountsApi.list({ status: 1, page, limit: 500 }));
        all.push(...row.items);
        if (!row.items.length || all.length >= row.total) break;
      }
      if (!cancelled) setGls(all);
    })().catch(() => !cancelled && setGls([]));
    return () => {
      cancelled = true;
    };
  }, [enabled, gls]);
  return gls;
}

export const glLabel = (g) => [g.gl_code || g.account_number, g.name].filter(Boolean).join(" · ");

// Several GLs picked from a long chart: the chosen ones as chips, and a
// search that offers the first matches of `gls`.
export function GlMultiPick({ value, onChange, gls, disabled }) {
  const { t } = useTranslation("corebank");
  const [term, setTerm] = useState("");
  const byId = useMemo(() => new Map((gls ?? []).map((g) => [g.id, g])), [gls]);
  const chosen = (value ?? []).map(Number);
  const matches = term.trim()
    ? (gls ?? []).filter((g) => !chosen.includes(g.id) && glLabel(g).toLowerCase().includes(term.trim().toLowerCase())).slice(0, 12)
    : [];
  return (
    <div className="mt-1.5 grid gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {chosen.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-foreground">
            {byId.get(id) ? glLabel(byId.get(id)) : `#${id}`}
            {!disabled && (
              <button type="button" aria-label={t("remove")} onClick={() => onChange(chosen.filter((x) => x !== id))} className="text-muted-foreground hover:text-red-600">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {!chosen.length && <span className="text-xs text-muted-foreground">{t("noneChosen")}</span>}
      </div>
      {!disabled && (
        <div className="relative">
          <input
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-normal"
            placeholder={gls ? t("searchGl") : "…"}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg">
              {matches.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...chosen, g.id]);
                      setTerm("");
                    }}
                    className={cn("flex w-full justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/50")}
                  >
                    <span>{glLabel(g)}</span>
                    <span className="text-muted-foreground">
                      {g.gl_type} · {t(g.is_account ? "glAccountKind" : "glGroupKind")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
