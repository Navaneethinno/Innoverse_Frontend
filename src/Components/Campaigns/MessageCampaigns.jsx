import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Ban, CalendarClock, CheckCircle2, Clock3, FilePen, ListChecks, Plus, Send, Trash2, Users, XCircle } from "lucide-react";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { RowActions } from "@/Components/Common/RowActions";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { DigitChips } from "@/Components/Common/DigitChips";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { NoAccess } from "@/Components/Common/NoAccess";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { campaignApi } from "@/Services/Campaigns/campaigns.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { formatDateTime } from "@/Utils/Lib/dateFormat";
import { firstOf, idsOf, usePagedList } from "./usePagedList";
import { NarrationDialog } from "./NarrationDialog";

const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelClass = "text-xs font-semibold text-slate-700";

// run_status: DRAFT (waiting authorisation), SCHEDULED, SENDING, SENT, CANCELLED.
const TABS = [
  ["all", "campaigns:tabAll", ListChecks],
  ["DRAFT", "campaigns:run_DRAFT", FilePen],
  ["SCHEDULED", "campaigns:run_SCHEDULED", CalendarClock],
  ["SENDING", "campaigns:run_SENDING", Clock3],
  ["SENT", "campaigns:run_SENT", CheckCircle2],
  ["CANCELLED", "campaigns:run_CANCELLED", XCircle],
];
const PARTY_KINDS = ["CUST_INDV", "CUST_CORP", "MERCH_INDV", "MERCH_CORP"];
const CHANNELS = ["PUSH", "SMS", "INBOX", "EMAIL"];
const DEFAULT_CHANNELS = ["PUSH", "SMS", "INBOX"];
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));
const ID_LISTS = ["kyc_level_ids", "acct_product_ids", "digital_product_ids", "branch_ids"];

const blank = () => ({
  name: "",
  title: "",
  body: "",
  audience: { party_kinds: [], kyc_level_ids: [], acct_product_ids: [], digital_product_ids: [], branch_ids: [], active_within_days: "", inactive_for_days: "" },
  channels: [...DEFAULT_CHANNELS],
  quiet_start_hour: "21",
  quiet_end_hour: "8",
  send_at: "",
  narration: "",
});

// A saved campaign as the form edits it.
function toForm(c) {
  const a = c.audience ?? {};
  return {
    name: c.name ?? "",
    title: c.title ?? "",
    body: c.body ?? "",
    audience: {
      party_kinds: a.party_kinds ?? [],
      ...Object.fromEntries(ID_LISTS.map((k) => [k, (a[k] ?? []).map(String)])),
      active_within_days: a.active_within_days ? String(a.active_within_days) : "",
      inactive_for_days: a.inactive_for_days ? String(a.inactive_for_days) : "",
    },
    channels: c.channels?.length ? c.channels : [...DEFAULT_CHANNELS],
    quiet_start_hour: String(c.quiet_start_hour ?? 21),
    quiet_end_hour: String(c.quiet_end_hour ?? 8),
    // "YYYY-MM-DD HH:MM" for the datetime box.
    send_at: c.send_at ? String(c.send_at).replace(" ", "T").slice(0, 16) : "",
    narration: "",
  };
}

const audienceBody = (a) => ({
  party_kinds: a.party_kinds,
  ...Object.fromEntries(ID_LISTS.map((k) => [k, idsOf(a[k])])),
  ...(a.active_within_days ? { active_within_days: Number(a.active_within_days) } : {}),
  ...(a.inactive_for_days ? { inactive_for_days: Number(a.inactive_for_days) } : {}),
});

const days = (v) => String(v).replace(/\D/g, "").slice(0, 4);

