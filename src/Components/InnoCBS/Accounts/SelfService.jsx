import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, CheckCircle2, ListChecks, Plus, PlayCircle, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { SearchBox } from "@/Components/Common/SearchBox";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Toggle } from "@/Components/Common/Toggle";
import { useLanguages } from "@/Hooks/Master/masterHooks";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { selfServiceApi, selfStatusApi } from "@/Services/Epurse/accounts.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { SectionScreen } from "../Settings/SectionScreen";
import { ActionButtons, Facts, NarrationDialog, inputClass, labelClass } from "../Deposits/depositShared";
import { accountDate } from "./accountShared";

// EPURSE > Accounts › Self-service (Admin_40): customers (and merchants where
// allowed) suspend, reactivate or ask to close their own account. Staff see
// the requests here (approve or reject a closure, reactivate for a customer
// who phones in) and keep the institution's settings: one document under
// maker-checker. Rights: View lists, Edit reactivates and proposes settings,
// Authorise decides closures and settings. The server sends what each
// record allows (`actions`); the buttons follow it.

export function SelfService() {
  const { t } = useTranslation("accounts");
  const [view, setView] = useState("requests");
  return (
    <>
      <SegmentedSwitch
        className="mb-4"
        options={[
          { value: "requests", label: t("ss_requests") },
          { value: "settings", label: t("ss_settings") },
        ]}
        value={view}
        onChange={setView}
      />
      {view === "requests" ? <SelfServiceRequests /> : <SelfServiceSettings />}
    </>
  );
}

// ---------------------------------------------------------------- requests

