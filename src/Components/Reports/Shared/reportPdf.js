// A report printed on paper, from the same export call as Excel / CSV: the
// CSV becomes a table under the institution's logo, a "Report Name /
// Generated On" box, in the brand colour, with the logo as a faint
// watermark. Shown first as a preview page in a new tab, whose
// "Download PDF" saves the same layout (jsPDF, loaded only when needed).

// RFC 4180 CSV: quoted fields, "" inside quotes, CRLF or LF, a leading BOM.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const FALLBACK = "#1e293b";
const rgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? "").trim());
  const n = parseInt(m ? m[1] : FALLBACK.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
// The colour mixed with white (amount 0..1 of the colour).
const tint = (c, amount) => c.map((v) => Math.round(255 - (255 - v) * amount));
// A darker shade for text, so a light brand colour (yellow, say) stays readable.
const ink = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 140 ? c.map((v) => Math.round(v * 0.45)) : c);
const css = (c) => `rgb(${c.join(",")})`;

// Numbers (amounts, counts) sit to the right, like a ledger; long runs of
// digits (account numbers, references) are identifiers and stay left.
const isNumeric = (values) => {
  const filled = values.map((v) => v.trim()).filter(Boolean);
  return filled.length > 0 && filled.every((v) => /^-?[\d,]+(\.\d+)?$/.test(v)) && !filled.every((v) => /^\d{8,}$/.test(v));
};

// The logo as PNG data (colours and transparency kept) and its ratio.
// Nothing is drawn when it cannot be read.
export async function loadLogo(url) {
  if (!url) return null;
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 600 / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), ratio: canvas.width / canvas.height };
  } catch {
    return null;
  }
}

