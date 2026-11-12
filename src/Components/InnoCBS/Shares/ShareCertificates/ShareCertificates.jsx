import { Download, Printer, RefreshCcw } from "lucide-react";
import { cell, dateCell, first, useL } from "@/Components/InnoCBS/cbsOps";
import { notifications } from "@/Utils/Lib/notifications";
import { downloadAttachment, saveBlob } from "@/Services/api/fileTransfer";
import { OpsList } from "@/Components/InnoCBS/OpsList";
import { SH, Status, certificateApi, memberCell, printCertificate } from "@/Components/InnoCBS/Shares/shareShared";

export function ShareCertificates() {
  const L = useL();
  const view = (r) =>
    certificateApi
      .get({ id: r.id })
      .then((x) => printCertificate(first(x)))
      .catch((e) => notifications.error(e.message));
  return (
    <OpsList
      api={certificateApi}
      title="shareCertificates"
      sub="Share certificates issued, cancelled and reissued. Print one, or reissue a lost or damaged one."
      rowKey={(r) => r.id ?? r.certificate_number}
      columns={[
        { key: "certificate_number", label: L("certificate"), render: (r) => <span className="font-mono text-xs font-bold">{r.certificate_number}</span> },
        { key: "member_number", label: L("member"), align: "left", render: memberCell },
        { key: "share_category_code", label: L("category"), render: (r) => cell(r.share_category_code) },
        { key: "shares", label: L("shares"), render: (r) => cell(r.shares) },
        { key: "range", label: L("Numbers"), sortable: false, render: (r) => cell(`${r.from_number}–${r.to_number}`) },
        { key: "issued_on", label: L("issued_on"), render: (r) => dateCell(r.issued_on) },
        { key: "issued_by", label: L("issued_by"), render: (r) => cell(r.issued_by) },
        { key: "cancelled_on", label: L("cancelled_on"), render: (r) => dateCell(r.cancelled_on) },
        { key: "status", label: L("status"), render: (r) => <Status code={r.status} /> },
      ]}
      rowActions={(r) => [
        { key: "print", flag: "_print", label: L("Print"), icon: Printer, onPress: () => view(r) },
        {
          key: "pdf",
          flag: "_pdf",
          label: L("Download PDF"),
          icon: Download,
          onPress: () =>
            downloadAttachment(`${SH}/certificate/pdf`, { id: r.id }, `share-certificate-${r.certificate_number}.pdf`)
              .then(({ blob, fileName }) => saveBlob(blob, fileName))
              .catch((e) => notifications.error(e.message)),
        },
        { key: "reissue", label: L("Reissue"), icon: RefreshCcw, dialog: { title: `${L("Reissue")} · ${r.certificate_number}`, hint: L("The old certificate is cancelled and a new number carries the same shares. It takes effect at once."), fields: [{ key: "reason", label: L("reason"), type: "textarea", required: true }], run: (x) => certificateApi.reissue({ id: r.id, reason: x.reason }), after: (reply) => first(reply) && printCertificate(first(reply)) } },
      ]}
    />
  );
}
