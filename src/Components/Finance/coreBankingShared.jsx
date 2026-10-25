import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchPicker } from "@/Components/Common/SearchPicker";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { coreBankingApi, tellerApi } from "@/Services/Accounting/accounting.api";
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
export const branchOptions = (setup, { openOnly = false } = {}) =>
  (setup?.branches ?? [])
    .filter((b) => !openOnly || b.status !== "CLOSED")
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
