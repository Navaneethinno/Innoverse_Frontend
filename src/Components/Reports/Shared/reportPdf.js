// A report as a PDF, from the same export call as Excel / CSV: the CSV is
// laid out as a table (A4 landscape, header row repeated on every page,
// page numbers). jsPDF is loaded only when someone asks for a PDF.

// RFC 4180 CSV: quoted fields, "" inside quotes, CRLF or LF, a leading BOM.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
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

const PAGE = { w: 297, h: 210, margin: 10 };
const ROW_LINE = 3.6; // mm per line of 7pt text
const PAD = 1.6;

// Column widths from the longest text in each (capped), scaled to the page.
function widths(doc, rows) {
  const usable = PAGE.w - PAGE.margin * 2;
  const natural = rows[0].map((_, c) => Math.min(60, Math.max(14, ...rows.slice(0, 200).map((r) => doc.getTextWidth(String(r[c] ?? "")) + PAD * 2))));
  const total = natural.reduce((a, b) => a + b, 0);
  return natural.map((w) => (w / total) * usable);
}

export async function csvToPdf(csvText, { title, subtitle }) {
  const { jsPDF } = await import("jspdf");
  const rows = parseCsv(csvText);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setProperties({ title });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const [head = [], ...body] = rows;
  const cols = head.length ? widths(doc, rows) : [];

  let y = PAGE.margin;
  const pageHeader = (first) => {
    if (first) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(title, PAGE.margin, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, PAGE.margin, y + 10);
      y += 15;
    }
    // Header row on every page.
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const lines = head.map((h, c) => doc.splitTextToSize(String(h), cols[c] - PAD * 2));
    const height = Math.max(...lines.map((l) => l.length), 1) * ROW_LINE + PAD;
    doc.setFillColor(30, 41, 59);
    doc.rect(PAGE.margin, y, PAGE.w - PAGE.margin * 2, height, "F");
    doc.setTextColor(255, 255, 255);
    let x = PAGE.margin;
    lines.forEach((l, c) => {
      doc.text(l, x + PAD, y + ROW_LINE);
      x += cols[c];
    });
    y += height;
    doc.setFont("helvetica", "normal");
  };

  pageHeader(true);
  body.forEach((r, i) => {
    const lines = head.map((_, c) => doc.splitTextToSize(String(r[c] ?? ""), cols[c] - PAD * 2));
    const height = Math.max(...lines.map((l) => l.length), 1) * ROW_LINE + PAD;
    if (y + height > PAGE.h - PAGE.margin - 6) {
      doc.addPage();
      y = PAGE.margin;
      pageHeader(false);
    }
    if (i % 2) {
      doc.setFillColor(241, 245, 249);
      doc.rect(PAGE.margin, y, PAGE.w - PAGE.margin * 2, height, "F");
    }
    doc.setTextColor(30, 41, 59);
    let x = PAGE.margin;
    lines.forEach((l, c) => {
      doc.text(l, x + PAD, y + ROW_LINE);
      x += cols[c];
    });
    y += height;
  });
  if (!body.length) {
    doc.setTextColor(100, 116, 139);
    doc.text("—", PAGE.margin + PAD, y + ROW_LINE);
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`${p} / ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 5, { align: "right" });
  }
  return doc.output("blob");
}
