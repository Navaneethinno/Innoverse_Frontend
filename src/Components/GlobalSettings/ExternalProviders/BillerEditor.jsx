import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowsEditor } from "@/Components/Finance/Loans/loanShared";
import { labelClass } from "@/Components/Finance/Deposits/depositShared";
import { cn } from "@/Utils/Lib/utils";

const BILLER_CATEGORIES = ["TV", "WATER", "INSURANCE", "INSS", "TAX", "UNIVERSITY", "LAM", "GAS", "BETTING", "OTHER"];
const AMOUNT_MODES = ["DUE", "ENTERED", "PRODUCT"];
const FIELD_TYPES = ["TEXT", "NUMBER", "PHONE", "DATE", "NUIT", "PLATE", "SELECT"];

const text = (v) => String(v ?? "").trim();
const key = (v) => text(v).toLowerCase().replace(/[^a-z0-9_]/g, "");
const upper = (v) => text(v).toUpperCase().replace(/[^A-Z0-9_]/g, "");
// A SELECT field's options are typed as "a, b, c".
const optionList = (v) => (Array.isArray(v) ? v : String(v ?? "").split(",")).map(text).filter(Boolean);

// English texts are edited as en_<name> on the row and saved under
// translations.en (handoff 17); other languages already saved are kept.
const en = (row, name) => row?.[`en_${name}`] ?? row?.translations?.en?.[name] ?? "";
function translations(row, names) {
  const english = Object.fromEntries(names.map((n) => [n, n === "option_labels" ? labelsOf(en(row, n), row.options) : text(en(row, n))]).filter(([, v]) => (typeof v === "string" ? v : Object.keys(v).length)));
  const all = { ...(row?.translations ?? {}) };
  if (Object.keys(english).length) all.en = english;
  else delete all.en;
  return Object.keys(all).length ? { translations: all } : {};
}
// Only labels of options the field still has, and not blank.
const labelsOf = (labels, options) => Object.fromEntries(optionList(options).map((o) => [o, text(labels?.[o])]).filter(([, v]) => v));

// The biller object as the server takes it; empty optional parts left out.
export const billerBody = (b) => ({
  category: b?.category ?? "",
  services: (b?.services ?? []).map((s) => ({
    code: upper(s.code),
    name: text(s.name),
    ...translations(s, ["name"]),
    account_types: (s.account_types ?? []).map((a) => ({ key: key(a.key), label: text(a.label), type: a.type || "TEXT", ...(a.required != null ? { required: Boolean(a.required) } : {}), ...translations(a, ["label"]) })),
    ...(s.fields?.length
      ? {
          fields: s.fields.map((f) => ({
            key: key(f.key),
            label: text(f.label),
            type: f.type || "TEXT",
            required: Boolean(f.required),
            ...(f.type === "SELECT" ? { options: optionList(f.options), ...(Object.keys(labelsOf(f.option_labels, f.options)).length ? { option_labels: labelsOf(f.option_labels, f.options) } : {}) } : {}),
            ...translations(f, f.type === "SELECT" ? ["label", "option_labels"] : ["label"]),
            ...(text(f.pattern) ? { pattern: text(f.pattern) } : {}),
          })),
        }
      : {}),
    amount: s.amount || "ENTERED",
    ...(s.amount === "DUE" ? { partial: Boolean(s.partial) } : {}),
    ...(s.amount === "PRODUCT"
      ? {
          products: (s.products ?? []).map((p) => ({
            code: upper(p.code),
            name: text(p.name),
            ...(text(p.option) ? { option: text(p.option) } : {}),
            amount: text(p.amount),
            ...(Number(p.validity_days) ? { validity_days: Number(p.validity_days) } : {}),
            ...translations(p, ["name", "option"]),
          })),
          ...(s.products_after ? { products_after: s.products_after } : {}),
        }
      : {}),
    lookup: s.amount === "DUE" || Boolean(s.lookup),
    token: Boolean(s.token),
  })),
});

