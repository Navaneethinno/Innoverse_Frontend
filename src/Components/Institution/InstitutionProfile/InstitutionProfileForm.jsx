import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
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
export function EditToggle({ label, value, onChange, hint }) {
  const toggle = (
    <label className="flex h-10 items-center justify-between rounded-xl border border-border px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
  if (!hint) return toggle;
  return (
    <div>
      {toggle}
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
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
// Whether any portal signs in with a PIN (login_pin_length matters then).
export const usesPin = (value) => Object.values(loginMethodsOf(value)).some((m) => m.includes("PIN"));

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

// What people type to sign in, and what a new sign-up starts with (a code is
// sent to it), per portal: PHONE, EMAIL or both. A portal the server didn't
// send is both; all four are always sent, as one left out resets to both.
const CONTACTS = ["PHONE", "EMAIL"];
const IDENTIFIER_USES = ["login", "signup"];
export const portalIdentifiersOf = (value) =>
  Object.fromEntries(
    LOGIN_PORTALS.map((p) => [p, Object.fromEntries(IDENTIFIER_USES.map((use) => [use, Array.isArray(value?.[p]?.[use]) && value[p][use].length ? value[p][use] : CONTACTS]))]),
  );

// One row per portal, Phone/Email ticks for sign-in and for sign-up;
// read-only without onChange. The last tick in a pair can't be cleared.
export function PortalIdentifiersGrid({ value, onChange }) {
  const { t } = useTranslation("institutions");
  const ids = portalIdentifiersOf(value);
  const toggle = (portal, use, contact) => {
    const list = ids[portal][use];
    const next = list.includes(contact) ? list.filter((c) => c !== contact) : CONTACTS.filter((c) => c === contact || list.includes(c));
    onChange({ ...ids, [portal]: { ...ids[portal], [use]: next } });
  };
  return (
    <div className="sm:col-span-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("portalIdentifiers")}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{t("portalChannel")}</th>
              {IDENTIFIER_USES.map((use) => (
                <th key={use} className="px-3 py-2 text-center">{t(`identifierUse_${use}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOGIN_PORTALS.map((portal) => (
              <tr key={portal} className="border-t border-border">
                <td className="px-3 py-2 font-medium text-slate-700">{t(`loginPortal_${portal}`)}</td>
                {IDENTIFIER_USES.map((use) => (
                  <td key={use} className="px-3 py-2">
                    <div className="flex justify-center gap-4">
                      {CONTACTS.map((c) => {
                        const on = ids[portal][use].includes(c);
                        return (
                          <label key={c} className="inline-flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={!onChange || (on && ids[portal][use].length === 1)}
                              onChange={() => toggle(portal, use, c)}
                              className="h-4 w-4 accent-[var(--primary)] disabled:opacity-70"
                            />
                            {t(`contact_${c}`)}
                          </label>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("portalIdentifiersHint")}</p>
    </div>
  );
}

// Money to phone numbers with no account yet: it waits in the institution's
// holding account until the number signs up and is approved. A record that
// never had the setting reads as all off.
const PAY_TO_PHONE_OFF = { enabled: false, refund_after_days: 0, sender_can_cancel: false, invite_only_signup: false };
export const payToPhoneOf = (value) => ({ ...PAY_TO_PHONE_OFF, ...(value ?? {}) });
const MAX_REFUND_DAYS = 3650;

// The four settings; read-only without onChange. The last three show only
// while sending to such numbers is on.
export function PayToPhoneSettings({ value, onChange }) {
  const { t } = useTranslation("institutions");
  const v = payToPhoneOf(value);
  const set = (patch) => onChange({ ...v, ...patch });
  const switchRow = (key) =>
    onChange ? (
      <EditToggle label={t(`payToPhone_${key}`)} value={Boolean(v[key])} onChange={(on) => set({ [key]: on })} />
    ) : (
      <Field label={t(`payToPhone_${key}`)} value={Boolean(v[key])} />
    );
  return (
    <div className="sm:col-span-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("payToPhoneTitle")}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {switchRow("enabled")}
        {v.enabled && (
          <>
            {onChange ? (
              <div>
                <EditField
                  label={t("payToPhone_refund_after_days")}
                  type="number"
                  value={v.refund_after_days}
                  onChange={(n) => set({ refund_after_days: Math.min(MAX_REFUND_DAYS, Math.floor(Number(n) || 0)) })}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{t("payToPhoneRefundHint")}</p>
              </div>
            ) : (
              <Field label={t("payToPhone_refund_after_days")} value={Number(v.refund_after_days) ? v.refund_after_days : t("payToPhoneNeverReturned")} />
            )}
            {switchRow("sender_can_cancel")}
            {switchRow("invite_only_signup")}
          </>
        )}
      </div>
    </div>
  );
}

// Which edition of the customer and merchant APIs the institution's apps
// and portals get ("" = standard). Only platform staff can change it, as it
// changes what the bank's live app receives; read-only without onChange.
const PORTAL_EDITIONS = ["", "etaku"];
export function PortalEditionField({ value, onChange }) {
  const { t } = useTranslation("institutions");
  const isPlatform = useCanChooseInstitution();
  const current = value === "standard" ? "" : (value ?? "");
  const options = PORTAL_EDITIONS.map((e) => ({ value: e, label: t(`portalEdition_${e || "standard"}`) }));
  if (!onChange) return <Field label={t("portalEdition")} value={options.find((o) => o.value === current)?.label ?? current} />;
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("portalEdition")}</label>
      <FilterSelect
        value={current}
        onChange={onChange}
        disabled={!isPlatform}
        disabledReason={isPlatform ? undefined : t("portalEditionPlatformOnly")}
        options={options}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{t("portalEditionHint")}</p>
    </div>
  );
}

// Digits of the one-time codes sent to customers and merchants (4–8).
export const OTP_LENGTHS = [4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) }));
