import { barcodeBars } from "@/Utils/Lib/barcode";

// The receipt as a PDF, laid out like the thermal slip on screen: 80 mm wide,
// as tall as it needs to be, monospaced text, dashed rules, the barcode.
// jsPDF is loaded only when someone asks for the download.
const WIDTH = 80;
const MARGIN = 6;
const INNER = WIDTH - MARGIN * 2;
const LINE = 4.4; // mm per 8pt line

// Lays the slip out on `doc` (measuring text as it goes) and returns the
// height used. Called twice: once on a scratch page to learn the height,
// then on the real page of exactly that height.
function layout(doc, { slip, logo }) {
  let y = 8;
  const ink = () => doc.setTextColor(35, 32, 27);
  const grey = () => doc.setTextColor(110);
  const center = (text, { size = 8, bold = false, gap = LINE } = {}) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.splitTextToSize(String(text), INNER).forEach((part) => {
      doc.text(part, WIDTH / 2, y, { align: "center" });
      y += gap;
    });
  };
  const rule = () => {
    doc.setLineDashPattern([0.6, 0.8], 0);
    doc.setDrawColor(130);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 1.6, WIDTH - MARGIN, y - 1.6);
    doc.setLineDashPattern([], 0);
    y += 1.8;
  };
  // A value of any length: beside its label when it fits, else on the next
  // lines, still right-aligned.
  const row = ({ label, value, sub, strong }) => {
    const size = strong ? 9.5 : 8;
    doc.setFont("courier", strong ? "bold" : "normal");
    doc.setFontSize(size);
    grey();
    doc.text(label, MARGIN, y);
    ink();
    if (doc.getTextWidth(label) + doc.getTextWidth(value) + 3 > INNER) y += LINE;
    doc.splitTextToSize(value, INNER).forEach((part) => {
      doc.text(part, WIDTH - MARGIN, y, { align: "right" });
      y += LINE;
    });
    if (sub) {
      doc.setFont("courier", "normal");
      doc.setFontSize(7.2);
      grey();
      doc.splitTextToSize(sub, INNER).forEach((part) => {
        doc.text(part, WIDTH - MARGIN, y, { align: "right" });
        y += LINE - 0.4;
      });
      ink();
    }
  };

  ink();
  if (logo) {
    const height = Math.min(13, 34 / logo.ratio);
    const width = height * logo.ratio;
    doc.addImage(logo.data, "JPEG", (WIDTH - width) / 2, y - 2, width, height);
    y += height + 3;
  }
  if (slip.name) center(slip.name.toUpperCase().split("").join(" "), { size: 11, bold: true, gap: 5 });
  grey();
  slip.header.forEach((line) => center(line, { size: 7 }));
  ink();
  y += 1;
  rule();
  center(slip.heading, { bold: true });
  if (slip.duplicate) {
    doc.setTextColor(185, 28, 28);
    center(`*** ${slip.duplicate[0]} ***`, { bold: true });
    center(slip.duplicate[1], { size: 7 });
    ink();
  }
  slip.sections.forEach((section) => {
    rule();
    section.forEach(row);
  });
  rule();
  if (slip.reference) {
    const { bars, total } = barcodeBars(slip.reference);
    const width = INNER * 0.78;
    const unit = width / total;
    const left = (WIDTH - width) / 2;
    doc.setFillColor(35, 32, 27);
    bars.forEach((bar) => doc.rect(left + bar.x * unit, y, bar.width * unit, 11, "F"));
    y += 14;
    grey();
    center(String(slip.reference).split("").join(" "), { size: 7.2 });
    ink();
    y += 1;
  }
  slip.footer.forEach((line, index) => {
    if (index === 0) ink();
    else grey();
    center(line, { size: index === 0 ? 8 : 7 });
  });
  return y + 4;
}

// The logo (an image address) as grey JPEG data and its width/height ratio.
// Nothing is drawn when it cannot be read.
async function loadLogo(url) {
  if (!url) return null;
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 320 / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const grey = 0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2];
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
    }
    context.putImageData(pixels, 0, 0);
    return { data: canvas.toDataURL("image/jpeg", 0.85), ratio: canvas.width / canvas.height };
  } catch {
    return null;
  }
}

export async function downloadReceiptPdf({ slip, logoUrl }) {
  const { jsPDF } = await import("jspdf");
  const logo = await loadLogo(logoUrl);
  const scratch = new jsPDF({ unit: "mm", format: [WIDTH, 600] });
  const height = layout(scratch, { slip, logo });
  const doc = new jsPDF({ unit: "mm", format: [WIDTH, Math.max(height, 60)] });
  layout(doc, { slip, logo });
  doc.setProperties({ title: `Receipt ${slip.reference ?? ""}`.trim() });
  doc.save(`receipt-${slip.reference ?? "transaction"}.pdf`);
}