// What the screen asks before saving; the server checks the rest and lists
// every problem at once.
export const billerReady = (b) =>
  Boolean(b?.category) &&
  b.services?.length > 0 &&
  b.services.every(
    (s) =>
      upper(s.code) &&
      text(s.name) &&
      s.account_types?.length &&
      s.account_types.every((a) => key(a.key) && text(a.label)) &&
      (s.fields ?? []).every((f) => key(f.key) && text(f.label) && (f.type !== "SELECT" || optionList(f.options).length)) &&
      (s.amount !== "PRODUCT" || (s.products?.length && s.products.every((p) => upper(p.code) && text(p.name) && Number(p.amount) > 0))),
  );

const blankService = () => ({ code: "", name: "", account_types: [{ key: "reference", label: "", type: "TEXT" }], fields: [], amount: "ENTERED", products: [], lookup: false, token: false });

function Part({ title, hint, children }) {
  return (
    <div className="mt-3 border-t border-dashed border-border pt-3">
      <p className={labelClass}>
        {title} {hint && <span className="font-normal text-muted-foreground">· {hint}</span>}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// A SELECT field's options: the code sent to the biller, what it shows as,
// and that in English.
function OptionLabels({ field, onChange }) {
  const { t } = useTranslation("providers");
  const labels = field.option_labels ?? {};
  const english = field.en_option_labels ?? {};
  return (
    <Part title={t("optionLabels")} hint={t("optionLabelsHint")}>
      <div className="grid gap-1.5">
        {optionList(field.options).map((code) => (
          <div key={code} className="grid items-center gap-2 sm:grid-cols-[minmax(6rem,auto)_1fr_1fr]">
            <span className="font-mono text-xs font-bold">{code}</span>
            <input className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm" placeholder={t("optionShownAs")} value={labels[code] ?? ""} onChange={(e) => onChange({ option_labels: { ...labels, [code]: e.target.value } })} />
            <input className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm" placeholder={t("inEnglish", { label: t("optionShownAs") })} value={english[code] ?? ""} onChange={(e) => onChange({ en_option_labels: { ...english, [code]: e.target.value } })} />
          </div>
        ))}
      </div>
    </Part>
  );
}

// A biller's category and services: for each, what the customer types to
// identify the bill, an optional form, and how the amount is set (with the
// products to choose from when it comes from a product).
export function BillerEditor({ biller, onChange }) {
  const { t } = useTranslation("providers");
  const b = biller ?? { category: "", services: [] };
  const sel = (list, prefix) => ({ type: "select", options: list.map((v) => ({ value: v, label: t(`${prefix}${v}`, { defaultValue: v }) })) });
  // The rows with their English texts as en_* inputs.
  const withEn = (rows, names) => (rows ?? []).map((r) => ({ ...r, ...Object.fromEntries(names.map((n) => [`en_${n}`, en(r, n)])) }));
  const english = (name, label) => ({ key: `en_${name}`, label: t("inEnglish", { label }) });
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
      <label className={cn(labelClass, "block max-w-xs")}>
        {t("billerCategory")}
        <FilterSelect className="mt-1" value={b.category ?? ""} onChange={(category) => onChange({ ...b, category })} options={[{ value: "", label: t("choose") }, ...BILLER_CATEGORIES.map((c) => ({ value: c, label: t(`category_${c}`, { defaultValue: c }) }))]} />
      </label>
      <Part title={t("services")} hint={t("servicesHint")}>
        <RowsEditor
          rows={withEn(b.services, ["name"])}
          onChange={(services) => onChange({ ...b, services })}
          blank={blankService}
          addLabel={t("addService")}
          columns="lg:grid-cols-3"
          fields={[
            { key: "code", label: t("fees:code"), placeholder: "SUBSCRIPTION" },
            { key: "name", label: t("fees:name"), placeholder: "Subscription" },
            english("name", t("fees:name")),
            { key: "amount", label: t("amountMode"), ...sel(AMOUNT_MODES, "amount_") },
            { key: "partial", label: t("partial"), type: "bool", showIf: (s) => s.amount === "DUE" },
            { key: "lookup", label: t("lookup"), type: "bool", showIf: (s) => s.amount !== "DUE" },
            { key: "token", label: t("token"), type: "bool" },
          ]}
          renderExtra={(s, patch) => (
            <>
              <Part title={t("accountTypes")} hint={t("accountTypesHint")}>
                <RowsEditor
                  rows={withEn(s.account_types, ["label"])}
                  onChange={(account_types) => patch({ account_types })}
                  blank={() => ({ key: "", label: "", type: "TEXT" })}
                  addLabel={t("addAccountType")}
                  columns="lg:grid-cols-4"
                  fields={[
                    { key: "key", label: t("fieldKey"), placeholder: "card_number" },
                    { key: "label", label: t("fieldLabel"), placeholder: "Card number" },
                    english("label", t("fieldLabel")),
                    { key: "type", label: t("fieldType"), ...sel(FIELD_TYPES.filter((x) => x !== "SELECT"), "fieldType_") },
                  ]}
                />
              </Part>
              <Part title={t("formFields")} hint={t("formFieldsHint")}>
                <RowsEditor
                  rows={withEn(s.fields, ["label", "option_labels"])}
                  onChange={(fields) => patch({ fields })}
                  blank={() => ({ key: "", label: "", type: "TEXT", required: true, options: [], pattern: "" })}
                  addLabel={t("addFormField")}
                  columns="lg:grid-cols-4"
                  fields={[
                    { key: "key", label: t("fieldKey"), placeholder: "plate" },
                    { key: "label", label: t("fieldLabel") },
                    english("label", t("fieldLabel")),
                    { key: "type", label: t("fieldType"), ...sel(FIELD_TYPES, "fieldType_") },
                    { key: "required", label: t("required"), type: "bool" },
                    { key: "options", label: t("selectOptions"), placeholder: "Silver, Gold", showIf: (f) => f.type === "SELECT", span: "sm:col-span-2" },
                    { key: "pattern", label: t("pattern"), placeholder: "^[0-9]{9}$", span: "sm:col-span-2" },
                  ]}
                  renderExtra={(f, patchField) => f.type === "SELECT" && optionList(f.options).length > 0 && <OptionLabels field={f} onChange={patchField} />}
                />
              </Part>
              {s.amount === "PRODUCT" && (
                <Part title={t("billerProducts")}>
                  <label className={cn(labelClass, "mb-2 block max-w-xs")}>
                    {t("productsAfter")}
                    <FilterSelect className="mt-1" value={s.products_after ?? ""} onChange={(products_after) => patch({ products_after })} options={[{ value: "", label: t("productsAfterAll") }, { value: "account", label: t("productsAfterAccount") }, ...(s.fields ?? []).filter((f) => key(f.key)).map((f) => ({ value: key(f.key), label: t("productsAfterField", { field: text(f.label) || key(f.key) }) }))]} />
                  </label>
                  <RowsEditor
                    rows={withEn(s.products, ["name", "option"])}
                    onChange={(products) => patch({ products })}
                    blank={() => ({ code: "", name: "", option: "", amount: "", validity_days: "" })}
                    addLabel={t("addBillerProduct")}
                    columns="lg:grid-cols-4"
                    fields={[
                      { key: "code", label: t("fees:code"), placeholder: "MINI_7D" },
                      { key: "name", label: t("fees:name"), placeholder: "Zap Mini" },
                      english("name", t("fees:name")),
                      { key: "option", label: t("productOption"), placeholder: "7 days" },
                      english("option", t("productOption")),
                      { key: "amount", label: t("price"), type: "amount" },
                      { key: "validity_days", label: t("validityDays"), type: "int" },
                    ]}
                  />
                </Part>
              )}
            </>
          )}
        />
      </Part>
    </div>
  );
}
