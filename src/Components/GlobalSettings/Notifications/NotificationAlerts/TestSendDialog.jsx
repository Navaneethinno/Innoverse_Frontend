import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Facts } from "@/Components/InnoCBS/Deposits/depositShared";
import { InstitutionField } from "../notificationShared";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { notificationOutboxApi } from "@/Services/Epurse/notification.api";
import { notifications } from "@/Utils/Lib/notifications";
import { formatDateTime } from "@/Utils/Lib/dateFormat";

const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelClass = "text-xs font-semibold text-slate-700";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?\d{7,15}$/;

// Notifications (menu 169, Edit): send one test email or SMS and show how its
// delivery went. The server waits up to wait_seconds; not settled means the
// sender is still working and the row is in the outbox.
export function TestSendDialog({ onClose, onSent }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const isPlatform = useCanChooseInstitution();
  const [channel, setChannel] = useState("EMAIL");
  const [recipient, setRecipient] = useState("");
  const [instId, setInstId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const value = recipient.trim();
  const shapeOk = channel === "EMAIL" ? EMAIL.test(value) : PHONE.test(value.replace(/\s/g, ""));
  const blocked = !value ? t("common:blockedFillRequired") : !shapeOk ? t(channel === "EMAIL" ? "testEmailInvalid" : "testPhoneInvalid") : isPlatform && !instId ? t("common:blockedNeedsInstitution") : "";
  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await notificationOutboxApi.testSend({
        channel,
        recipient: channel === "SMS" ? value.replace(/\s/g, "") : value,
        wait_seconds: 15,
        ...(isPlatform && instId ? { inst_profile_id: Number(instId) } : {}),
      });
      setResult((Array.isArray(r?.data) ? r.data[0] : r?.data) ?? {});
      onSent?.();
    } catch (e) {
      notifications.error(e.status === 429 ? t("testRateLimited") : e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      size="md"
      onClose={onClose}
      title={t("testSendTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:close", { defaultValue: "Close" })}
          </Button>
          <Button icon={Send} loading={busy} disabled={Boolean(blocked) || busy} disabledReason={blocked || undefined} onClick={() => void send()}>
            {t("testSendButton")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t("testSendHint")}</p>
        {isPlatform && <InstitutionField value={instId} onChange={setInstId} />}
        <label className={labelClass}>
          {t("testChannel")}
          <FilterSelect
            className="mt-1.5"
            value={channel}
            onChange={(v) => {
              setChannel(v);
              setResult(null);
            }}
            options={[
              { value: "EMAIL", label: t("channel_EMAIL") },
              { value: "SMS", label: t("channel_SMS") },
            ]}
          />
        </label>
        <label className={labelClass}>
          {t("testRecipient")} <span className="text-red-500">*</span>
          <input className={inputClass} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={channel === "EMAIL" ? "ops@example.com" : "+258841234567"} />
        </label>
        {result && (
          <div className="grid gap-2 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={String(result.delivery_status ?? "-")} />
              {!result.settled && <span className="text-xs text-muted-foreground">{t("testNotSettled")}</span>}
            </div>
            <Facts
              className="sm:grid-cols-2 lg:grid-cols-2"
              rows={[
                [t("testOutboxId"), result.outbox_id],
                [t("testAttempts"), result.attempts],
                [t("testSentTime"), result.sent_time ? formatDateTime(result.sent_time) : "—"],
                result.last_error && [t("testLastError"), result.last_error, "text-red-600"],
              ]}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
