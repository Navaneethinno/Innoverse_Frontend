import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { CopyButton } from "@/Components/Common/CopyButton";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { Modal } from "@/Components/Common/Modal";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { RowsEditor, useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { usePagePermission } from "@/Hooks/usePermission";
import { partnerApi } from "@/Services/PaysePay/paysePay.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ListInput, when } from "./docShared";

const FLAGS = ["active", "allow_balance", "allow_credit", "allow_debit"];
const toBody = (clients) =>
  clients.map((c) => ({
    client_id: String(c.client_id ?? "").trim(),
    name: String(c.name ?? "").trim(),
    ...Object.fromEntries(FLAGS.map((k) => [k, Boolean(c[k])])),
    max_amount: String(c.max_amount ?? ""),
    ip_allowlist: (c.ip_allowlist ?? []).map((x) => String(x).trim()).filter(Boolean),
  }));

function problemOf(t, form) {
  const ids = form.clients.map((c) => String(c.client_id ?? "").trim());
  if (ids.some((id) => !id) || form.clients.some((c) => !String(c.name ?? "").trim())) return t("pa_fillRequired");
  if (new Set(ids).size !== ids.length) return t("pa_clientOnce");
  return "";
}

// GLOBAL SETTINGS > Partner API (menu 261): the partner banks allowed to call
// the partner API and what each may do. One document under maker-checker;
// keys are issued apart (Authorise) and shown once.
export function PartnerApi() {
  const { t } = useTranslation("paysePay");
  const [version, setVersion] = useState(0);
  return (
    <SectionScreen
      key={version}
      api={partnerApi}
      ns="paysePay"
      valueKey="setup"
      fallbackTitle={t("pa_title")}
      subtitle={t("pa_subtitle")}
      toForm={(setup) => ({ clients: (setup?.clients ?? []).map((c) => ({ ...c })) })}
      bodyOf={(form) => ({ clients: toBody(form.clients) })}
      problemOf={(_, form) => problemOf(t, form)}
    >
      {({ data, shown, editing, setForm }) =>
        editing ? <ClientsEditor clients={shown?.clients ?? []} setForm={setForm} /> : <Clients data={data} clients={shown?.clients ?? []} onIssued={() => setVersion((v) => v + 1)} />
      }
    </SectionScreen>
  );
}

function ClientsEditor({ clients, setForm }) {
  const { t } = useTranslation("paysePay");
  return (
    <RowsEditor
      rows={clients}
      onChange={(next) => setForm({ clients: next })}
      blank={() => ({ client_id: "", name: "", active: true, allow_balance: false, allow_credit: false, allow_debit: false, max_amount: "", ip_allowlist: [] })}
      addLabel={t("pa_addClient")}
      columns="lg:grid-cols-4"
      fields={[
        { key: "client_id", label: t("pa_clientId"), type: "code", placeholder: "BANKX" },
        { key: "name", label: t("pa_name"), placeholder: "Bank X" },
        { key: "max_amount", label: t("pa_maxAmount"), type: "amount" },
        ...FLAGS.map((k) => ({ key: k, label: t(`pa_${k}`), type: "bool" })),
      ]}
      renderExtra={(row, set) => (
        <label className={cn(labelClass, "mt-2 block")}>
          {t("pa_ipAllowlist")}
          <ListInput field={{ key: "ip_allowlist", placeholder: "203.0.113.0/24" }} value={row.ip_allowlist} onChange={(ip_allowlist) => set({ ip_allowlist })} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("pa_ipHint")}</span>
        </label>
      )}
    />
  );
}

function Clients({ data, clients, onIssued }) {
  const { t } = useTranslation("paysePay");
  const can = usePagePermission();
  const [issue, setIssue] = useState(null);
  const keys = data?.keys ?? [];
  const inForce = new Set((data?.setup?.clients ?? []).map((c) => c.client_id));
  const keyOf = (id) => keys.find((k) => k.client_id === id);
  if (!clients.length) return <EmptyNote>{t("pa_none")}</EmptyNote>;
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <SimpleTable columns={[t("pa_clientId"), t("pa_name"), t("pa_rights"), t("pa_maxAmount"), t("pa_ipAllowlist"), t("pa_key"), ""]}>
          <tbody>
            {clients.map((c) => {
              const k = keyOf(c.client_id);
              const blocked = !can("Authorize") ? t("pa_noRight") : !inForce.has(c.client_id) ? t("pa_notInForce") : "";
              return (
                <tr key={c.client_id} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-mono font-semibold">{c.client_id}</td>
                  <td className="px-3 py-2">
                    {c.name}
                    {!c.active && <span className="ml-2 text-[10px] font-bold uppercase text-muted-foreground">{t("pa_inactive")}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{["allow_balance", "allow_credit", "allow_debit"].filter((x) => c[x]).map((x) => t(`pa_${x}`)).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-xs">{c.max_amount || t("noLimit")}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{(c.ip_allowlist ?? []).join(", ") || t("pa_anyIp")}</td>
                  <td className="px-3 py-2 text-xs">
                    {k ? (
                      <>
                        <p className="font-mono text-[11px]">{k.fingerprint}</p>
                        <p className="text-[10px] text-muted-foreground">{t("pa_issuedBy", { name: k.issued_by ?? "—", date: when(k.issued_at) })}</p>
                      </>
                    ) : (
                      t("pa_noKey")
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="xs" variant="outline" icon={KeyRound} disabled={Boolean(blocked)} disabledReason={blocked} onClick={() => setIssue({ client: c, rotate: Boolean(k) })}>
                      {k ? t("pa_rotateKey") : t("pa_issueKey")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </SimpleTable>
      </div>
      {issue && <IssueKey issue={issue} onClose={(issued) => (setIssue(null), issued && onIssued())} />}
    </>
  );
}

// Confirm, then the new key once, with a copy button: it cannot be shown again.
function IssueKey({ issue, onClose }) {
  const { t } = useTranslation(["paysePay", "loans"]);
  const { scope } = useInstitutionScope();
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(null);
  const run = async () => {
    setBusy(true);
    try {
      const r = await partnerApi.keyIssue(scope({ client_id: issue.client.client_id }));
      setKey(recordOf(r));
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (key) {
    return (
      <Modal open onClose={() => onClose(true)} title={t("pa_keyTitle", { client: key.client_id })} footer={<Button onClick={() => onClose(true)}>{t("pa_keySaved")}</Button>}>
        <div className="grid gap-3">
          <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            <AlertTriangle size={16} className="shrink-0" />
            {t("pa_keyWarning")}
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
            <code className="min-w-0 flex-1 break-all font-mono text-xs">{key.key}</code>
            <CopyButton value={key.key} size={14} />
          </div>
          <p className="text-xs text-muted-foreground">{t("pa_fingerprint")}: <span className="font-mono">{key.fingerprint}</span></p>
        </div>
      </Modal>
    );
  }
  return (
    <Modal
      open
      onClose={() => onClose(false)}
      title={issue.rotate ? t("pa_rotateKey") : t("pa_issueKey")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onClose(false)}>
            {t("loans:cancel")}
          </Button>
          <Button icon={KeyRound} loading={busy} variant={issue.rotate ? "danger" : "primary"} onClick={run}>
            {issue.rotate ? t("pa_rotateKey") : t("pa_issueKey")}
          </Button>
        </>
      }
    >
      <p className="text-sm">{issue.rotate ? t("pa_rotateHint", { client: issue.client.client_id }) : t("pa_issueHint", { client: issue.client.client_id })}</p>
    </Modal>
  );
}

