import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Send, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { MenuLink } from "@/Components/Common/MenuLink";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { coreBankingApi } from "@/Services/Accounting/accounting.api";
import { loanProductsApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import {
  ActionButtons,
  AuditTimeline,
  NarrationDialog,
  Problems,
  Section,
  labelClass,
} from "../../Deposits/depositShared";
import { Field, RowsEditor, Tabs, useInstitutionScope } from "../../Loans/loanShared";
import { GlMultiPick, glLabel, useAllGls } from "../../coreBankingShared";
import { actorText } from "@/Utils/Lib/actor";

const TABS = ["branches", "staff", "teller", "treasury", "withholding_tax", "ecl", "credit_bureau", "accounting"];
const STAGES = [1, 2, 3];
const CASH_FLOW_LISTS = ["cash_gl_ids", "investing_gl_ids", "financing_gl_ids"];
const BALANCE_SHEET = ["ASSET", "LIABILITY", "EQUITY"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const blankStages = () => STAGES.map(() => ({ pd: "", lgd: "" }));

// The setup as the server takes it: amounts and percents as strings, days
// and ids as numbers. Every section is sent (a list sent replaces it whole).
const toBody = (s) => ({
  branches: s.branches.map((b) => ({
    code: b.code,
    name: String(b.name ?? "").trim(),
    address: String(b.address ?? "").trim(),
    // "" a branch; a head office is OPERATIONAL or ADMINISTRATIVE (no counters,
    // cash or loans there). The server sets head_office from it.
    head_office_type: b.head_office_type ?? "",
    // The most cash the branch may hold (tills and vaults, base currency);
    // above it the branch can't close its day. "0": no limit.
    cash_holding_limit: String(b.cash_holding_limit || "0"),
    status: b.status || "OPEN",
  })),
  staff: s.staff.map((r) => ({
    user_id: Number(r.user_id),
    branch_code: r.branch_code,
    loan_officer: Boolean(r.loan_officer),
    teller: Boolean(r.teller),
    vault_custodian: Boolean(r.vault_custodian),
    // Sees only their branch's accounts, applications and loans.
    own_branch_only: Boolean(r.own_branch_only),
  })),
  // The chart-of-accounts groups every till's and vault's GL sits under.
  teller: {
    till_cash_gl_id: Number(s.teller?.till_cash_gl_id) || 0,
    vault_cash_gl_id: Number(s.teller?.vault_cash_gl_id) || 0,
  },
  withholding_tax: {
    ...s.withholding_tax,
    enabled: Boolean(s.withholding_tax.enabled),
    deposit_rate: s.withholding_tax.deposit_rate || "0",
    wallet_rate: s.withholding_tax.wallet_rate || "0",
    exempt_below: s.withholding_tax.exempt_below || "0",
  },
  ecl: {
    enabled: Boolean(s.ecl.enabled),
    stage2_days: Number(s.ecl.stage2_days) || 0,
    stage3_days: Number(s.ecl.stage3_days) || 0,
    restructured_stage2: Boolean(s.ecl.restructured_stage2),
    stages: s.ecl.stages.map((x) => ({ pd: x.pd || "0", lgd: x.lgd || "0" })),
    products: s.ecl.products.map((p) => ({
      loan_product_id: Number(p.loan_product_id),
      stages: p.stages.map((x) => ({ pd: x.pd || "0", lgd: x.lgd || "0" })),
    })),
  },
  credit_bureau: {
    ...s.credit_bureau,
    enabled: Boolean(s.credit_bureau.enabled),
    minimum_score: Number(s.credit_bureau.minimum_score) || 0,
    valid_days: Number(s.credit_bureau.valid_days) || 0,
    required_for_approval: Boolean(s.credit_bureau.required_for_approval),
  },
  accounting: {
    fiscal_year_end_month: Number(s.accounting.fiscal_year_end_month) || 12,
    // What the cash flow statement counts as cash, investing and financing.
    ...Object.fromEntries(CASH_FLOW_LISTS.map((k) => [k, (s.accounting[k] ?? []).map(Number)])),
  },
  treasury: {
    inter_branch_suspense: Boolean(s.treasury?.inter_branch_suspense),
    counterparties: (s.treasury?.counterparties ?? []).map((c) => ({
      code: c.code,
      name: String(c.name ?? "").trim(),
      kind: c.kind,
      gl_account_id: Number(c.gl_account_id) || 0,
      obligation_gl_ids: (c.obligation_gl_ids ?? []).map(Number),
      minimum_balance: String(c.minimum_balance || "0"),
    })),
  },
});

// Checked before proposing: one head office, codes once, staff once each at
// an open branch, stage 3 after stage 2, an https:// bureau URL.
function setupProblem(t, s) {
  const codes = s.branches.map((b) => b.code);
  if (s.branches.some((b) => !b.code || !String(b.name ?? "").trim()))
    return t("branchNeedsCodeName");
  if (new Set(codes).size !== codes.length) return t("branchCodeOnce");
  // At least one head office; at most one of each type.
  const types = s.branches.map((b) => b.head_office_type).filter(Boolean);
  if (s.branches.length && !types.length) return t("oneHeadOffice");
  if (new Set(types).size !== types.length) return t("headOfficeTypeOnce");
  const open = new Set(s.branches.filter((b) => b.status !== "CLOSED").map((b) => b.code));
  if (s.staff.some((r) => !r.user_id || !open.has(r.branch_code))) return t("staffNeedsOpenBranch");
  const admin = s.branches.find((b) => b.head_office_type === "ADMINISTRATIVE")?.code;
  if (admin && s.staff.some((r) => r.branch_code === admin && (r.teller || r.vault_custodian || r.loan_officer))) return t("adminOfficeNoRoles");
  if (new Set(s.staff.map((r) => String(r.user_id))).size !== s.staff.length) return t("staffOnce");
  if (s.ecl.enabled && Number(s.ecl.stage3_days) <= Number(s.ecl.stage2_days))
    return t("stage3AfterStage2");
  if (s.ecl.products.some((p) => !p.loan_product_id)) return t("eclProductMissing");
  const cb = s.credit_bureau;
  if (
    cb.enabled &&
    cb.provider === "HTTP" &&
    (!/^https:\/\//.test(cb.url ?? "") || !cb.api_key_env)
  )
    return t("bureauHttpNeeds");
  return "";
}

// SETTINGS > Core Banking Setup (menu 193): the institution's branches,
// staff, withholding tax, IFRS 9 expected credit loss, credit bureau and
// fiscal year, one document under maker-checker (like the Lending
// Regulatory Profile). Self applies a change at once.
export function CoreBankingSetup() {
  const { t } = useTranslation(["corebank", "loans"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState("branches");
  // With a change waiting: show the proposal or what is in effect.
  const [showPending, setShowPending] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (chooser && !institution) return;
    try {
      setData(recordOf(await coreBankingApi.get(scope())));
    } catch (e) {
      setData({ missing: true });
      notifications.error(e.message);
    }
  }, [chooser, institution, scope]);
  useEffect(() => {
    setData(null);
    setForm(null);
    void load();
  }, [load]);
  // Loan products, for the per-product ECL overrides.
  useEffect(() => {
    if (chooser && !institution) return;
    loanProductsApi
      .list(scope({ limit: 200 }))
      .then((r) =>
        setProducts(
          (Array.isArray(r?.data) ? r.data : []).map((p) => ({
            value: String(p.id),
            label: [p.code ?? p.product_code, p.name ?? p.product_name].filter(Boolean).join(" · "),
          })),
        ),
      )
      .catch(() => setProducts([]));
  }, [chooser, institution, scope]);

  const act = async (verb, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const response = await coreBankingApi[verb](scope(body));
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      setForm(null);
      await load();
    } catch (e) {
      setDialog(null);
      if (verb === "edit") setError(e.message);
      else notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  // A saved branch keeps its code (branches are matched by code).
  const startEdit = () => {
    const s = structuredClone(pending ?? data.setup);
    setForm({ ...s, branches: s.branches.map((b) => ({ ...b, head_office_type: b.head_office_type ?? (b.head_office ? "OPERATIONAL" : ""), _saved: true })) });
    setError("");
  };
  const a = data?.actions ?? {};
  const pending = data?.pending?.setup ?? null;
  const shown = form ?? (pending && showPending ? pending : data?.setup);
  const problem = form ? setupProblem(t, form) : "";
  const editing = Boolean(form);
  const users = (data?.users ?? []).map((u) => ({ value: String(u.id), label: u.name }));
  const adminOffice = (shown?.branches ?? []).find((b) => b.head_office_type === "ADMINISTRATIVE")?.code;
  const branchCodes = (shown?.branches ?? [])
    .filter((b) => b.status !== "CLOSED")
    .map((b) => ({ value: b.code, label: `${b.code} · ${b.name}` }));
  const set = (section) => (patch) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], ...patch } }));
  const counts = { branches: shown?.branches?.length, staff: shown?.staff?.length };
  // The chart, for the cash flow and treasury GL pickers.
  const gls = useAllGls(tab === "accounting" || tab === "treasury");

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{t("title")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {data && !data.missing && !form && (
          <ActionButtons
            busy={busy}
            buttons={[
              a.edit &&
                can("Edit") && {
                  key: "edit",
                  label: t("loans:edit"),
                  icon: Pencil,
                  run: () => startEdit(),
                },
              a.deauth &&
                can("Authorize") && {
                  key: "deauth",
                  label: t("loans:reject"),
                  icon: XCircle,
                  variant: "danger",
                  run: () => setDialog("deauth"),
                },
              a.auth &&
                can("Authorize") && {
                  key: "auth",
                  label: t("loans:approve"),
                  icon: CheckCircle2,
                  variant: "primary",
                  run: () => setDialog("auth"),
                },
            ]}
          />
        )}
      </div>

      {chooser && !institution ? null : !data ? (
        <PageSkeleton />
      ) : data.missing ? null : (
        <div className="grid gap-4">
          {pending && !form && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <span>
                {t("pendingBy", {
                  name: actorText(data.pending, "proposed_by", "—"),
                  date: accountDate(data.pending.proposed_at),
                })}
              </span>
              <Toggle
                showLabel
                label={t("showProposed")}
                checked={showPending}
                onChange={setShowPending}
              />
            </div>
          )}
          <div>
            <Tabs
              tabs={TABS.map((key) => ({ key, count: counts[key] }))}
              value={tab}
              onChange={setTab}
              labelOf={(k) => t(`tab_${k}`)}
            />
            {tab === "branches" && (
              <Section title={t("tab_branches")}>
                <p className="mb-1 text-xs text-muted-foreground">{t("branchesHint")}</p>
                <p className="mb-3 text-xs text-muted-foreground">{t("headOfficeTypesHint")}</p>
                <RowsEditor
                  rows={shown.branches ?? []}
                  disabled={!editing}
                  onChange={(branches) => setForm((f) => ({ ...f, branches }))}
                  blank={() => ({
                    code: "",
                    name: "",
                    address: "",
                    head_office_type: form.branches.length ? "" : "OPERATIONAL",
                    cash_holding_limit: "0",
                    status: "OPEN",
                  })}
                  addLabel={t("addBranch")}
                  columns="lg:grid-cols-6"
                  fields={[
                    { key: "code", label: t("code"), type: "code", disabledIf: (r) => r._saved },
                    { key: "name", label: t("name") },
                    { key: "address", label: t("address") },
                    {
                      key: "status",
                      label: t("status"),
                      type: "select",
                      options: data.options?.branch_statuses ?? ["OPEN", "CLOSED"],
                    },
                    {
                      key: "head_office_type",
                      label: t("branchType"),
                      type: "select",
                      options: [
                        { value: "", label: t("typeBranch") },
                        { value: "OPERATIONAL", label: t("typeOperational") },
                        { value: "ADMINISTRATIVE", label: t("typeAdministrative") },
                      ],
                    },
                    { key: "cash_holding_limit", label: t("cashHoldingLimit"), type: "amount", disabledIf: (r) => r.head_office_type === "ADMINISTRATIVE" },
                  ]}
                />
              </Section>
            )}
            {tab === "staff" && (
              <Section title={t("tab_staff")}>
                <p className="mb-1 text-xs text-muted-foreground">{t("staffHint")}</p>
                <p className="mb-3 text-xs text-muted-foreground">{t("vaultCustodianHint")}</p>
                <RowsEditor
                  rows={(shown.staff ?? []).map((r) => ({
                    ...r,
                    user_id: r.user_id ? String(r.user_id) : "",
                  }))}
                  disabled={!editing}
                  onChange={(staff) => setForm((f) => ({ ...f, staff }))}
                  blank={() => ({
                    user_id: "",
                    branch_code: "",
                    loan_officer: false,
                    teller: false,
                    vault_custodian: false,
                  })}
                  addLabel={t("addStaff")}
                  fields={[
                    {
                      key: "user_id",
                      label: t("user"),
                      type: "select",
                      blank: t("choose"),
                      options: editing
                        ? users
                        : [
                            ...users,
                            ...(shown.staff ?? [])
                              .filter((r) => !users.some((u) => u.value === String(r.user_id)))
                              .map((r) => ({ value: String(r.user_id), label: r.user_name })),
                          ],
                    },
                    {
                      key: "branch_code",
                      label: t("branch"),
                      type: "select",
                      blank: t("choose"),
                      options: branchCodes,
                    },
                    // No counters, cash or loans at the administrative head office.
                    { key: "loan_officer", label: t("loanOfficer"), type: "bool", disabledIf: (r) => r.branch_code === adminOffice },
                    { key: "teller", label: t("teller"), type: "bool", disabledIf: (r) => r.branch_code === adminOffice },
                    { key: "vault_custodian", label: t("vaultCustodian"), type: "bool", disabledIf: (r) => r.branch_code === adminOffice },
                    { key: "own_branch_only", label: t("ownBranchOnly"), type: "bool" },
                  ]}
                />
                <p className="mt-2 text-xs text-muted-foreground">{t("ownBranchOnlyHint")}</p>
                <StaffTransfers rows={data.staff_history ?? []} />
              </Section>
            )}
            {tab === "teller" && (
              <Section title={t("tab_teller")}>
                <p className="mb-3 text-xs text-muted-foreground">{t("tellerGlHint")}</p>
                {!(data.gl_parents ?? []).length && (
                  <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                    {t("noAssetGroups")} <MenuLink slug="chartofaccounts" label={t("openChartOfAccounts")} />
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {["till_cash_gl_id", "vault_cash_gl_id"].map((key) => (
                    <label key={key} className={labelClass}>
                      {t(`gl_${key}`)}
                      <Field
                        field={{
                          type: "select",
                          blank: t("notSet"),
                          options: (data.gl_parents ?? []).map((g) => ({
                            value: String(g.id),
                            label: [g.gl_code, g.name].filter(Boolean).join(" · "),
                          })),
                        }}
                        disabled={!editing}
                        value={Number(shown.teller?.[key]) ? String(shown.teller[key]) : ""}
                        onChange={(v) => set("teller")({ [key]: v })}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{t("countsMustMatch")}</p>
              </Section>
            )}
            {tab === "withholding_tax" && (
              <Section title={t("tab_withholding_tax")}>
                <p className="mb-3 text-xs text-muted-foreground">{t("whtHint")}</p>
                <Toggle
                  showLabel
                  label={t("whtEnabled")}
                  disabled={!editing}
                  checked={Boolean(shown.withholding_tax?.enabled)}
                  onChange={(v) => set("withholding_tax")({ enabled: v })}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    ["deposit_rate", "percent"],
                    ["wallet_rate", "percent"],
                    ["exempt_below", "amount"],
                  ].map(([key, type]) => (
                    <label key={key} className={labelClass}>
                      {t(`wht_${key}`)}
                      <Field
                        field={{ type }}
                        disabled={!editing}
                        value={shown.withholding_tax?.[key]}
                        onChange={(v) => set("withholding_tax")({ [key]: v })}
                      />
                    </label>
                  ))}
                </div>
              </Section>
            )}
            {tab === "ecl" && (
              <Section title={t("tab_ecl")}>
                <p className="mb-3 text-xs text-muted-foreground">{t("eclHint")}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Toggle
                    showLabel
                    label={t("eclEnabled")}
                    disabled={!editing}
                    checked={Boolean(shown.ecl?.enabled)}
                    onChange={(v) => set("ecl")({ enabled: v })}
                  />
                  <Toggle
                    showLabel
                    label={t("restructuredStage2")}
                    disabled={!editing}
                    checked={Boolean(shown.ecl?.restructured_stage2)}
                    onChange={(v) => set("ecl")({ restructured_stage2: v })}
                  />
                  {["stage2_days", "stage3_days"].map((key) => (
                    <label key={key} className={labelClass}>
                      {t(key)}
                      <Field
                        field={{ type: "int" }}
                        disabled={!editing}
                        value={String(shown.ecl?.[key] ?? "")}
                        onChange={(v) => set("ecl")({ [key]: v })}
                      />
                    </label>
                  ))}
                </div>
                <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("eclDefaults")}
                </h3>
                <StageGrid
                  stages={shown.ecl?.stages ?? blankStages()}
                  disabled={!editing}
                  onChange={(stages) => set("ecl")({ stages })}
                />
                <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("eclProducts")}
                </h3>
                <RowsEditor
                  rows={(shown.ecl?.products ?? []).map((p) => ({
                    ...p,
                    loan_product_id: p.loan_product_id ? String(p.loan_product_id) : "",
                  }))}
                  disabled={!editing}
                  onChange={(list) => set("ecl")({ products: list })}
                  blank={() => ({ loan_product_id: "", stages: structuredClone(form.ecl.stages) })}
                  addLabel={t("addProductOverride")}
                  columns="lg:grid-cols-2"
                  fields={[
                    {
                      key: "loan_product_id",
                      label: t("loanProduct"),
                      type: "select",
                      blank: t("choose"),
                      options: products,
                    },
                  ]}
                  renderExtra={(row, patch) => (
                    <div className="mt-3">
                      <StageGrid
                        stages={row.stages ?? blankStages()}
                        disabled={!editing}
                        onChange={(stages) => patch({ stages })}
                      />
                    </div>
                  )}
                />
              </Section>
            )}
            {tab === "credit_bureau" && (
              <Section title={t("tab_credit_bureau")}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Toggle
                    showLabel
                    label={t("bureauEnabled")}
                    disabled={!editing}
                    checked={Boolean(shown.credit_bureau?.enabled)}
                    onChange={(v) => set("credit_bureau")({ enabled: v })}
                  />
                  <Toggle
                    showLabel
                    label={t("requiredForApproval")}
                    disabled={!editing}
                    checked={Boolean(shown.credit_bureau?.required_for_approval)}
                    onChange={(v) => set("credit_bureau")({ required_for_approval: v })}
                  />
                  <label className={labelClass}>
                    {t("provider")}
                    <Field
                      field={{
                        type: "select",
                        options: data.options?.bureau_providers ?? ["SIMULATOR", "HTTP"],
                      }}
                      disabled={!editing}
                      value={shown.credit_bureau?.provider}
                      onChange={(v) => set("credit_bureau")({ provider: v })}
                    />
                  </label>
                  <label className={labelClass}>
                    {t("memberCode")}
                    <Field
                      field={{}}
                      disabled={!editing}
                      value={shown.credit_bureau?.member_code}
                      onChange={(v) => set("credit_bureau")({ member_code: v })}
                    />
                  </label>
                  <label className={labelClass}>
                    {t("minimumScore")}
                    <Field
                      field={{ type: "int" }}
                      disabled={!editing}
                      value={String(shown.credit_bureau?.minimum_score ?? "")}
                      onChange={(v) => set("credit_bureau")({ minimum_score: v })}
                    />
                  </label>
                  <label className={labelClass}>
                    {t("validDays")}
                    <Field
                      field={{ type: "int" }}
                      disabled={!editing}
                      value={String(shown.credit_bureau?.valid_days ?? "")}
                      onChange={(v) => set("credit_bureau")({ valid_days: v })}
                    />
                  </label>
                </div>
                {shown.credit_bureau?.provider === "HTTP" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>
                      {t("bureauUrl")}
                      <Field
                        field={{ placeholder: "https://" }}
                        disabled={!editing}
                        value={shown.credit_bureau?.url}
                        onChange={(v) => set("credit_bureau")({ url: v.trim() })}
                      />
                    </label>
                    <label className={labelClass}>
                      {t("apiKeyEnv")}
                      <Field
                        field={{ placeholder: "BUREAU_API_KEY" }}
                        disabled={!editing}
                        value={shown.credit_bureau?.api_key_env}
                        onChange={(v) =>
                          set("credit_bureau")({
                            api_key_env: v.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                          })
                        }
                      />
                      <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                        {t("apiKeyEnvHint")}
                      </span>
                    </label>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    {t("simulatorHint")}
                  </p>
                )}
              </Section>
            )}
            {tab === "accounting" && (
              <Section title={t("tab_accounting")}>
                <label className={`${labelClass} block max-w-xs`}>
                  {t("fiscalYearEnd")}
                  <Field
                    field={{
                      type: "select",
                      options: MONTHS.map((m) => ({
                        value: String(m),
                        label: new Date(2000, m - 1, 1).toLocaleString(undefined, {
                          month: "long",
                        }),
                      })),
                    }}
                    disabled={!editing}
                    value={String(shown.accounting?.fiscal_year_end_month ?? 12)}
                    onChange={(v) => set("accounting")({ fiscal_year_end_month: v })}
                  />
                </label>
                <p className="mb-2 mt-5 text-sm font-bold">{t("cashFlowGls")}</p>
                <p className="mb-3 text-xs text-muted-foreground">{t("cashFlowHint")}</p>
                <div className="grid gap-3 lg:grid-cols-3">
                  {CASH_FLOW_LISTS.map((key) => (
                    <div key={key} className={labelClass}>
                      {t(`cf_${key}`)}
                      <GlMultiPick
                        gls={(gls ?? []).filter((g) => BALANCE_SHEET.includes(g.gl_type))}
                        disabled={!editing}
                        value={shown.accounting?.[key] ?? []}
                        onChange={(ids) => set("accounting")({ [key]: ids })}
                      />
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {tab === "treasury" && (
              <Section title={t("tab_treasury")}>
                <Toggle
                  showLabel
                  label={t("interBranchSuspense")}
                  disabled={!editing}
                  checked={Boolean(shown.treasury?.inter_branch_suspense)}
                  onChange={(v) => set("treasury")({ inter_branch_suspense: v })}
                />
                <p className="mb-4 mt-1 text-xs text-muted-foreground">{t("interBranchSuspenseHint")}</p>
                <p className="mb-1 text-sm font-bold">{t("counterparties")}</p>
                <p className="mb-3 text-xs text-muted-foreground">{t("counterpartiesHint")}</p>
                <RowsEditor
                  rows={(shown.treasury?.counterparties ?? []).map((c) => ({
                    ...c,
                    gl_account_id: Number(c.gl_account_id) ? String(c.gl_account_id) : "",
                    minimum_balance: String(c.minimum_balance ?? ""),
                  }))}
                  disabled={!editing}
                  onChange={(counterparties) => set("treasury")({ counterparties })}
                  blank={() => ({ code: "", name: "", kind: "CENTRAL_BANK", gl_account_id: "", obligation_gl_ids: [], minimum_balance: "0" })}
                  addLabel={t("addCounterparty")}
                  columns="lg:grid-cols-5"
                  fields={[
                    { key: "code", label: t("code"), type: "code" },
                    { key: "name", label: t("name") },
                    {
                      key: "kind",
                      label: t("cpKind"),
                      type: "select",
                      options: (data.options?.counterparty_kinds ?? ["CENTRAL_BANK", "SETTLEMENT_BANK", "CORRESPONDENT"]).map((k) => ({ value: k, label: t(`cpKind_${k}`) })),
                    },
                    {
                      key: "gl_account_id",
                      label: t("nostroGl"),
                      type: "select",
                      blank: t("choose"),
                      options: (gls ?? []).filter((g) => g.is_account && g.gl_type === "ASSET").map((g) => ({ value: String(g.id), label: glLabel(g) })),
                    },
                    { key: "minimum_balance", label: t("minimumBalance"), type: "amount" },
                  ]}
                  renderExtra={(row, patch) => (
                    <div className={`${labelClass} mt-2 block`}>
                      {t("obligationGls")}
                      <GlMultiPick gls={(gls ?? []).filter((g) => g.is_account)} disabled={!editing} value={row.obligation_gl_ids ?? []} onChange={(ids) => patch({ obligation_gl_ids: ids })} />
                    </div>
                  )}
                />
              </Section>
            )}
          </div>

          {form ? (
            <>
              {problem && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {problem}
                </p>
              )}
              {error && <Problems message={error} />}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setForm(null)}>
                  {t("loans:cancel")}
                </Button>
                <Button icon={Send} disabled={Boolean(problem)} onClick={() => setDialog("edit")}>
                  {t("loans:proposeChanges")}
                </Button>
              </div>
            </>
          ) : (
            <Section title={t("loans:history")}>
              <AuditTimeline audit={data.history ?? []} />
            </Section>
          )}
        </div>
      )}

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(
            dialog === "auth"
              ? "loans:approve"
              : dialog === "deauth"
                ? "loans:reject"
                : "loans:proposeChanges",
          )}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) =>
            act(dialog, {
              ...(dialog === "edit" ? toBody(form) : {}),
              ...(narration ? { narration } : {}),
            })
          }
        />
      )}
    </div>
  );
}