const TABS = [
  { key: "all", body: { status: "ALL" } },
  { key: "open", body: { status: "OPEN" } },
  { key: "closure", body: { status: "CLOSE_PENDING" } },
];
const TONE = {
  SUSPENDED: "bg-amber-50 text-amber-900",
  CLOSE_PENDING: "bg-orange-50 text-orange-800",
  CLOSE_REJECTED: "bg-amber-50 text-amber-900",
  CLOSED: "bg-red-50 text-red-700",
  REACTIVATED: "bg-emerald-50 text-emerald-700",
  CLOSE_CANCELLED: "bg-muted text-muted-foreground",
};
function SelfStatus({ value }) {
  const { t } = useTranslation("accounts");
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[value] ?? "bg-muted text-muted-foreground")}>{t(`ss_status_${value}`, { defaultValue: value })}</span>;
}
const listOf = (r) => {
  const rows = Array.isArray(r?.data) ? r.data : [];
  const p = r?.pagination ?? {};
  return { rows, total: Number(p.totalRecords ?? p.total_records ?? rows.length) || 0 };
};
// "CUSTOMER/APP:+258…" (the customer themselves) reads "Customer (APP)"; staff by name.
// Who ended a request: ended_by_type (Admin_43) says customer or staff;
// ended_by holds the staff name or the customer's channel and phone.
const actorOf = (t, r) => {
  const who = r?.ended_by;
  const m = /^CUSTOMER\/([A-Z]+)/.exec(String(who ?? ""));
  if (r?.ended_by_type === "CUSTOMER" || (!r?.ended_by_type && m)) return t("ss_byCustomer", { channel: m?.[1] ?? "app" });
  return who || "—";
};
const one = (r) => (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? null;

function SelfServiceRequests() {
  const { t } = useTranslation(["accounts", "common"]);
  const canChoose = useCanChooseInstitution();
  const [tab, setTab] = useState("open");
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [typed]);

  // A live push refreshes in place (no loading state, no redraw). Only the
  // newest request's answer is shown (a slow earlier tab can't overwrite it).
  const seq = useRef(0);
  const load = useCallback(
    async (silent = false) => {
      const id = ++seq.current;
      if (!silent) setLoading(true);
      try {
        const body = TABS.find((x) => x.key === tab)?.body ?? {};
        const reply = await selfStatusApi.list({ ...body, ...(search ? { search } : {}), page, page_size: limit, limit });
        if (id === seq.current) setResult(listOf(reply));
      } catch (error) {
        if (id === seq.current) notifications.error(error.message);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [tab, search, page, limit],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(selfStatusApi.listPath, () => load(true));

  const columns = [
    { key: "reference", label: t("ss_reference"), align: "left", render: (r) => <span className="font-mono text-xs font-semibold">{r.reference}</span> },
    { key: "party_name", label: t("ss_customer"), align: "left", render: (r) => <span className="text-xs">{r.party_name || "—"}</span> },
    ...(canChoose ? [{ key: "inst_profile_name", label: t("common:institution"), render: (r) => <span className="text-xs">{r.inst_profile_name ?? "—"}</span> }] : []),
    {
      key: "action",
      label: t("ss_action"),
      render: (r) => (
        <div>
          <p className="text-xs font-semibold">{t(`ss_action_${r.action}`, { defaultValue: r.action })}</p>
          {r.hold && <p className="whitespace-nowrap text-[10px] text-muted-foreground">{t(`ss_hold_${r.hold}`, { defaultValue: r.hold })}</p>}
        </div>
      ),
    },
    {
      key: "reason_name",
      label: t("ss_reason"),
      align: "left",
      render: (r) => (
        <div className="max-w-56">
          <p className="truncate text-xs">{r.reason_name || r.reason_code || "—"}</p>
          {r.note && <p className="truncate text-[10px] italic text-muted-foreground">“{r.note}”</p>}
        </div>
      ),
    },
    {
      key: "requested_at",
      label: t("ss_requestedAt"),
      render: (r) => (
        <div>
          <p className="whitespace-nowrap text-xs">{accountDate(r.requested_at)}</p>
          {r.channel && <p className="text-[10px] text-muted-foreground">{r.channel}</p>}
        </div>
      ),
    },
    { key: "status", label: t("common:status"), render: (r) => <SelfStatus value={r.status} /> },
    {
      key: "ended_at",
      label: t("ss_ended"),
      render: (r) =>
        r.ended_at ? (
          <div className="text-xs">
            <p className="whitespace-nowrap" title={r.ended_by || undefined}>{actorOf(t, r)}</p>
            <p className="whitespace-nowrap text-[10px] text-muted-foreground">{accountDate(r.ended_at)}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setViewing(r)} /> },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1">
          {TABS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => {
                setTab(x.key);
                setPage(1);
              }}
              className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold", tab === x.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t(`ss_tab_${x.key}`)}
            </button>
          ))}
        </div>
        <SearchBox className="min-w-56 flex-1" search={typed} onSearch={setTyped} placeholder={t("ss_search")} />
      </div>
      <DataTable
        columns={columns}
        rows={result.rows}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("ss_requests")}
        emptyTitle={t("ss_empty")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
          totalRecords: result.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
      {viewing && <RequestDetail first={viewing} onClose={() => setViewing(null)} onChanged={() => load(true)} />}
    </>
  );
}

