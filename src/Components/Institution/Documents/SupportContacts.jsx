import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Toggle } from "@/Components/Common/Toggle";
import { useLanguages } from "@/Hooks/Master/masterHooks";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { supportContactsApi } from "@/Services/Institution/institutionDocuments.api";
import { cn } from "@/Utils/Lib/utils";

// INSTITUTION > Documents › Support contacts (Admin_41): how customers and
// merchants reach the institution (WhatsApp, phone, SMS, e-mail, website,
// other), shown in the app in this order. One document under maker-checker;
// the menu's rights apply (View / Edit / Authorise).

const MAX = 20;
const PHONE_TYPES = ["WHATSAPP", "PHONE", "SMS"];
const blank = () => ({ type: "PHONE", value: "", label: "", translations: {}, hours: "", for: "BOTH", enabled: true });
const langCode = (l) => String(l?.code ?? l?.language_code ?? l?.lang_code ?? "").toLowerCase();
const phone = (v) => String(v ?? "").replace(/[\s-]/g, "");

const toForm = (setup) => ({ contacts: (setup?.contacts ?? []).map((c) => ({ ...blank(), ...c, translations: { ...(c.translations ?? {}) } })) });
const bodyOf = (form) => ({
  contacts: form.contacts.map((c) => ({
    type: c.type,
    value: PHONE_TYPES.includes(c.type) ? phone(c.value) : String(c.value ?? "").trim(),
    label: String(c.label ?? "").trim(),
    translations: Object.fromEntries(Object.entries(c.translations ?? {}).map(([k, v]) => [k, String(v ?? "").trim()]).filter(([, v]) => v)),
    hours: String(c.hours ?? "").trim(),
    for: c.for || "BOTH",
    enabled: c.enabled !== false,
  })),
});