// PD / LGD per stage, as a 3-row grid (percents).
function StageGrid({ stages, disabled, onChange }) {
  const { t } = useTranslation("corebank");
  const set = (i, patch) => onChange(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">{t("stage")}</th>
            <th className="px-3 py-2 text-left">{t("pd")}</th>
            <th className="px-3 py-2 text-left">{t("lgd")}</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-3 py-2 font-bold">{t("stageN", { n: i + 1 })}</td>
              {["pd", "lgd"].map((key) => (
                <td key={key} className="px-3 py-1.5">
                  <Field
                    field={{ type: "percent" }}
                    disabled={disabled}
                    value={s[key]}
                    onChange={(v) => set(i, { [key]: v })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Staff moved between branches (newest first): from where, to where, from when.
function StaffTransfers({ rows }) {
  const { t } = useTranslation("corebank");
  if (!rows.length) return null;
  const sorted = [...rows].sort((x, y) => String(y.effective_from).localeCompare(String(x.effective_from)));
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{t("transfers")}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="border-b border-border text-left text-[10px] font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("user")}</th>
              <th className="px-3 py-2">{t("fromBranch")}</th>
              <th className="px-3 py-2">{t("toBranch")}</th>
              <th className="px-3 py-2">{t("effectiveFrom")}</th>
              <th className="px-3 py-2">{t("changedBy")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-1.5 font-semibold">{r.user_name}</td>
                <td className="px-3 py-1.5">{r.from_branch || t("firstAttachment")}</td>
                <td className="px-3 py-1.5">{r.to_branch || t("removedFromBranch")}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{accountDate(r.effective_from)}</td>
                <td className="px-3 py-1.5">{r.changed_by ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
