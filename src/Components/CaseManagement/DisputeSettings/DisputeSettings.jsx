import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { Facts, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field, RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { disputeSettingApi } from "@/Services/Merchant/ops.api";

const num = (v) => (v === "" || v == null ? null : Number(v));
const opts = (list, label) => (list ?? []).map((x) => (typeof x === "string" ? { value: x, label: label?.(x) ?? x } : { value: x.value ?? x.code, label: x.label ?? x.name ?? x.value ?? x.code }));

function problemOf(t, f) {
  if (!(Number(f.default_window_days) >= 1)) return t("windowRequired");
  if (f.reasons.some((r) => !String(r.code ?? "").trim() || !String(r.name ?? "").trim())) return t("fillRequired");
  if (new Set(f.reasons.map((r) => r.code.trim())).size !== f.reasons.length) return t("codeOnce");
  if (f.types.some((r) => !r.txn_type)) return t("fillRequired");
  if (new Set(f.types.map((r) => r.txn_type)).size !== f.types.length) return t("typeOnce");
  if (f.escalation.some((r) => !(Number(r.level) >= 1) || !(Number(r.after_hours) >= 1))) return t("escalationRequired");
  if (new Set(f.escalation.map((r) => Number(r.level))).size !== f.escalation.length) return t("levelOnce");
  return "";
}

// Case Management > Dispute Settings (243): which transaction types a
// customer may dispute, within how many days, for which reasons, and the
// escalation matrix the daily DISPUTE_ESCALATION job applies.
export function DisputeSettings() {
  const { t } = useTranslation(["ops", "common"]);
  return (
    <SectionScreen
      api={disputeSettingApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("disputeSettingsTitle")}
      subtitle={t("disputeSettingsSubtitle")}
      toForm={(s) => ({
        default_window_days: s?.default_window_days ?? 30,
        other_types_allowed: Boolean(s?.other_types_allowed),
        reasons: (s?.reasons ?? []).map((r) => ({ ...r })),
        types: (s?.types ?? []).map((r) => ({ ...r, reasons: [...(r.reasons ?? [])] })),
        escalation: (s?.escalation ?? []).map((r) => ({ ...r })),
      })}
      bodyOf={(f) => ({
        setup: {
          default_window_days: Number(f.default_window_days),
          other_types_allowed: Boolean(f.other_types_allowed),
          reasons: f.reasons.map((r) => ({ code: r.code.trim(), name: r.name.trim() })),
          types: f.types.map((r) => ({ txn_type: r.txn_type, allowed: Boolean(r.allowed), window_days: num(r.window_days), reasons: r.reasons ?? [] })),
          escalation: f.escalation.map((r) => ({ level: Number(r.level), after_hours: Number(r.after_hours), priority: r.priority || null, assign_user_id: num(r.assign_user_id), note: String(r.note ?? "").trim() })),
        },
      })}
      problemOf={(_, f) => problemOf(t, f)}
    >
      {({ data, shown, editing, setForm }) => <Doc data={data} s={shown ?? {}} editing={editing} setForm={setForm} />}
    </SectionScreen>
  );
}

function Doc({ data, s, editing, setForm }) {
  const { t } = useTranslation(["ops", "common"]);
  const choices = data?.choices ?? {};
  const txnTypes = opts(choices.txn_types);
  const priorities = opts(choices.priorities ?? ["LOW", "NORMAL", "HIGH", "URGENT"], (p) => t(`cases:priority_${p}`, { defaultValue: p }));
  const reasons = s.reasons ?? [];
  const types = s.types ?? [];
  const escalation = s.escalation ?? [];
  const reasonOpts = reasons.filter((r) => r.code).map((r) => ({ value: r.code, label: r.name || r.code }));
  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const labelOf = (list, v) => list.find((x) => x.value === v)?.label ?? v;

  if (editing)
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("defaultWindowDays")}
            <Field field={{ type: "int" }} value={s.default_window_days} onChange={(v) => patch({ default_window_days: v })} />
          </label>
          <label className={`${labelClass} flex items-center justify-between gap-2 self-end rounded-xl border border-border px-3 py-2`}>
            {t("otherTypesAllowed")}
            <Field field={{ type: "bool" }} value={s.other_types_allowed} onChange={(v) => patch({ other_types_allowed: v })} />
          </label>
        </div>
        <p className="text-sm font-bold">{t("disputeReasons")}</p>
        <RowsEditor rows={reasons} onChange={(rows) => patch({ reasons: rows })} blank={() => ({ code: "", name: "" })} addLabel={t("addReason")} columns="lg:grid-cols-2" fields={[{ key: "code", label: t("code"), placeholder: "NOT_RECEIVED" }, { key: "name", label: t("name"), placeholder: "Goods not received" }]} />
        <p className="text-sm font-bold">{t("disputeTypes")}</p>
        <RowsEditor
          rows={types}
          onChange={(rows) => patch({ types: rows })}
          blank={() => ({ txn_type: "", allowed: true, window_days: "", reasons: [] })}
          addLabel={t("addTxnType")}
          fields={[
            { key: "txn_type", label: t("txnType"), type: txnTypes.length ? "select" : "text", options: txnTypes },
            { key: "allowed", label: t("allowed"), type: "bool" },
            { key: "window_days", label: t("windowDays"), type: "int" },
            { key: "reasons", label: t("allowedReasons"), type: "multi", options: reasonOpts },
          ]}
        />
        <p className="text-sm font-bold">{t("escalationMatrix")}</p>
        <p className="-mt-3 text-[11px] text-muted-foreground">{t("escalationHint")}</p>
        <RowsEditor
          rows={escalation}
          onChange={(rows) => patch({ escalation: rows })}
          blank={() => ({ level: escalation.length + 1, after_hours: "", priority: "", assign_user_id: "", note: "" })}
          addLabel={t("addLevel")}
          columns="lg:grid-cols-5"
          fields={[
            { key: "level", label: t("level"), type: "int" },
            { key: "after_hours", label: t("afterHours"), type: "int" },
            { key: "priority", label: t("priority"), type: "select", options: [{ value: "", label: t("keepPriority") }, ...priorities] },
            { key: "assign_user_id", label: t("assignUserId"), type: "int" },
            { key: "note", label: t("internalNote") },
          ]}
        />
      </div>
    );

  return (
    <div className="grid gap-4">
      <Facts
        rows={[
          [t("defaultWindowDays"), s.default_window_days],
          [t("otherTypesAllowed"), s.other_types_allowed ? t("common:yes") : t("common:no")],
        ]}
      />
      <p className="text-sm font-bold">{t("disputeReasons")}</p>
      {reasons.length ? <p className="text-sm">{reasons.map((r) => `${r.name} (${r.code})`).join(" · ")}</p> : <EmptyNote>{t("noReasons")}</EmptyNote>}
      <p className="text-sm font-bold">{t("disputeTypes")}</p>
      {types.length ? (
        <SimpleTable columns={[t("txnType"), t("allowed"), t("windowDays"), t("allowedReasons")]}>
          <tbody>
            {types.map((r) => (
              <tr key={r.txn_type} className="border-t border-border">
                <td className="px-3 py-2 font-semibold">{labelOf(txnTypes, r.txn_type)}</td>
                <td className="px-3 py-2">{r.allowed ? t("common:yes") : t("common:no")}</td>
                <td className="px-3 py-2">{r.window_days ?? t("defaultWindowShort", { days: s.default_window_days })}</td>
                <td className="px-3 py-2">{(r.reasons ?? []).length ? r.reasons.map((c) => labelOf(reasonOpts, c)).join(", ") : t("anyReason")}</td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
      ) : (
        <EmptyNote>{t("noTypes")}</EmptyNote>
      )}
      <p className="text-sm font-bold">{t("escalationMatrix")}</p>
      {escalation.length ? (
        <SimpleTable columns={[t("level"), t("afterHours"), t("priority"), t("assignUserId"), t("internalNote")]}>
          <tbody>
            {escalation.map((r) => (
              <tr key={r.level} className="border-t border-border">
                <td className="px-3 py-2 font-semibold">{r.level}</td>
                <td className="px-3 py-2">{r.after_hours}</td>
                <td className="px-3 py-2">{r.priority ? labelOf(priorities, r.priority) : "—"}</td>
                <td className="px-3 py-2">{r.assign_user_name ?? r.assign_user_id ?? "—"}</td>
                <td className="px-3 py-2">{r.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </SimpleTable>
      ) : (
        <EmptyNote>{t("noEscalation")}</EmptyNote>
      )}
    </div>
  );
}