// The value each type takes; the server checks again and lists its problems.
function valueProblem(t, c) {
  const v = String(c.value ?? "").trim();
  if (!v) return t("sc_needValue");
  if (PHONE_TYPES.includes(c.type) && !/^\+\d{8,15}$/.test(phone(v))) return t("sc_badPhone");
  if (c.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t("sc_badEmail");
  if (c.type === "WEBSITE" && !/^https:\/\/\S+$/i.test(v)) return t("sc_badWebsite");
  return "";
}
function problemOf(t, form) {
  if (form.contacts.length > MAX) return t("sc_tooMany", { count: MAX });
  const i = form.contacts.findIndex((c) => valueProblem(t, c));
  return i >= 0 ? t("sc_rowProblem", { n: i + 1, problem: valueProblem(t, form.contacts[i]) }) : "";
}

export function SupportContacts() {
  const { t } = useTranslation("documents");
  return (
    <SectionScreen api={supportContactsApi} ns="documents" textPrefix="sc_" valueKey="setup" title={t("sc_title")} subtitle={t("sc_subtitle")} toForm={toForm} bodyOf={bodyOf} problemOf={problemOf}>
      {({ data, shown, editing, setForm }) => <ContactsForm choices={data?.choices ?? {}} value={toForm(shown)} editing={editing} onChange={setForm} />}
    </SectionScreen>
  );
}

function ContactsForm({ choices, value, editing, onChange }) {
  const { t } = useTranslation("documents");
  const { languages } = useLanguages();
  const others = languages.map(langCode).filter((c) => c && c !== "en");
  const types = choices.types ?? ["WHATSAPP", "PHONE", "SMS", "EMAIL", "WEBSITE", "OTHER"];
  const fors = choices.for ?? ["CUSTOMER", "MERCHANT", "BOTH"];
  const rows = value.contacts;
  const setRow = (i, patch) => onChange((f) => ({ ...f, contacts: f.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const move = (i, d) =>
    onChange((f) => {
      const list = [...f.contacts];
      [list[i], list[i + d]] = [list[i + d], list[i]];
      return { ...f, contacts: list };
    });
  const full = rows.length >= MAX;
  const placeholder = (type) => t(`sc_ph_${type}`, { defaultValue: "" });

  return (
    <div>
      {editing && (
        <div className="mb-2 flex justify-end">
          <Button size="sm" variant="secondary" icon={Plus} disabled={full} disabledReason={t("sc_tooMany", { count: MAX })} onClick={() => onChange((f) => ({ ...f, contacts: [...f.contacts, blank()] }))}>
            {t("sc_add")}
          </Button>
        </div>
      )}
      {!rows.length ? (
        <p className="rounded-xl bg-muted/50 px-3 py-6 text-center text-xs text-muted-foreground">{t("sc_none")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2">{t("sc_type")}</th>
                <th className="px-2 py-2">{t("sc_value")}</th>
                <th className="px-2 py-2">{t("sc_label")}</th>
                {others.map((c) => (
                  <th key={c} className="px-2 py-2">
                    {t("sc_labelIn", { lang: c.toUpperCase() })}
                  </th>
                ))}
                <th className="px-2 py-2">{t("sc_hours")}</th>
                <th className="px-2 py-2">{t("sc_for")}</th>
                <th className="px-2 py-2 text-center">{t("sc_enabled")}</th>
                {editing && <th className="px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const problem = editing ? valueProblem(t, c) : "";
                return (
                  <tr key={i} className={cn("border-t border-border align-top", c.enabled === false && "text-muted-foreground")}>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select className={cn(inputClass, "min-w-32 py-1.5 text-xs")} value={c.type} onChange={(e) => setRow(i, { type: e.target.value })}>
                          {types.map((x) => (
                            <option key={x} value={x}>
                              {t(`sc_type_${x}`, { defaultValue: x })}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-semibold">{t(`sc_type_${c.type}`, { defaultValue: c.type })}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <>
                          <input className={cn(inputClass, "min-w-48 py-1.5 text-xs", problem && "border-red-300")} aria-invalid={Boolean(problem)} value={c.value} maxLength={200} placeholder={placeholder(c.type)} onChange={(e) => setRow(i, { value: e.target.value })} />
                          {problem && <p className="mt-0.5 text-[10px] font-semibold text-red-600">{problem}</p>}
                        </>
                      ) : (
                        <span className="font-mono">{c.value}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">{editing ? <input className={cn(inputClass, "min-w-36 py-1.5 text-xs")} value={c.label} maxLength={100} placeholder={t("sc_labelPh")} onChange={(e) => setRow(i, { label: e.target.value })} /> : c.label || <span className="text-muted-foreground">—</span>}</td>
                    {others.map((lang) => (
                      <td key={lang} className="px-2 py-1.5">
                        {editing ? (
                          <input className={cn(inputClass, "min-w-36 py-1.5 text-xs")} value={c.translations?.[lang] ?? ""} maxLength={100} placeholder={c.label} onChange={(e) => setRow(i, { translations: { ...(c.translations ?? {}), [lang]: e.target.value } })} />
                        ) : (
                          c.translations?.[lang] || <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">{editing ? <input className={cn(inputClass, "min-w-32 py-1.5 text-xs")} value={c.hours} maxLength={100} placeholder={t("sc_hoursPh")} onChange={(e) => setRow(i, { hours: e.target.value })} /> : c.hours || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select className={cn(inputClass, "py-1.5 text-xs")} value={c.for} onChange={(e) => setRow(i, { for: e.target.value })}>
                          {fors.map((x) => (
                            <option key={x} value={x}>
                              {t(`sc_for_${x}`, { defaultValue: x })}
                            </option>
                          ))}
                        </select>
                      ) : (
                        t(`sc_for_${c.for}`, { defaultValue: c.for })
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">{editing ? <Toggle checked={c.enabled !== false} onChange={(on) => setRow(i, { enabled: on })} /> : c.enabled !== false ? t("sc_yes") : t("sc_no")}</td>
                    {editing && (
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-0.5">
                          <button type="button" disabled={i === 0} title={i === 0 ? t("sc_alreadyFirst") : t("sc_moveUp")} onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" disabled={i === rows.length - 1} title={i === rows.length - 1 ? t("sc_alreadyLast") : t("sc_moveDown")} onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" title={t("sc_remove")} onClick={() => onChange((f) => ({ ...f, contacts: f.contacts.filter((_, j) => j !== i) }))} className="rounded p-1 text-red-600 hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && <p className="mt-1.5 text-[11px] text-muted-foreground">{t("sc_hint", { count: MAX })}</p>}
    </div>
  );
}