// An amount as people read it: grouped, two decimals, more only when they
// carry something ("10.000000" -> "10.00", "7.125000" -> "7.125").
// Whole numbers (counts) stay whole.
function amount(v) {
  const text = v.trim();
  if (!text) return text;
  const [, fraction = ""] = text.replace(/,/g, "").split(".");
  const kept = fraction.replace(/0+$/, "").length;
  const digits = fraction ? Math.max(2, kept) : 0;
  return Number(text.replace(/,/g, "")).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// What both the preview and the PDF show.
export function reportModel(csvText, { title, generatedOn, color, logo, labels }) {
  const [head = [], ...raw] = parseCsv(csvText);
  const numeric = head.map((_, c) => isNumeric(raw.map((r) => r[c] ?? "")));
  const body = raw.map((r) => head.map((_, c) => (numeric[c] ? amount(r[c] ?? "") : (r[c] ?? ""))));
  const base = rgb(color);
  return { title, generatedOn, head, body, numeric, logo, labels, base, text: ink(base) };
}

const escape = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// The preview page written into the new tab; its Download PDF button
// saves `pdfUrl` as `fileName`.
export function previewHtml(m, { pdfUrl, fileName }) {
  const accent = css(m.text);
  const table = m.body.length
    ? `<table><thead><tr>${m.head.map((h, c) => `<th class="${m.numeric[c] ? "r" : ""}">${escape(h)}</th>`).join("")}</tr></thead><tbody>${m.body.map((r) => `<tr>${m.head.map((_, c) => `<td class="${m.numeric[c] ? "r" : ""}">${escape(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : `<div class="empty">${escape(m.labels.empty)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(m.title)}</title><style>
*{box-sizing:border-box}body{margin:0;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937;background:#fff}
.page{max-width:1280px;margin:0 auto;padding:24px 28px 48px;position:relative}
.mark{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:0}.mark img{width:min(55vw,520px);opacity:.06}
.logo{height:46px;max-width:220px;object-fit:contain;position:relative}
.info{position:relative;margin:18px 0 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px 18px;font-size:15px}
.info b{font-weight:700}
.btn{background:${accent};color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:9px 16px;border-radius:6px;white-space:nowrap}.btn:hover{filter:brightness(1.1)}
.box{position:relative;border:1px solid ${css(tint(m.base, 0.35))};border-radius:8px;overflow:hidden;background:rgba(255,255,255,.88)}
.cap{padding:9px 16px;background:${css(tint(m.base, 0.08))};border-left:4px solid ${accent};color:${accent};font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:13px}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse}
th{background:${css(tint(m.base, 0.16))};color:${accent};font-weight:600;text-align:left;padding:7px 10px;border:1px solid #cbd5e1;white-space:nowrap}
td{padding:6px 10px;border:1px solid #d1d5db}tr:nth-child(even) td{background:rgba(0,0,0,.02)}.r{text-align:right;font-variant-numeric:tabular-nums}
.empty{padding:24px;text-align:center;color:#64748b}
@media print{.btn{display:none}}
</style></head><body>
${m.logo ? `<div class="mark"><img src="${m.logo.data}" alt=""></div>` : ""}
<div class="page">
${m.logo ? `<img class="logo" src="${m.logo.data}" alt="">` : ""}
<div class="info"><div><div><b>${escape(m.labels.reportName)}:</b> ${escape(m.title)}</div><div><b>${escape(m.labels.generatedOn)}:</b> ${escape(m.generatedOn)}</div></div><a class="btn" href="${pdfUrl}" download="${escape(fileName)}">&#11015; ${escape(m.labels.download)}</a></div>
<div class="box"><div class="cap">${escape(m.title)}</div><div class="wrap">${table}</div></div>
</div></body></html>`;
}

const PAGE = { w: 297, h: 210, margin: 10 };
const ROW_LINE = 3.6; // mm per line of 7pt text
const PAD = 1.8;

// Column widths from the longest text in each (capped), scaled to the page.
function widths(doc, rows) {
  const usable = PAGE.w - PAGE.margin * 2;
  const natural = rows[0].map((_, c) => Math.min(60, Math.max(14, ...rows.slice(0, 200).map((r) => doc.getTextWidth(String(r[c] ?? "")) + PAD * 2))));
  const total = natural.reduce((a, b) => a + b, 0);
  return natural.map((w) => (w / total) * usable);
}

// The same report as a PDF (A4 landscape): logo and info box on the first
// page, the column header on every page, the watermark behind every page.
export async function reportPdf(m) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setProperties({ title: m.title });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const cols = m.head.length ? widths(doc, [m.head, ...m.body]) : [];
  const full = PAGE.w - PAGE.margin * 2;
  let y = PAGE.margin;

  const watermark = () => {
    if (!m.logo) return;
    const w = Math.min(130, 110 * m.logo.ratio);
    const h = w / m.logo.ratio;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.addImage(m.logo.data, "PNG", (PAGE.w - w) / 2, (PAGE.h - h) / 2, w, h);
    doc.restoreGraphicsState();
  };

  const cells = (row, bold, color) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = m.head.map((_, c) => doc.splitTextToSize(String(row[c] ?? ""), cols[c] - PAD * 2));
    const height = Math.max(...lines.map((l) => l.length), 1) * ROW_LINE + PAD;
    return {
      height,
      draw: (fill) => {
        if (fill) {
          doc.setFillColor(...fill);
          doc.rect(PAGE.margin, y, full, height, "F");
        }
        doc.setDrawColor(209, 213, 219);
        doc.setTextColor(...color);
        let x = PAGE.margin;
        lines.forEach((l, c) => {
          doc.rect(x, y, cols[c], height, "S");
          if (m.numeric[c]) doc.text(l, x + cols[c] - PAD, y + ROW_LINE, { align: "right" });
          else doc.text(l, x + PAD, y + ROW_LINE);
          x += cols[c];
        });
        y += height;
      },
    };
  };
  const header = () => cells(m.head, true, m.text).draw(tint(m.base, 0.16));

  // First page: logo, info box, caption.
  watermark();
  if (m.logo) {
    const h = Math.min(12, 60 / m.logo.ratio);
    doc.addImage(m.logo.data, "PNG", PAGE.margin, y, h * m.logo.ratio, h);
    y += h + 4;
  }
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(PAGE.margin, y, full, 14, 1.5, 1.5, "FD");
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  [
    [m.labels.reportName, m.title],
    [m.labels.generatedOn, m.generatedOn],
  ].forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, PAGE.margin + 4, y + 5.5 + i * 5);
    const at = PAGE.margin + 4 + doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), at, y + 5.5 + i * 5);
  });
  y += 19;
  doc.setFillColor(...tint(m.base, 0.08));
  doc.rect(PAGE.margin, y, full, 7, "F");
  doc.setFillColor(...m.text);
  doc.rect(PAGE.margin, y, 1.2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...m.text);
  doc.text(m.title.toUpperCase(), PAGE.margin + 4, y + 4.8);
  y += 7;
  doc.setFontSize(7);

  if (m.head.length) header();
  m.body.forEach((r) => {
    const row = cells(r, false, [31, 41, 55]);
    if (y + row.height > PAGE.h - PAGE.margin - 6) {
      doc.addPage();
      watermark();
      y = PAGE.margin;
      header();
    }
    // No zebra fill on paper: it would hide the watermark.
    row.draw(null);
  });
  if (!m.body.length) {
    doc.setTextColor(100, 116, 139);
    doc.text(m.labels.empty, PAGE.margin + PAD, y + 6);
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${p} / ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 5, { align: "right" });
  }
  return doc.output("blob");
}
