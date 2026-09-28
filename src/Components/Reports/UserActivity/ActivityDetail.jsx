import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { userActivityApi } from "@/Services/Reports/userActivity.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { atIst } from "../Shared/reportShared";
import { fieldLabel, useIdNames } from "../Shared/idNames";
import { Fields, Value } from "../Shared/RecordValues";
import { RoleBadge, recordText } from "./activityFormat";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

// One activity (user_activity/get): what changed against the record as it
// last stood approved, the values the action left, and the history of the
// same change (submit → approve/reject → resubmit…).
export function ActivityDetail({ activityId, onClose }) {
  const { t } = useTranslation("reports");
  const [item, setItem] = useState(null);
  // ids in the values/changes shown as their names.
  const name = useIdNames(item?.entity, item?.values, (item?.changes ?? []).flatMap((c) => [{ [c.field]: c.before }, { [c.field]: c.after }]));

  useEffect(() => {
    let cancelled = false;
    userActivityApi
      .get({ activity_id: activityId })
      .then((r) => !cancelled && setItem(rowsOf(r)[0] ?? null))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  return (
    <Modal open onClose={onClose} size="lg" title={item ? `${item.action_name} · ${recordText(item)}` : t("activity")}>
      {!item ? (
        <div className="flex justify-center py-10">
          <Spinner size={22} />
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-x-4 gap-y-2 rounded-xl border p-3 text-xs sm:grid-cols-2">
            {[
              [t("when"), atIst(item.at)],
              [t("role"), <RoleBadge key="r" role={item.role} name={item.role_name} />],
              [t("recordType"), `${item.entity_name} · ${item.group_name}`],
              [t("institution"), item.inst_profile_name ?? "-"],
              [t("maker"), item.maker ?? "-"],
              [t("statusAfter"), item.process_status_name ?? "-"],
              ...(item.narration ? [[t("narration"), item.narration]] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>

          <Section title={t("whatChanged")}>
            {item.is_new ? (
              <p className="rounded-lg bg-muted p-2.5 text-xs font-semibold">{t("newRecord")}</p>
            ) : item.changes?.length ? (
              <table className="w-full table-fixed text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="w-1/4 py-1 pr-2 font-semibold">{t("field")}</th>
                    <th className="py-1 pr-2 font-semibold">{t("before")}</th>
                    <th className="py-1 font-semibold">{t("after")}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.changes.map((c) => (
                    <tr key={c.field} className="border-b align-top last:border-0">
                      <td className="py-1.5 pr-2 font-semibold text-slate-600">{fieldLabel(c.field)}</td>
                      <td className="py-1.5 pr-2 text-muted-foreground">
                        <Value field={c.field} value={c.before} name={name} />
                      </td>
                      <td className="py-1.5 font-medium text-primary">
                        <Value field={c.field} value={c.after} name={name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noFieldChanges")}</p>
            )}
          </Section>

          {item.values && Object.keys(item.values).length > 0 && (
            <Section title={t("values")}>
              <Fields values={item.values} name={name} />
            </Section>
          )}

          {item.history?.length > 0 && (
            <Section title={t("history")}>
              <ol className="relative space-y-3 border-l pl-4">
                {item.history.map((h, i) => (
                  <li key={i} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-700">{h.action_name}</span>
                      <RoleBadge role={h.role} name={h.role_name} />
                      <span className="text-muted-foreground">
                        {h.by} · {atIst(h.at)}
                      </span>
                    </div>
                    {h.process_status_name && <p className="text-muted-foreground">{h.process_status_name}</p>}
                    {h.narration && <p className="mt-0.5 whitespace-pre-wrap">“{h.narration}”</p>}
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>
      )}
    </Modal>
  );
}
