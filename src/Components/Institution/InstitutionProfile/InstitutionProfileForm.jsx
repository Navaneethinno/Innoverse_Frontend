import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { blockNegativeKeyDown, blurOnWheel, clampNonNegative } from "@/Utils/Lib/numberInput";

export function institutionId(inst) {
  return inst?.id ?? inst?.inst_id ?? inst?.institution_id;
}

// Shared read-only / editable field renderers used by both
// ViewInstitutionProfile and EditInstitutionProfile — extracted out of the
// old monolithic InstitutionDetailPage.jsx.
export function Field({ label, value }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-700 font-medium">
        {typeof value === "boolean" ? (value ? t("common:yes") : t("common:no")) : (value ?? "—")}
      </p>
    </div>
  );
}
export function EditField({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        onKeyDown={type === "number" ? blockNegativeKeyDown : undefined}
        onWheel={type === "number" ? blurOnWheel : undefined}
        onChange={(e) => onChange?.(type === "number" ? clampNonNegative(e.target.value) : e.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>
  );
}
export function EditSelect({ label, value, onChange, options, placeholder, disabled = false }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      <FilterSelect
        value={value}
        onChange={(next) => onChange?.(next)}
        disabled={disabled}
        options={[{ value: "", label: placeholder }, ...options]}
      />
    </div>
  );
}
export function EditToggle({ label, value, onChange }) {
  return (
    <label className="flex h-10 items-center justify-between rounded-xl border border-border px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

// How customers and merchants sign in on each portal and channel: PIN (the
// PIN chosen at sign-up), PASSWORD, or both. Staff on the admin portal always
// use a password, so it isn't listed. A key the server didn't send is
// PASSWORD.
export const LOGIN_PORTALS = ["customer_web", "customer_app", "merchant_web", "merchant_app"];
const LOGIN_METHODS = ["PIN", "PASSWORD"];
export const loginMethodsOf = (value) =>
  Object.fromEntries(LOGIN_PORTALS.map((p) => [p, Array.isArray(value?.[p]) && value[p].length ? value[p] : ["PASSWORD"]]));

// The 4 x 2 grid of tick boxes; read-only without onChange. The last tick in
// a row can't be cleared, as each portal needs a method.
export function LoginMethodsGrid({ value, onChange }) {
  const { t } = useTranslation("institutions");
  const methods = loginMethodsOf(value);
  const toggle = (portal, method) => {
    const on = methods[portal].includes(method);
    onChange({ ...methods, [portal]: on ? methods[portal].filter((m) => m !== method) : LOGIN_METHODS.filter((m) => m === method || methods[portal].includes(m)) });
  };
  return (
    <div className="sm:col-span-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("portalLoginMethods")}</p>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{t("portalChannel")}</th>
              {LOGIN_METHODS.map((m) => (
                <th key={m} className="w-28 px-3 py-2 text-center">{t(`loginMethod_${m}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOGIN_PORTALS.map((portal) => (
              <tr key={portal} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-slate-700">{t(`loginPortal_${portal}`)}</td>
                {LOGIN_METHODS.map((m) => {
                  const on = methods[portal].includes(m);
                  return (
                    <td key={m} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${t(`loginPortal_${portal}`)} ${t(`loginMethod_${m}`)}`}
                        checked={on}
                        disabled={!onChange || (on && methods[portal].length === 1)}
                        onChange={() => toggle(portal, m)}
                        className="h-4 w-4 accent-[var(--primary)] disabled:opacity-70"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("portalLoginMethodsHint")}</p>
    </div>
  );
}

// Digits of the one-time codes sent to customers and merchants (4–8).
export const OTP_LENGTHS = [4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) }));
