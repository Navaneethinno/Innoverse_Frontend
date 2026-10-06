import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";
import { notifications } from "@/Utils/Lib/notifications";
import { ink, loadLogo, rgb, tint } from "../Shared/reportPdf";

// The KYC Report as a printed bank form (A4 portrait): the institution's
// logo and name on top, its logo faint behind every page, the selfie in a
// photo box on the right, and every detail as a labelled form field, then
// the risk, AML, identity, accounts and sign-in sections and a sign-off
// block for the reviewer.

const rowsOf = (v) => (Array.isArray(v) ? v : []);
const when = (v) => (v ? new Date(v).toLocaleString() : "");
const day = (v) => (v ? new Date(v).toLocaleDateString() : "");
// A status code as words: PENDING_REVIEW -> Pending review.
const words = (v) => (v ? String(v).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "");
const text = (v) => (v === null || v === undefined ? "" : typeof v === "object" ? Object.values(v).filter((x) => x !== null && x !== "").join(" · ") : String(v));

// A profile answer as text (choice labels, lists, yes/no).
function answer(field, value, t) {
  if (value === null || value === undefined || value === "") return "";
  if (field?.field_type === "FILE") return t("inDocuments");
  const label = (v) => field?.choices?.find((c) => String(c.value) === String(v))?.label ?? v;
  if (Array.isArray(value)) return value.map(label).join(", ");
  if (typeof value === "boolean") return value ? t("yes") : t("no");
  return text(typeof value === "object" ? value : label(value));
}

