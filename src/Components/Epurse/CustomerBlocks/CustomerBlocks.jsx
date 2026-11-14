import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, LockOpen, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { TabButton } from "@/Components/Common/ListView";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { NarrationDialog, inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsEditor, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { PagedTable, usePagedCall } from "@/Components/InnoMMS/Ops/opsShared";
import { mmsDate } from "@/Components/InnoMMS/mmsShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { partyBlockApi, partyBlockReasonApi } from "@/Services/Merchant/ops.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { actorText } from "@/Utils/Lib/actor";
import { notifications } from "@/Utils/Lib/notifications";
import { rowsOf } from "@/Services/Epurse/onboarding.api";

const SCOPES = ["SIGN_IN", "DEBIT", "CREDIT", "ALL"];
const APPLIES = ["CUSTOMER", "MERCHANT", "BOTH"];
// "All" leads; the server's default is OPEN (pending, active or lift pending).
const STATUSES = ["ALL", "OPEN", "PENDING", "ACTIVE", "LIFT_PENDING", "LIFTED", "REJECTED"];
const PAGES = ["blocks", "dormant", "reasons"];

// ePurse > Customer Blocks (242): blocks on a customer or merchant (sign-in,
// money out, money in or all), under maker-checker; their reasons; and
// the dormant accounts.
export function CustomerBlocks() {
  const { t } = useTranslation("ops");
  const [page, setPage] = useState("blocks");
  return (
    <div className="pt-1 pb-6">
      <SegmentedSwitch className="mb-3" options={PAGES.map((key) => ({ key })).map(({ key }) => ({ value: key, label: ((k) => t(`blocksTab_${k}`))(key) }))} value={page} onChange={setPage} />
      {page === "blocks" && <Blocks />}
      {page === "dormant" && <Dormant />}
      {page === "reasons" && <BlockReasons />}
    </div>
  );
}

function useReasons() {
  const { scope } = useInstitutionScope();
  const [reasons, setReasons] = useState([]);
  useEffect(() => {
    partyBlockReasonApi
      .get(scope())
      .then((r) => setReasons((recordOf(r)?.setup?.reasons ?? []).filter((x) => x.enabled !== false)))
      .catch(() => setReasons([]));
  }, [scope]);
  return reasons;
}

function Blocks() {
  const { t } = useTranslation(["ops", "common"]);
  const can = usePagePermission();
  const menu = useMenuContext()?.menu;
  const [status, setStatus] = useState("OPEN");
  const [party, setParty] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const paged = usePagedCall({ call: partyBlockApi.list, sizeKey: "page_size", body: { status, ...(party ? { party } : {}), ...(search.trim() ? { search: search.trim() } : {}) } });

  const run = async (verb, body) => {
    setBusy(true);
    try {
      const r = await partyBlockApi[verb](body);
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      paged.reload();
    } catch (e) {
      notifications.error(e.message);
      // Changed meanwhile: the row on screen is out of date.
      if (e.code === "party_block.not_active" || e.code === "party_block.not_pending") {
        setDialog(null);
        paged.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      label: t("party"),
      render: (r) => (
        <div>
          <p className="font-semibold">{r.party_name ?? "—"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {t(`applies_${r.party}`, { defaultValue: r.party })} · {r.entity_type} {r.entity_id}
          </p>
        </div>
      ),
    },
    {
      label: t("reason"),
      render: (r) => (
        <div>
          <p>{r.reason_name ?? r.reason_code}</p>
          <p className="text-[10px] text-muted-foreground">{t(`scope_${r.scope}`, { defaultValue: r.scope })}</p>
        </div>
      ),
    },
    { label: t("remarks"), render: (r) => <span className="text-xs">{r.remarks || "—"}{r.lift_remarks ? <span className="block text-[10px] text-muted-foreground">{t("liftRemarks", { text: r.lift_remarks })}</span> : null}</span> },
    {
      label: t("requestedBy"),
      render: (r) => (
        <span className="text-xs">
          {actorText(r, "requested_by", "—")}
          <span className="block text-[10px] text-muted-foreground">{mmsDate(r.requested_at)}</span>
        </span>
      ),
    },
    {
      label: t("decidedBy"),
      render: (r) => (
        <span className="text-xs">
          {actorText(r, "decided_by", "—")}
          <span className="block text-[10px] text-muted-foreground">{mmsDate(r.decided_at)}</span>
          {r.lifted_at && <span className="block text-[10px] text-muted-foreground">{t("liftedBy", { by: actorText(r, "lifted_by", "—"), at: mmsDate(r.lifted_at) })}</span>}
          {r.lift_requested_at && !r.lifted_at && <span className="block text-[10px] text-muted-foreground">{t("liftRequestedBy", { by: actorText(r, "lift_requested_by", "—"), at: mmsDate(r.lift_requested_at) })}</span>}
        </span>
      ),
    },
    { label: t("common:status"), render: (r) => <StatusBadge status={r.status} label={t(`blockStatus_${r.status}`, { defaultValue: r.status })} /> },
    {
      label: t("common:actions"),
      render: (r) => {
        const a = r.actions ?? {};
        const pending = ["PENDING", "LIFT_PENDING"].includes(r.status);
        const checkWhy = !can("Authorize") ? t("whyNoPermission") : !a.auth ? t("whyMaker") : "";
        return (
          <div className="flex flex-wrap gap-1">
            {a.lift && (
              <Button size="sm" variant="secondary" icon={LockOpen} disabled={!can("Edit")} disabledReason={t("whyNoPermission")} onClick={() => setDialog({ kind: "lift", row: r })}>
                {t("lift")}
              </Button>
            )}
            {pending && (
              <>
                <Button size="sm" icon={CheckCircle2} disabled={Boolean(checkWhy)} disabledReason={checkWhy} onClick={() => setDialog({ kind: "auth", row: r })}>
                  {t("approve")}
                </Button>
                <Button size="sm" variant="danger" icon={XCircle} disabled={Boolean(checkWhy)} disabledReason={checkWhy} onClick={() => setDialog({ kind: "deauth", row: r })}>
                  {t("reject")}
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{menu ? menuLabel(menu) : t("blocksTitle")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("blocksSubtitle")}</p>
        </div>
        {can("Add") && (
          <Button icon={Ban} onClick={() => setDialog({ kind: "place" })}>
            {t("placeBlock")}
          </Button>
        )}
      </div>
      <PagedTable
        tabs={STATUSES.map((s) => (
          <TabButton key={s} active={status === s} onClick={() => setStatus(s)}>
            {t(`blockStatus_${s}`)}
          </TabButton>
        ))}
        paged={paged}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t("searchBlocks")}
        empty={t("noBlocks")}
        actions={<FilterSelect size="sm" className="w-60" value={party} onChange={(v) => setParty(String(v ?? ""))} options={[{ value: "", label: t("anyParty") }, ...["CUSTOMER", "MERCHANT"].map((p) => ({ value: p, label: t(`applies_${p}`) }))]} />}
        columns={columns}
      />
      {dialog?.kind === "place" && <PlaceDialog preset={dialog.preset} busy={busy} onClose={() => setDialog(null)} onSave={(body) => run("place", body)} />}
      {dialog?.kind === "lift" && <NarrationDialog title={t("liftTitle", { name: dialog.row.party_name })} hint={t("liftHint")} confirmLabel={t("lift")} label={t("remarks")} required busy={busy} onClose={() => setDialog(null)} onSave={(remarks) => run("lift", { id: dialog.row.id, remarks })} />}
      {(dialog?.kind === "auth" || dialog?.kind === "deauth") && (
        <NarrationDialog
          title={t(`blockConfirm_${dialog.kind}`, { name: dialog.row.party_name })}
          hint={t(dialog.row.status === "LIFT_PENDING" ? `blockConfirmLiftHint_${dialog.kind}` : `blockConfirmHint_${dialog.kind}`)}
          confirmLabel={t(dialog.kind === "auth" ? "approve" : "reject")}
          variant={dialog.kind === "deauth" ? "danger" : "primary"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={() => run(dialog.kind, { id: dialog.row.id })}
        />
      )}
    </>
  );
}

// Staff find the customer or merchant by name, phone number or id.
function PartyPicker({ value, onChange, preset }) {
  const { t } = useTranslation("ops");
  const presetOption = preset?.entity_type ? [{ value: `${preset.entity_type}:${preset.entity_id}`, label: preset.party_name ?? `${preset.entity_type} ${preset.entity_id}` }] : [];
  const [found, setFound] = useState(presetOption);
  const latest = useRef(0);
  const search = (text) => {
    if (!text) return;
    const ticket = ++latest.current;
    partyBlockApi
      .parties({ search: text, page_size: 20 })
      .then((r) => {
        if (ticket !== latest.current) return;
        setFound(rowsOf(r).map((p) => ({ value: `${p.entity_type}:${p.entity_id}`, label: [p.name, p.phone_number, p.status_name].filter(Boolean).join(" · ") })));
      })
      .catch((e) => notifications.error(e.message));
  };
  return <FilterSelect className="mt-1.5" value={value} onChange={(v) => onChange(String(v ?? ""))} onSearch={search} options={[{ value: "", label: t("typeToFindParty") }, ...found]} />;
}

export function PlaceDialog({ preset, busy, onClose, onSave }) {
  const { t } = useTranslation(["ops", "common"]);
  const reasons = useReasons();
  const [form, setForm] = useState({ entity_type: preset?.entity_type ?? "", entity_id: preset?.entity_id ? String(preset.entity_id) : "", reason_code: "", remarks: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const valid = form.entity_type.trim() && Number(form.entity_id) > 0 && form.reason_code && form.remarks.trim();
  const reason = reasons.find((r) => r.code === form.reason_code);
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("placeBlock")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy} disabled={!valid} disabledReason={reasons.length ? t("common:blockedFillRequired") : t("noReasonsYet")} onClick={() => onSave({ entity_type: form.entity_type.trim(), entity_id: Number(form.entity_id), reason_code: form.reason_code, remarks: form.remarks.trim() })}>
            {t("placeBlock")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`${labelClass} sm:col-span-2`}>
          {t("customerOrMerchant")} <span className="text-red-500">*</span>
          <PartyPicker preset={preset} value={form.entity_type ? `${form.entity_type}:${form.entity_id}` : ""} onChange={(v) => setForm((f) => ({ ...f, entity_type: v ? v.split(":")[0] : "", entity_id: v ? v.split(":")[1] : "" }))} />
        </div>
        <label className={`${labelClass} sm:col-span-2`}>
          {t("reason")} <span className="text-red-500">*</span>
          <FilterSelect className="mt-1.5" value={form.reason_code} onChange={set("reason_code")} options={[{ value: "", label: t("chooseReason") }, ...reasons.map((r) => ({ value: r.code, label: `${r.name} (${t(`scope_${r.scope}`, { defaultValue: r.scope })})` }))]} />
          {reason?.message && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("reasonMessage", { text: reason.message })}</span>}
          {!reasons.length && <span className="mt-1 block text-[11px] font-normal text-amber-700">{t("noReasonsYet")}</span>}
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          {t("remarks")} <span className="text-red-500">*</span>
          <textarea rows={3} className={`${inputClass} mt-1.5`} value={form.remarks} maxLength={500} onChange={set("remarks")} />
        </label>
        <p className="text-[11px] text-muted-foreground sm:col-span-2">{t("placeHint")}</p>
      </div>
    </Modal>
  );
}

// Accounts with the DORMANT restriction and their owner.
function Dormant() {
  const { t } = useTranslation(["ops", "common"]);
  const can = usePagePermission();
  const [search, setSearch] = useState("");
  const [placing, setPlacing] = useState(null);
  const [busy, setBusy] = useState(false);
  const paged = usePagedCall({ call: partyBlockApi.dormant_list, sizeKey: "page_size", body: search.trim() ? { search: search.trim() } : {} });
  const place = async (body) => {
    setBusy(true);
    try {
      const r = await partyBlockApi.place(body);
      if (r?.message) notifications.success(r.message);
      setPlacing(null);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle own>{t("dormantTitle")}</PageTitle>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("dormantSubtitle")}</p>
      <PagedTable
        paged={paged}
        rowKey={(r, i) => r.acct_id ?? r.acct_num ?? i}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t("searchDormant")}
        empty={t("noDormant")}
        columns={[
          { label: t("account"), render: (r) => <span className="font-mono">{r.acct_num}</span> },
          { label: t("owner"), render: (r) => <span>{r.party_name}<span className="block font-mono text-[10px] text-muted-foreground">{r.entity_type} {r.entity_id}</span></span> },
          { label: t("availableBalance"), render: (r) => <span className="tabular-nums">{r.avail_bal}</span> },
          { label: t("lastTxnAt"), render: (r) => (r.last_txn_at ? mmsDate(r.last_txn_at) : "—") },
          {
            label: t("common:actions"),
            render: (r) => (
              <Button size="sm" variant="secondary" icon={Ban} disabled={!can("Add")} disabledReason={t("whyNoPermission")} onClick={() => setPlacing(r)}>
                {t("placeBlock")}
              </Button>
            ),
          },
        ]}
      />
      {placing && <PlaceDialog preset={placing} busy={busy} onClose={() => setPlacing(null)} onSave={place} />}
    </>
  );
}

// The reasons document (/config/party_block/reason).
function BlockReasons() {
  const { t } = useTranslation("ops");
  const problemOf = (_, f) => {
    if (f.reasons.some((r) => !String(r.code ?? "").trim() || !String(r.name ?? "").trim() || !r.scope || !r.applies_to)) return t("fillRequired");
    if (new Set(f.reasons.map((r) => r.code.trim())).size !== f.reasons.length) return t("codeOnce");
    return "";
  };
  return (
    <SectionScreen
      api={partyBlockReasonApi}
      ns="ops"
      valueKey="setup"
      fallbackTitle={t("reasonsTitle")}
      subtitle={t("reasonsSubtitle")}
      toForm={(s) => ({ reasons: (s?.reasons ?? []).map((r) => ({ ...r })) })}
      bodyOf={(f) => ({ setup: { reasons: f.reasons.map((r) => ({ code: r.code.trim(), name: r.name.trim(), scope: r.scope, applies_to: r.applies_to, message: String(r.message ?? "").trim(), enabled: Boolean(r.enabled) })) } })}
      problemOf={problemOf}
    >
      {({ shown, editing, setForm }) => {
        const reasons = shown?.reasons ?? [];
        if (editing)
          return (
            <RowsEditor
              rows={reasons}
              onChange={(rows) => setForm({ reasons: rows })}
              blank={() => ({ code: "", name: "", scope: "", applies_to: "", message: "", enabled: true })}
              addLabel={t("addReason")}
              columns="lg:grid-cols-3"
              fields={[
                { key: "code", label: t("code"), placeholder: "FRAUD" },
                { key: "name", label: t("name"), placeholder: "Suspected fraud" },
                { key: "scope", label: t("scope"), type: "select", blank: t("choose"), options: SCOPES.map((s) => ({ value: s, label: t(`scope_${s}`) })) },
                { key: "applies_to", label: t("appliesTo"), type: "select", blank: t("choose"), options: APPLIES.map((s) => ({ value: s, label: t(`applies_${s}`) })) },
                { key: "message", label: t("customerMessage"), placeholder: "Your access is restricted. Please contact us." },
                { key: "enabled", label: t("enabled"), type: "bool" },
              ]}
            />
          );
        if (!reasons.length) return <EmptyNote>{t("noReasons")}</EmptyNote>;
        return (
          <SimpleTable columns={[t("code"), t("name"), t("scope"), t("appliesTo"), t("customerMessage"), t("enabled")]}>
            <tbody>
              {reasons.map((r) => (
                <tr key={r.code} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-mono">{r.code}</td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2">{t(`scope_${r.scope}`, { defaultValue: r.scope })}</td>
                  <td className="px-3 py-2">{t(`applies_${r.applies_to}`, { defaultValue: r.applies_to })}</td>
                  <td className="px-3 py-2">{r.message || "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.enabled ? "ACTIVE" : "INACTIVE"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </SimpleTable>
        );
      }}
    </SectionScreen>
  );
}
