import { Modal } from "@/Components/Common/Modal";
import { useTranslation } from "react-i18next";

export function ActionConfirmModal({ open, title, narration, setNarration, required = false, pending = false, onClose, onConfirm }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} title={title} onClose={onClose} footer={
      <>
        <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-muted-foreground">{t("common:cancel")}</button>
        <button type="button" disabled={pending || (required && !narration.trim())} onClick={onConfirm} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>{t("common:confirm")}</button>
      </>
    }>
      <label className="block text-sm font-medium text-slate-700">
        Narration{required ? " *" : ""}
        <textarea value={narration} onChange={(event) => setNarration(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border border-border p-3" />
      </label>
    </Modal>
  );
}