// The audience: who gets it. Empty lists mean anyone.
function AudienceBuilder({ value, onChange, t }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const [size, setSize] = useState(null);
  const [busy, setBusy] = useState(false);
  const preview = async () => {
    setBusy(true);
    try {
      setSize(firstOf(await campaignApi.preview({ audience: audienceBody(value) }))?.audience_size ?? 0);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-3 rounded-xl border border-border p-3">
      <p className="text-sm font-bold text-slate-800">{t("audience")}</p>
      <p className="text-[11px] text-muted-foreground">{t("audienceHint")}</p>
      <div>
        <p className={labelClass}>{t("partyKinds")}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PARTY_KINDS.map((k) => (
            <CheckboxPill key={k} checked={value.party_kinds.includes(k)} label={t(`party_${k}`)} onChange={(on) => set({ party_kinds: on ? [...value.party_kinds, k] : value.party_kinds.filter((x) => x !== k) })} />
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ID_LISTS.map((k) => (
          <label key={k} className={labelClass}>
            {t(k)}
            <DigitChips className="mt-1.5" value={value[k]} onChange={(list) => set({ [k]: list })} placeholder="12" />
          </label>
        ))}
        <label className={labelClass}>
          {t("activeWithinDays")}
          <input className={inputClass} inputMode="numeric" value={value.active_within_days} onChange={(e) => set({ active_within_days: days(e.target.value) })} placeholder="30" />
        </label>
        <label className={labelClass}>
          {t("inactiveForDays")}
          <input className={inputClass} inputMode="numeric" value={value.inactive_for_days} onChange={(e) => set({ inactive_for_days: days(e.target.value) })} placeholder="90" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" icon={Users} loading={busy} onClick={() => void preview()}>
          {t("previewAudience")}
        </Button>
        {size != null && <span className="text-sm font-semibold">{t("audienceSize", { count: size })}</span>}
      </div>
    </div>
  );
}

// Channels in order: the next is tried when the party has no device, phone
// or email, or the message failed.
function ChannelOrder({ value, onChange, t }) {
  const move = (i, d) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const unused = CHANNELS.filter((c) => !value.includes(c));
  return (
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <p className="text-sm font-bold text-slate-800">{t("channels")}</p>
      <p className="text-[11px] text-muted-foreground">{t("channelsHint")}</p>
      {value.map((c, i) => (
        <div key={c} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
          <span className="w-6 font-bold tabular-nums">{i + 1}.</span>
          <span className="flex-1 font-semibold">{t(`channel_${c}`)}</span>
          {i > 0 && <ActionIconButton label={t("moveUp")} intent="view" icon={ArrowUp} onClick={() => move(i, -1)} />}
          {i < value.length - 1 && <ActionIconButton label={t("moveDown")} intent="view" icon={ArrowDown} onClick={() => move(i, 1)} />}
          {value.length > 1 && <ActionIconButton label={t("removeChannel")} intent="delete" icon={Trash2} onClick={() => onChange(value.filter((x) => x !== c))} />}
        </div>
      ))}
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unused.map((c) => (
            <Button key={c} size="xs" variant="dashed" icon={Plus} onClick={() => onChange([...value, c])}>
              {t(`channel_${c}`)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignForm({ campaign, onClose, onSaved }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const [form, setForm] = useState(() => (campaign ? toForm(campaign) : blank()));
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const missing = !form.name.trim() || !form.title.trim() || !form.body.trim() || !form.channels.length;
  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        audience: audienceBody(form.audience),
        channels: form.channels,
        quiet_start_hour: Number(form.quiet_start_hour),
        quiet_end_hour: Number(form.quiet_end_hour),
        // "YYYY-MM-DD HH:MM" (platform clock); empty: once authorised.
        send_at: form.send_at ? form.send_at.replace("T", " ") : "",
        narration: form.narration.trim(),
      };
      const r = campaign ? await campaignApi.edit({ id: campaign.id, ...body }) : await campaignApi.add(body);
      notifications.success(apiMessage(r, t("saved")));
      onSaved();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={campaign ? t("editCampaign", { name: campaign.name }) : t("addCampaign")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button icon={Send} loading={busy} disabled={missing || busy} disabledReason={missing ? t("common:blockedFillRequired") : undefined} onClick={() => void save()}>
            {t("submitForApproval")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            {t("name")} <span className="text-red-500">*</span>
            <input className={inputClass} maxLength={100} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Year-end savings promotion" />
          </label>
          <label className={labelClass}>
            {t("messageTitle")} <span className="text-red-500">*</span>
            <input className={inputClass} maxLength={120} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Save more this December" />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            {t("messageBody")} <span className="text-red-500">*</span>
            <textarea className={`${inputClass} min-h-24`} value={form.body} onChange={(e) => set({ body: e.target.value })} placeholder="Open a savings account this month and earn a bonus." />
          </label>
        </div>
        <AudienceBuilder t={t} value={form.audience} onChange={(audience) => set({ audience })} />
        <ChannelOrder t={t} value={form.channels} onChange={(channels) => set({ channels })} />
        <div className="grid gap-3 md:grid-cols-3">
          <label className={labelClass}>
            {t("quietStart")}
            <FilterSelect className="mt-1.5" value={form.quiet_start_hour} onChange={(v) => set({ quiet_start_hour: v })} options={HOURS} />
          </label>
          <label className={labelClass}>
            {t("quietEnd")}
            <FilterSelect className="mt-1.5" value={form.quiet_end_hour} onChange={(v) => set({ quiet_end_hour: v })} options={HOURS} />
          </label>
          <label className={labelClass}>
            {t("sendAt")}
            <input type="datetime-local" className={inputClass} value={form.send_at} onChange={(e) => set({ send_at: e.target.value })} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("sendAtHint")}</span>
          </label>
        </div>
        <p className="-mt-2 text-[11px] text-muted-foreground">{t("quietHint")}</p>
        <label className={labelClass}>
          {t("narration")}
          <input className={inputClass} value={form.narration} onChange={(e) => set({ narration: e.target.value })} />
        </label>
      </div>
    </Modal>
  );
}

// Count tables from stats.by_state / by_channel ({key: count}).
function CountTable({ title, counts, labelOf, t }) {
  const entries = Object.entries(counts ?? {});
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {entries.length ? (
        <SimpleTable columns={[t("item"), { label: t("count"), align: "right" }]}>
          <tbody>
          {entries.map(([k, n]) => (
            <tr key={k}>
              <td className="px-3 py-1.5 text-sm">{labelOf(k)}</td>
              <td className="px-3 py-1.5 text-right text-sm font-semibold tabular-nums">{typeof n === "object" ? JSON.stringify(n) : n}</td>
            </tr>
          ))}
          </tbody>
        </SimpleTable>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function CampaignView({ id, onClose }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const [c, setC] = useState(null);
  useEffect(() => {
    let cancelled = false;
    campaignApi
      .get({ id })
      .then((r) => !cancelled && setC(firstOf(r) ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [id, onClose]);
  const s = c?.stats ?? {};
  const a = c?.audience ?? {};
  return (
    <Modal open size="xl" onClose={onClose} title={c?.name ?? t("campaign")}>
      {!c ? (
        <p className="text-sm text-muted-foreground">{t("common:loading", { defaultValue: "Loading…" })}</p>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={t(`run_${c.run_status}`, { defaultValue: c.run_status ?? "-" })} />
          </div>
          <Facts
            rows={[
              [t("messageTitle"), c.title],
              [t("channels"), (c.channels ?? []).map((x) => t(`channel_${x}`)).join(" → ")],
              [t("sendAt"), c.send_at ? formatDateTime(c.send_at) : t("onceAuthorised")],
              [t("quietHours"), `${c.quiet_start_hour ?? 21}:00 → ${c.quiet_end_hour ?? 8}:00`],
              [t("partyKinds"), (a.party_kinds ?? []).map((k) => t(`party_${k}`)).join(", ") || t("anyone")],
              ...ID_LISTS.map((k) => [t(k), (a[k] ?? []).join(", ") || t("anyone")]),
              [t("activeWithinDays"), a.active_within_days || "—"],
              [t("inactiveForDays"), a.inactive_for_days || "—"],
              [t("fallbacks"), s.fallbacks ?? 0],
              [t("optedOutNow"), s.opted_out_now ?? 0],
            ]}
          />
          <p className="whitespace-pre-wrap rounded-xl border border-border p-3 text-sm">{c.body}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <CountTable t={t} title={t("byState")} counts={s.by_state} labelOf={(k) => k} />
            <CountTable t={t} title={t("byChannel")} counts={s.by_channel} labelOf={(k) => t(`channel_${k}`, { defaultValue: k })} />
          </div>
        </div>
      )}
    </Modal>
  );
}

// GLOBAL SETTINGS > Campaigns (menu 248): a message to an audience over
// ordered channels, maker-checker, sent by the CAMPAIGNS job.
export function MessageCampaigns() {
  const { t } = useTranslation(["campaigns", "common"]);
  const can = usePagePermission();
  const [status, setStatus] = useState("all");
  const call = useCallback((body) => campaignApi.list(body), []);
  const list = usePagedList(call, status !== "all" ? { status } : {});
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [action, setAction] = useState(null);
  const closeView = useCallback(() => setViewing(null), []);
  if (!can("View")) return <NoAccess />;
  const open = async (row) => {
    try {
      setEditing(firstOf(await campaignApi.get({ id: row.id })) ?? row);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const columns = [
    { key: "name", label: t("name"), align: "left", render: (r) => <span className="font-semibold">{r.name}<span className="block text-[11px] font-normal text-muted-foreground">{r.title}</span></span> },
    { key: "channels", label: t("channels"), render: (r) => <span className="text-xs">{(r.channels ?? []).map((x) => t(`channel_${x}`)).join(" → ")}</span> },
    { key: "send_at", label: t("sendAt"), render: (r) => <span className="whitespace-nowrap text-xs">{r.send_at ? formatDateTime(r.send_at) : t("onceAuthorised")}</span> },
    { key: "run_status", label: t("runStatus"), render: (r) => <StatusBadge status={t(`run_${r.run_status}`, { defaultValue: r.run_status ?? "-" })} /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => {
        // Only what the server says this user may do on this row.
        const a = r.actions ?? {};
        return (
          <div className="flex items-center justify-center gap-1">
            <RowActions
              buttons={{ view: true, edit: Boolean(a.edit), authorize: Boolean(a.auth), deauthorize: Boolean(a.deauth) }}
              onView={() => setViewing(r.id)}
              onEdit={() => void open(r)}
              onAuthorize={() => setAction({ verb: "auth", row: r })}
              onDeauthorize={() => setAction({ verb: "deauth", row: r })}
            />
            {a.cancel && <ActionIconButton label={t("cancelCampaign")} intent="delete" icon={Ban} onClick={() => setAction({ verb: "cancel", row: r })} />}
          </div>
        );
      },
    },
  ];
  const labels = { auth: t("common:authorize"), deauth: t("common:deauthorize"), cancel: t("cancelCampaign") };
  return (
    <div>
      <div className="mb-4">
        <PageTitle>{t("messageCampaignsTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("messageCampaignsSubtitle")}</p>
      </div>
      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
        <StatusFilterTabs
          tabs={TABS}
          serverFiltered
          total={list.total}
          rows={list.rows}
          value={status}
          onChange={setStatus}
          {...list.searchBind}
          searchPlaceholder={t("searchCampaigns")}
          actions={
            can("Add") && (
              <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
                {t("addCampaign")}
              </Button>
            )
          }
          bare
        />
        <DataTable columns={columns} rows={list.rows} rowKey={(r) => r.id} isLoading={list.loading} title={t("messageCampaignsTitle")} emptyTitle={t("noCampaigns")} serverPagination={list.serverPagination} />
      </div>
      {editing && (
        <CampaignForm
          campaign={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
      {viewing && <CampaignView id={viewing} onClose={closeView} />}
      {action && (
        <NarrationDialog
          title={`${labels[action.verb]} · ${action.row.name}`}
          confirmLabel={labels[action.verb]}
          destructive={action.verb !== "auth"}
          needsNarration={action.verb === "deauth"}
          withNarration={action.verb !== "cancel"}
          run={(narration) => campaignApi[action.verb](action.verb === "cancel" ? { id: action.row.id } : { id: action.row.id, narration })}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