// A stored image as JPEG data for the PDF, or null.
async function photoData(download, path) {
  if (!path) return null;
  try {
    const blob = await download(path);
    if (!blob?.type?.startsWith("image/")) return null;
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 700 / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const g = canvas.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(image, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL("image/jpeg", 0.88), ratio: canvas.width / canvas.height };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

const PAGE = { w: 210, h: 297, m: 14 };

async function buildPdf({ data, t, title, brand, logo, selfie }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title });
  const base = rgb(brand?.color);
  const accent = ink(base);
  const full = PAGE.w - PAGE.m * 2;
  const bottom = PAGE.h - PAGE.m - 6;
  const summary = data.summary ?? {};
  const report = data.report ?? {};
  let y = PAGE.m;

  const watermark = () => {
    if (!logo) return;
    const w = Math.min(140, 120 * logo.ratio);
    const h = w / logo.ratio;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.addImage(logo.data, "PNG", (PAGE.w - w) / 2, (PAGE.h - h) / 2, w, h);
    doc.restoreGraphicsState();
  };
  const newPage = () => {
    doc.addPage();
    watermark();
    y = PAGE.m;
  };
  const ensure = (h) => {
    if (y + h > bottom) newPage();
  };

  // Section heading: a tinted bar with an accent edge.
  // Kept with the first row under it: never alone at a page's foot.
  const heading = (label) => {
    ensure(30);
    y += 3;
    doc.setFillColor(...tint(base, 0.12));
    doc.rect(PAGE.m, y, full, 7, "F");
    doc.setFillColor(...accent);
    doc.rect(PAGE.m, y, 1.4, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...accent);
    doc.text(String(label).toUpperCase(), PAGE.m + 4, y + 4.8);
    y += 10;
  };

  // Form fields: a small label over a ruled box, `cols` to a row.
  const fields = (items, { cols = 2, width = full, x0 = PAGE.m } = {}) => {
    const gap = 4;
    const w = (width - gap * (cols - 1)) / cols;
    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols);
      doc.setFontSize(8.5);
      const lines = row.map(([, v]) => doc.splitTextToSize(text(v) || "—", w - 4));
      const boxH = Math.max(7, ...lines.map((l) => l.length * 3.8 + 3.2));
      ensure(boxH + 5);
      row.forEach(([label], c) => {
        const x = x0 + c * (w + gap);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(String(label).toUpperCase(), x, y + 2.5);
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y + 3.5, w, boxH, 0.8, 0.8, "S");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(lines[c][0] === "—" ? 148 : 31, lines[c][0] === "—" ? 163 : 41, lines[c][0] === "—" ? 184 : 55);
        doc.text(lines[c], x + 2, y + 3.5 + 4.6);
      });
      y += boxH + 6;
    }
  };

  // A ruled table; widths are fractions of the page width.
  const table = (head, rows, fractions) => {
    if (!rows.length) {
      ensure(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(t("none"), PAGE.m + 1, y + 3);
      y += 7;
      return;
    }
    const widths = fractions.map((f) => f * full);
    const draw = (cells, bold) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(7.5);
      const lines = cells.map((c, i) => doc.splitTextToSize(text(c) || "—", widths[i] - 3));
      const h = Math.max(...lines.map((l) => l.length)) * 3.4 + 2.6;
      ensure(h);
      let x = PAGE.m;
      if (bold) {
        doc.setFillColor(...tint(base, 0.16));
        doc.rect(PAGE.m, y, full, h, "F");
      }
      doc.setDrawColor(209, 213, 219);
      doc.setTextColor(...(bold ? accent : [31, 41, 55]));
      lines.forEach((l, i) => {
        doc.rect(x, y, widths[i], h, "S");
        doc.text(l, x + 1.5, y + 3.6);
        x += widths[i];
      });
      y += h;
    };
    draw(head, true);
    rows.forEach((r) => draw(r, false));
    y += 4;
  };

  // --- Letterhead -----------------------------------------------------------
  watermark();
  const logoH = 13;
  if (logo) doc.addImage(logo.data, "PNG", PAGE.m, y, Math.min(55, logoH * logo.ratio), Math.min(55, logoH * logo.ratio) / logo.ratio);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...accent);
  doc.text(title, PAGE.w - PAGE.m, y + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (brand?.name) doc.text(brand.name, PAGE.w - PAGE.m, y + 9.5, { align: "right" });
  doc.text(`${t("generatedOn")}: ${new Date().toLocaleString()}`, PAGE.w - PAGE.m, y + 13.5, { align: "right" });
  y += logoH + 4;
  doc.setFillColor(...accent);
  doc.rect(PAGE.m, y, full, 0.8, "F");
  y += 5;

  // --- Applicant, with the photo on the right ---------------------------------
  heading(t("applicant"));
  const photoW = 34;
  const photoH = 42;
  const top = y;
  const px = PAGE.w - PAGE.m - photoW;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.4);
  doc.rect(px, top, photoW, photoH, "S");
  doc.setLineWidth(0.2);
  if (selfie) {
    // Cover the box, centred.
    const boxRatio = photoW / photoH;
    let w = photoW;
    let h = photoH;
    if (selfie.ratio > boxRatio) w = photoH * selfie.ratio;
    else h = photoW / selfie.ratio;
    doc.saveGraphicsState();
    doc.rect(px, top, photoW, photoH, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(selfie.data, "JPEG", px + (photoW - w) / 2, top + (photoH - h) / 2, w, h);
    doc.restoreGraphicsState();
    doc.rect(px, top, photoW, photoH, "S");
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(doc.splitTextToSize(t("noPhoto"), photoW - 6), px + photoW / 2, top + photoH / 2, { align: "center" });
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(t("selfie").toUpperCase(), px + photoW / 2, top + photoH + 3.5, { align: "center" });

  const p = summary.profile ?? {};
  const o = summary.onboarding ?? {};
  const type = summary.customer_type ?? {};
  fields(
    [
      [t("name"), p.display_name],
      [t("type"), [type.name, type.ownership_name].filter(Boolean).join(" · ")],
      [t("status"), p.status != null ? t(`status_${p.status}`, { defaultValue: String(p.status) }) : ""],
      [t("onboardingStatus"), words(o.onboarding_status)],
      [t("phone"), o.phone_number],
      [t("email"), o.email],
      [t("channel"), o.channel],
      [t("reference"), o.reference_id],
    ],
    { width: full - photoW - 6 },
  );
  y = Math.max(y, top + photoH + 7);

  // --- Profile -------------------------------------------------------------
  const profile = data.profile;
  if (Array.isArray(profile)) {
    profile.forEach((section) => {
      const visible = rowsOf(section.fields).filter((f) => f.field_type !== "PIN" && f.field_type !== "FILE");
      if (!visible.length) return;
      heading(section.heading ?? section.key);
      const list = section.multi_row ? rowsOf(section.values) : [section.values ?? {}];
      if (!list.length) table([], [], []);
      list.forEach((values, i) => {
        if (section.multi_row) {
          ensure(8);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text(t("row", { n: i + 1 }), PAGE.m, y + 2);
          y += 4;
        }
        fields(visible.map((f) => [f.label ?? f.key, answer(f, values?.[f.key], t)]));
      });
    });
  } else if (profile && typeof profile === "object") {
    Object.entries(profile).forEach(([section, values]) => {
      heading(section.replace(/_/g, " "));
      if (values && typeof values === "object") fields(Object.entries(values).map(([k, v]) => [k.replace(/_/g, " "), answer(null, v, t)]));
    });
  }

  // --- KYC, risk and AML at a glance ----------------------------------------
  const kyc = summary.kyc ?? {};
  const risk = report.risk ?? summary.risk;
  const aml = summary.aml;
  heading(t("assessment"));
  fields(
    [
      [t("kyc"), kyc.level_name ?? (kyc.level_no != null ? `${t("level")} ${kyc.level_no}` : t("noKyc"))],
      [t("kycStatus"), kyc.kyc_status],
      [t("riskScore"), risk ? `${risk.risk_score} · ${risk.level_name ?? risk.level_code}` : t("notAssessed")],
      [t("action"), risk?.risk_action_name],
      [t("amlBand"), aml ? `${aml.effective_score ?? aml.score} · ${aml.effective_band?.name ?? aml.status}` : t("notScreened")],
      [t("matches"), aml?.match_count],
    ],
    { cols: 3 },
  );
  if (risk?.breakdown?.criteria?.length) {
    table(
      [t("criterion"), t("answer"), t("weight"), t("points")],
      risk.breakdown.criteria.map((c) => [c.field_name ?? c.field_code, c.answered === false ? t("notAnswered") : c.value_name, c.weight, c.max_points != null ? `${c.points} / ${c.max_points}` : c.points]),
      [0.35, 0.35, 0.12, 0.18],
    );
  }

  // --- Identity checks ------------------------------------------------------
  heading(t("identityChecks"));
  table(
    [t("status"), t("steps"), t("channel"), t("time")],
    rowsOf(report.identity_checks).map((c) => [
      c.status === "FAILED" && c.failed_step ? `${c.status} (${c.failed_step})` : c.status,
      rowsOf(c.steps).map((s) => `${s.step}: ${s.ok ? "OK" : "FAILED"}`).join(", "),
      [c.channel, c.actor].filter(Boolean).join(" · "),
      when(c.created_time),
    ]),
    [0.2, 0.45, 0.15, 0.2],
  );

  // --- AML screenings -------------------------------------------------------
  heading(t("screenings"));
  table(
    [t("party"), t("subject"), t("score"), t("band"), t("matches"), t("time")],
    rowsOf(report.aml_screenings).map((s) => [s.party_role, text(s.subject), s.effective_score ?? s.score, s.effective_band?.name ?? s.status, s.match_count, when(s.screened_at)]),
    [0.14, 0.32, 0.1, 0.14, 0.1, 0.2],
  );

  // --- Accounts and cards ---------------------------------------------------
  heading(t("accountsBlock"));
  table(
    [t("account"), t("product"), t("available"), t("ledger"), t("status"), t("opened")],
    rowsOf(report.accounts).map((a) => [a.acct_num, a.acct_product_name, `${text(a.avail_bal)} ${a.currency_code ?? ""}`, `${text(a.ledger_bal)} ${a.currency_code ?? ""}`, a.status_name, day(a.opened_at)]),
    [0.2, 0.22, 0.16, 0.16, 0.12, 0.14],
  );
  if (rowsOf(report.cards).length) {
    heading(t("cards"));
    table(
      [t("card"), t("product"), t("nameOnCard"), t("expiry"), t("ops")],
      report.cards.map((c) => [c.pan_masked, c.card_product_name, c.name_on_card, c.expiry_month ? `${String(c.expiry_month).padStart(2, "0")}/${c.expiry_year}` : "", c.ops_status]),
      [0.24, 0.24, 0.24, 0.12, 0.16],
    );
  }

  // --- Sign-in --------------------------------------------------------------
  heading(t("signIn"));
  const access = rowsOf(report.access);
  if (!access.length) table([], [], []);
  access.forEach((a) => {
    const locked = a.pin_locked === true || (a.locked_until && new Date(a.locked_until) > new Date());
    fields(
      [
        [t("loginId"), a.login_id],
        [t("status"), [words(a.status), locked ? t("locked") : null].filter(Boolean).join(" · ")],
        [t("lastLogin"), when(a.last_login_at)],
        [t("failedLogins"), a.failed_logins],
        [t("passwordSet"), a.password_set ? t("yes") : t("no")],
        [t("signinPin"), a.signin_pin_set ? t("set") : t("notSet")],
        [t("txnPin"), a.pin_set ? t("set") : t("notSet")],
      ],
      { cols: 3 },
    );
  });

  // --- Record details -------------------------------------------------------
  const ob = report.onboarding ?? {};
  const rec = report.profile_record ?? {};
  heading(t("recordDetails"));
  fields(
    [
      [t("signupStarted"), when(ob.started_at)],
      [t("signupCompleted"), when(ob.completed_at)],
      [t("attempts"), ob.attempt_count],
      [t("createdBy"), [rec.created_by, when(rec.created_time)].filter(Boolean).join(" · ")],
      [t("lastChangedBy"), [rec.updated_by, when(rec.updated_time)].filter(Boolean).join(" · ")],
      [t("approval"), words(rec.auth_status)],
    ],
    { cols: 3 },
  );

  // --- Sign-off: filled in by hand ------------------------------------------
  ensure(30);
  heading(t("reviewedBy"));
  const third = (full - 8) / 3;
  [t("reviewerName"), t("signature"), t("date")].forEach((label, i) => {
    const x = PAGE.m + i * (third + 4);
    doc.setDrawColor(148, 163, 184);
    doc.line(x, y + 12, x + third, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x, y + 16);
  });
  y += 20;

  // --- Footer on every page -------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n += 1) {
    doc.setPage(n);
    doc.setDrawColor(226, 232, 240);
    doc.line(PAGE.m, PAGE.h - 10, PAGE.w - PAGE.m, PAGE.h - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${t("confidential")}${brand?.name ? ` · ${brand.name}` : ""} · ${o.reference_id ?? ""}`, PAGE.m, PAGE.h - 6);
    doc.text(`${n} / ${pages}`, PAGE.w - PAGE.m, PAGE.h - 6, { align: "right" });
  }
  return doc.output("blob");
}

// Opens the PDF in a new tab (opened on the click itself, so it isn't
// blocked) with a Download button.
export function KycPdfButton({ data, download, title }) {
  const { t } = useTranslation("kycReport");
  const { paper } = useBrandTheme();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const tab = window.open("", "_blank");
    tab?.document.write(`<title>${t("preparingPdf")}</title><p style="font:14px system-ui;color:#64748b;padding:24px">${t("preparingPdf")}</p>`);
    setBusy(true);
    try {
      const selfiePath = rowsOf(data.documents).find((d) => rowsOf(d.roles).includes("idv_selfie"))?.path;
      const [logo, selfie] = await Promise.all([loadLogo(paper?.logoUrl), photoData(download, selfiePath)]);
      const name = data.summary?.profile?.display_name ?? "";
      const blob = await buildPdf({ data, t, title: title ?? t("customerTitle"), brand: paper, logo, selfie });
      const fileName = `${(name || "kyc_report").replace(/[^\w-]+/g, "_")}_kyc_report.pdf`;
      const url = URL.createObjectURL(blob);
      if (!tab) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        return;
      }
      tab.document.open();
      tab.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${fileName}</title><style>
body{margin:0;font:13px system-ui,sans-serif;background:#525659;display:flex;flex-direction:column;height:100vh}
.bar{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.btn{background:${`rgb(${ink(rgb(paper?.color)).join(",")})`};color:#fff;text-decoration:none;font-weight:600;padding:8px 14px;border-radius:6px}
iframe{flex:1;border:0;width:100%}</style></head><body>
<div class="bar"><b>${fileName}</b><a class="btn" href="${url}" download="${fileName}">&#11015; ${t("downloadPdf")}</a></div>
<iframe src="${url}"></iframe></body></html>`);
      tab.document.close();
    } catch (error) {
      tab?.close();
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void run()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-[var(--primary-foreground,#fff)] shadow-sm hover:brightness-110 disabled:opacity-60"
    >
      {busy ? <Spinner size={12} /> : <Download size={13} />} {t("downloadPdf")}
    </button>
  );
}
