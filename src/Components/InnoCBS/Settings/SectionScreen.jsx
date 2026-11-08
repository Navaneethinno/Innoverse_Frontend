import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Send, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Toggle } from "@/Components/Common/Toggle";
import { usePagePermission } from "@/Hooks/usePermission";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { recordOf } from "@/Services/Loans/loans.api";
import { actorText } from "@/Utils/Lib/actor";
import { notifications } from "@/Utils/Lib/notifications";
import { accountDate } from "../Accounts/accountShared";
import { ActionButtons, AuditTimeline, NarrationDialog, Problems, Section } from "../Deposits/depositShared";
import { useInstitutionScope } from "../Loans/loanShared";

// One section of the core banking setup as its own menu: its value, its
// pending change (each section has its own maker-checker) and its history.
// `api` is the section's calls; `toForm` / `toValue` turn the value into the
// form and back; `problemOf` is what stops proposing; `children` draws the
// section, given { data, shown, editing, setForm }. Other single-document
// settings (App Versions, Expiry Rules) use it too: `ns` holds their texts
// (pendingBy, showProposed, confirm_*), `valueKey` where the document sits
// in the reply, `bodyOf` how an edit sends it, `subtitle` and `before` what
// shows above the document; `framed={false}` when the document draws its own
// cards; `warningsOf` lines the propose dialog shows (they do not block it).
export function SectionScreen({ api, fallbackTitle, ns = "corebank", valueKey = "value", toForm = structuredClone, toValue = (form) => form, bodyOf, problemOf = () => "", warningsOf = () => [], subtitle, before, framed = true, children }) {
  const { t } = useTranslation([ns, "loans"]);
  const can = usePagePermission();
  const menu = useMenuContext()?.menu;
  const { chooser, institution, scope } = useInstitutionScope();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [showPending, setShowPending] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (chooser && !institution) return;
    try {
      setData(recordOf(await api.get(scope())));
    } catch (e) {
      setData({ missing: true });
      notifications.error(e.message);
    }
  }, [api, chooser, institution, scope]);
  useEffect(() => {
    setData(null);
    setForm(null);
    void load();
  }, [load]);

  const act = async (verb, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const response = await api[verb](scope(body));
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

  const a = data?.actions ?? {};
  const pending = data?.pending ?? null;
  const shown = form ?? (pending && showPending ? pending[valueKey] : data?.[valueKey]);
  const problem = form ? problemOf(t, form, data) : "";

  return (
    <div className="pt-1 pb-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{menu ? menuLabel(menu) : fallbackTitle}</PageTitle>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {data && !data.missing && !form && (
          <ActionButtons
            busy={busy}
            buttons={[
              a.edit && can("Edit") && { key: "edit", label: t("loans:edit"), icon: Pencil, run: () => (setForm(toForm(pending?.[valueKey] ?? data[valueKey])), setError("")) },
              a.deauth && can("Authorize") && { key: "deauth", label: t("loans:reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
              a.auth && can("Authorize") && { key: "auth", label: t("loans:approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
            ]}
          />
        )}
      </div>

      {chooser && !institution ? null : !data ? (
        <PageSkeleton />
      ) : data.missing ? null : (
        <div className="grid gap-4">
          {before?.(data)}
          {pending && !form && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <span>
                {t("pendingBy", { name: actorText(pending, "proposed_by", "—"), date: accountDate(pending.proposed_at) })}
                {pending.narration ? ` · ${pending.narration}` : ""}
              </span>
              <Toggle showLabel label={t("showProposed")} checked={showPending} onChange={setShowPending} />
            </div>
          )}
          {framed ? <Section>{children({ data, shown, editing: Boolean(form), setForm })}</Section> : children({ data, shown, editing: Boolean(form), setForm })}
          {form ? (
            <>
              {problem && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{problem}</p>}
              {error && <Problems message={error} />}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setForm(null)}>
                  {t("loans:cancel")}
                </Button>
                <Button icon={Send} disabled={Boolean(problem)} disabledReason={problem} onClick={() => setDialog("edit")}>
                  {t("loans:proposeChanges")}
                </Button>
              </div>
            </>
          ) : (
            <Section title={t("loans:history")} collapsible>
              <AuditTimeline audit={data.history ?? []} />
            </Section>
          )}
        </div>
      )}

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "loans:approve" : dialog === "deauth" ? "loans:reject" : "loans:proposeChanges")}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, { ...(dialog === "edit" ? (bodyOf ? bodyOf(form) : { value: toValue(form) }) : {}), ...(narration ? { narration } : {}) })}
        >
          {dialog === "edit" &&
            form &&
            warningsOf(form, data).map((warning) => (
              <p key={warning} className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                {warning}
              </p>
            ))}
        </NarrationDialog>
      )}
    </div>
  );
}