// One request with its decision buttons (from its `actions`): reactivate
// (Edit), approve or reject a closure (Authorise).
function RequestDetail({ first, onClose, onChanged }) {
  const { t } = useTranslation(["accounts", "common"]);
  const can = usePagePermission();
  const [r, setR] = useState(first);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const fresh = one(await selfStatusApi.get({ id: first.id }));
      if (fresh) setR(fresh);
    } catch (e) {
      notifications.error(e.message);
    }
  }, [first.id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (verb, note) => {
    setBusy(true);
    try {
      const response = await selfStatusApi[verb]({ id: r.id, ...(note ? { note } : {}) });
      if (response?.message) notifications.success(response.message);
      const fresh = one(response);
      if (fresh) setR(fresh);
      setDialog(null);
      onChanged();
    } catch (e) {
      notifications.error(e.message);
      // It moved on meanwhile: show it as it is now.
      if (e.code === "selfservice.not_pending") {
        setDialog(null);
        await refresh();
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  };

  const a = r.actions ?? {};
  const buttons = [
    a.reactivate && can("Edit") && { key: "reactivate", label: t("ss_reactivate"), icon: PlayCircle, run: () => setDialog("reactivate") },
    a.reject_close && can("Authorize") && { key: "reject_close", label: t("ss_rejectClose"), icon: XCircle, variant: "danger", run: () => setDialog("reject_close") },
    a.approve_close && can("Authorize") && { key: "approve_close", label: t("ss_approveClose"), icon: CheckCircle2, variant: "primary", run: () => setDialog("approve_close") },
  ];

  return (
    <>
      <Modal open onClose={onClose} size="lg" title={r.reference} subtitle={r.party_name} footer={<ActionButtons busy={busy} buttons={buttons} />}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SelfStatus value={r.status} />
          <span className="text-xs font-semibold">{t(`ss_action_${r.action}`, { defaultValue: r.action })}</span>
          {r.hold && <span className="text-xs text-muted-foreground">· {t(`ss_hold_${r.hold}`, { defaultValue: r.hold })}</span>}
        </div>
        <Facts
          className="mb-4"
          rows={[
            [t("ss_customer"), r.party_name || "—"],
            [t("ss_reason"), r.reason_name || r.reason_code || "—"],
            [t("ss_customerNote"), r.note || "—"],
            [t("ss_channel"), r.channel ?? "—"],
            [t("ss_requestedBy"), r.requested_by || "—"],
            [t("ss_requestedAt"), accountDate(r.requested_at)],
            ...(r.inst_profile_name ? [[t("common:institution"), r.inst_profile_name]] : []),
          ]}
        />
        {(r.ended_at || r.decision_note) && (
          <>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("ss_outcome")}</p>
            <Facts
              rows={[
                [t("ss_endedBy"), actorOf(t, r)],
                [t("ss_endedAt"), r.ended_at ? accountDate(r.ended_at) : "—"],
                [t("ss_decisionNote"), r.decision_note || "—"],
              ]}
            />
          </>
        )}
      </Modal>

      {dialog === "approve_close" && (
        <ConfirmDialog open title={t("ss_approveCloseTitle")} description={t("ss_approveCloseHint")} confirmLabel={t("ss_approveClose")} destructive pending={busy} onClose={() => setDialog(null)} onConfirm={() => run("approve_close")} />
      )}
      {dialog === "reject_close" && (
        <NarrationDialog title={t("ss_rejectCloseTitle")} hint={t("ss_rejectCloseHint")} label={t("ss_rejectCloseNote")} required variant="danger" confirmLabel={t("ss_rejectClose")} busy={busy} onClose={() => setDialog(null)} onSave={(note) => run("reject_close", note)} />
      )}
      {dialog === "reactivate" && (
        <NarrationDialog title={t("ss_reactivateTitle")} hint={t("ss_reactivateHint")} label={t("ss_noteOptional")} confirmLabel={t("ss_reactivate")} busy={busy} onClose={() => setDialog(null)} onSave={(note) => run("reactivate", note)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- settings

const EMPTY = { suspend_enabled: false, reactivate_enabled: false, close_enabled: false, applies_to: "CUSTOMER", hold: "FROZEN", pin_required: false, sign_out_after: false, reasons: [] };
const CODE = /^[A-Z0-9_]{2,32}$/;
const langCode = (l) => String(l?.code ?? l?.language_code ?? l?.lang_code ?? "").toLowerCase();

const toForm = (setup) => ({ ...EMPTY, ...structuredClone(setup ?? {}), reasons: (setup?.reasons ?? []).map((x) => ({ ...x, translations: { ...(x.translations ?? {}) } })) });
const bodyOf = (form) => ({
  suspend_enabled: Boolean(form.suspend_enabled),
  reactivate_enabled: Boolean(form.reactivate_enabled),
  close_enabled: Boolean(form.close_enabled),
  applies_to: form.applies_to,
  hold: form.hold,
  pin_required: Boolean(form.pin_required),
  sign_out_after: Boolean(form.sign_out_after),
  reasons: (form.reasons ?? []).map((x) => ({
    code: String(x.code ?? "").trim(),
    name: String(x.name ?? "").trim(),
    translations: Object.fromEntries(Object.entries(x.translations ?? {}).map(([k, v]) => [k, String(v ?? "").trim()]).filter(([, v]) => v)),
    for: x.for || "BOTH",
    note_required: Boolean(x.note_required),
    enabled: x.enabled !== false,
  })),
});
// What the form can tell before sending; the server checks the rest.
function problemOf(t, form) {
  const codes = (form.reasons ?? []).map((x) => String(x.code ?? "").trim());
  if (codes.some((c) => !CODE.test(c))) return t("accounts:ss_badCode");
  if (new Set(codes).size !== codes.length) return t("accounts:ss_dupCode");
  if ((form.reasons ?? []).some((x) => !String(x.name ?? "").trim())) return t("accounts:ss_needName");
  return "";
}

function SelfServiceSettings() {
  const { t } = useTranslation("accounts");
  return (
    <SectionScreen api={selfServiceApi} ns="accounts" valueKey="setup" title={t("ss_settingsTitle")} subtitle={t("ss_settingsSubtitle")} toForm={toForm} bodyOf={bodyOf} problemOf={problemOf}>
      {({ data, shown, editing, setForm }) => <SettingsForm choices={data?.choices ?? {}} value={toForm(shown)} editing={editing} onChange={setForm} />}
    </SectionScreen>
  );
}

function SettingsForm({ choices, value, editing, onChange }) {
  const { t } = useTranslation("accounts");
  const { languages } = useLanguages();
  const others = languages.map(langCode).filter((c) => c && c !== "en");
  const set = (patch) => onChange((f) => ({ ...f, ...patch }));
  const setReason = (i, patch) => onChange((f) => ({ ...f, reasons: f.reasons.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const move = (i, d) =>
    onChange((f) => {
      const list = [...f.reasons];
      [list[i], list[i + d]] = [list[i + d], list[i]];
      return { ...f, reasons: list };
    });
  const v = value;
  const yesNo = (k) => (editing ? <Toggle checked={Boolean(v[k])} onChange={(x) => set({ [k]: x })} /> : <span className="text-sm font-semibold">{v[k] ? t("ss_yes") : t("ss_no")}</span>);
  const switches = ["suspend_enabled", "reactivate_enabled", "close_enabled", "pin_required", "sign_out_after"];
  const appliesTo = choices.applies_to ?? ["CUSTOMER", "MERCHANT", "BOTH"];
  const holds = choices.holds ?? ["FROZEN", "BLOCKED"];
  const reasonFor = choices.reason_for ?? ["SUSPEND", "CLOSE", "BOTH"];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {switches.map((k) => (
          <div key={k} className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
            <div>
              <p className={labelClass}>{t(`ss_f_${k}`)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t(`ss_h_${k}`)}</p>
            </div>
            {yesNo(k)}
          </div>
        ))}
        <label className="rounded-xl border border-border px-3 py-2.5">
          <span className={labelClass}>{t("ss_f_applies_to")}</span>
          {editing ? (
            <select className={cn(inputClass, "mt-1.5")} value={v.applies_to} onChange={(e) => set({ applies_to: e.target.value })}>
              {appliesTo.map((x) => (
                <option key={x} value={x}>
                  {t(`ss_applies_${x}`, { defaultValue: x })}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm font-semibold">{t(`ss_applies_${v.applies_to}`, { defaultValue: v.applies_to })}</p>
          )}
        </label>
      </div>

      <fieldset className="rounded-xl border border-border px-3 py-2.5">
        <legend className={cn(labelClass, "px-1")}>{t("ss_f_hold")}</legend>
        <div className="flex flex-wrap gap-4">
          {holds.map((x) => (
            <label key={x} className={cn("flex items-center gap-2 text-sm", !editing && v.hold !== x && "opacity-40")}>
              <input type="radio" name="ss-hold" disabled={!editing} checked={v.hold === x} onChange={() => set({ hold: x })} />
              {t(`ss_holdLong_${x}`, { defaultValue: x })}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <ListChecks size={15} /> {t("ss_reasons")}
          </p>
          {editing && (
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange((f) => ({ ...f, reasons: [...f.reasons, { code: "", name: "", translations: {}, for: "BOTH", note_required: false, enabled: true }] }))}>
              {t("ss_addReason")}
            </Button>
          )}
        </div>
        {!v.reasons.length ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">{t("ss_noReasons")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">{t("ss_code")}</th>
                  <th className="px-2 py-2">{t("ss_nameEn")}</th>
                  {others.map((c) => (
                    <th key={c} className="px-2 py-2">
                      {c.toUpperCase()}
                    </th>
                  ))}
                  <th className="px-2 py-2">{t("ss_for")}</th>
                  <th className="px-2 py-2 text-center">{t("ss_noteRequired")}</th>
                  <th className="px-2 py-2 text-center">{t("ss_enabled")}</th>
                  {editing && <th className="px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {v.reasons.map((x, i) => (
                  <tr key={i} className={cn("border-t border-border", x.enabled === false && "text-muted-foreground")}>
                    <td className="px-2 py-1.5">
                      {editing ? <input className={cn(inputClass, "w-36 py-1.5 font-mono text-xs")} value={x.code} maxLength={32} onChange={(e) => setReason(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} /> : <span className="font-mono">{x.code}</span>}
                    </td>
                    <td className="px-2 py-1.5">{editing ? <input className={cn(inputClass, "min-w-44 py-1.5 text-xs")} value={x.name} maxLength={128} onChange={(e) => setReason(i, { name: e.target.value })} /> : x.name}</td>
                    {others.map((c) => (
                      <td key={c} className="px-2 py-1.5">
                        {editing ? (
                          <input className={cn(inputClass, "min-w-40 py-1.5 text-xs")} value={x.translations?.[c] ?? ""} maxLength={128} placeholder={x.name} onChange={(e) => setReason(i, { translations: { ...(x.translations ?? {}), [c]: e.target.value } })} />
                        ) : (
                          x.translations?.[c] || <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select className={cn(inputClass, "py-1.5 text-xs")} value={x.for} onChange={(e) => setReason(i, { for: e.target.value })}>
                          {reasonFor.map((o) => (
                            <option key={o} value={o}>
                              {t(`ss_for_${o}`, { defaultValue: o })}
                            </option>
                          ))}
                        </select>
                      ) : (
                        t(`ss_for_${x.for}`, { defaultValue: x.for })
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">{editing ? <input type="checkbox" checked={Boolean(x.note_required)} onChange={(e) => setReason(i, { note_required: e.target.checked })} /> : x.note_required ? t("ss_yes") : t("ss_no")}</td>
                    <td className="px-2 py-1.5 text-center">{editing ? <Toggle checked={x.enabled !== false} onChange={(on) => setReason(i, { enabled: on })} /> : x.enabled !== false ? t("ss_yes") : t("ss_no")}</td>
                    {editing && (
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-0.5">
                          <button type="button" disabled={i === 0} title={i === 0 ? t("ss_alreadyFirst") : t("ss_moveUp")} onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" disabled={i === v.reasons.length - 1} title={i === v.reasons.length - 1 ? t("ss_alreadyLast") : t("ss_moveDown")} onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" title={t("ss_removeReason")} onClick={() => onChange((f) => ({ ...f, reasons: f.reasons.filter((_, j) => j !== i) }))} className="rounded p-1 text-red-600 hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editing && <p className="mt-1.5 text-[11px] text-muted-foreground">{t("ss_reasonsHint")}</p>}
      </div>
    </div>
  );
}
