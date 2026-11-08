import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field, RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { pickupLocationApi } from "@/Services/Merchant/ops.api";
import { recordOf } from "@/Services/Loans/loans.api";

const branchOpts = (list) => (list ?? []).map((b) => ({ value: String(b.id), label: b.name }));

// InnoCMS > Card Products, Pickup Locations tab: the branches where a card
// can be collected (delivery BRANCH_PICKUP) and whether one must be chosen.
export function PickupLocations() {
  const { t } = useTranslation(["ops", "common"]);
  const problemOf = (_, f) => {
    if (f.locations.some((l) => !l.branch_id)) return t("fillRequired");
    if (new Set(f.locations.map((l) => String(l.branch_id))).size !== f.locations.length) return t("branchOnce");
    if (f.required && !f.locations.some((l) => l.enabled)) return t("pickupNeedsOne");
    return "";
  };
  return (
    <SectionScreen
      api={pickupLocationApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("pickupTitle")}
      subtitle={t("pickupSubtitle")}
      toForm={(s) => ({ enabled: Boolean(s?.enabled), required: Boolean(s?.required), locations: (s?.locations ?? []).map((l) => ({ ...l, branch_id: String(l.branch_id) })) })}
      bodyOf={(f) => ({ setup: { enabled: Boolean(f.enabled), required: Boolean(f.required), locations: f.locations.map((l) => ({ branch_id: Number(l.branch_id), note: String(l.note ?? "").trim(), enabled: Boolean(l.enabled) })) } })}
      problemOf={problemOf}
    >
      {({ data, shown, editing, setForm }) => {
        const s = shown ?? {};
        const branches = branchOpts(data?.choices?.branches);
        const name = (id) => branches.find((b) => b.value === String(id))?.label ?? id;
        const patch = (p) => setForm((f) => ({ ...f, ...p }));
        if (editing)
          return (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`${labelClass} flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2`}>
                  {t("pickupEnabled")}
                  <Field field={{ type: "bool" }} value={s.enabled} onChange={(v) => patch({ enabled: v })} />
                </label>
                <label className={`${labelClass} flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2`}>
                  {t("pickupRequired")}
                  <Field field={{ type: "bool" }} value={s.required} onChange={(v) => patch({ required: v })} />
                </label>
              </div>
              <RowsEditor
                rows={s.locations ?? []}
                onChange={(locations) => patch({ locations })}
                blank={() => ({ branch_id: "", note: "", enabled: true })}
                addLabel={t("addBranch")}
                columns="lg:grid-cols-3"
                fields={[
                  { key: "branch_id", label: t("branch"), type: "select", options: [{ value: "", label: t("chooseBranch") }, ...branches] },
                  { key: "note", label: t("note"), placeholder: "Ground floor, card desk" },
                  { key: "enabled", label: t("enabled"), type: "bool" },
                ]}
              />
            </div>
          );
        const locations = s.locations ?? [];
        return (
          <div className="grid gap-3">
            <Facts
              rows={[
                [t("pickupEnabled"), s.enabled ? t("common:yes") : t("common:no")],
                [t("pickupRequired"), s.required ? t("common:yes") : t("common:no")],
              ]}
            />
            {locations.length ? (
              <SimpleTable columns={[t("branch"), t("note"), t("enabled")]}>
                <tbody>
                  {locations.map((l) => (
                    <tr key={l.branch_id} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{name(l.branch_id)}</td>
                      <td className="px-3 py-2">{l.note || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={l.enabled ? "ACTIVE" : "INACTIVE"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SimpleTable>
            ) : (
              <EmptyNote>{t("noPickup")}</EmptyNote>
            )}
          </div>
        );
      }}
    </SectionScreen>
  );
}

// Why a card request or reissue cannot go yet: the setup requires a pickup
// branch and none is picked ("" when it can). `delivery` is the DeliveryFields value.
export function pickupBlocked(t, pickup, delivery) {
  if (!pickup?.enabled || !pickup.required || delivery?.delivery_mode !== "BRANCH_PICKUP" || Number(delivery.pickup_branch_id) > 0) return "";
  return t(pickup.options.length ? "ops:pickupRequiredHint" : "ops:noPickup");
}

// The pickup branches in force, for a BRANCH_PICKUP card request or reissue:
// { enabled, required, options: [{ value, label }] } (null while loading).
export function usePickupLocations() {
  const [state, setState] = useState(null);
  useEffect(() => {
    pickupLocationApi
      .get({})
      .then((r) => {
        const d = recordOf(r) ?? {};
        const s = d.setup ?? {};
        const names = branchOpts(d.choices?.branches);
        const options = (s.locations ?? [])
          .filter((l) => l.enabled !== false)
          .map((l) => ({ value: String(l.branch_id), label: [names.find((b) => b.value === String(l.branch_id))?.label ?? l.branch_id, l.note].filter(Boolean).join(" · ") }));
        setState({ enabled: Boolean(s.enabled), required: Boolean(s.required), options });
      })
      .catch(() => setState({ enabled: false, required: false, options: [] }));
  }, []);
  return state;
}
