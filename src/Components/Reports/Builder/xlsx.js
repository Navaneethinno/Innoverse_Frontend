// A one-sheet .xlsx from a header and rows, written in the browser: the
// workbook's XML parts in an uncompressed zip. Numbers stay numbers, so
// Excel can add them up; everything else is text.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// A zip with every file stored as is (no compression).
function zip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(text);
    const crc = crc32(data);
    const header = (signature, extra) => {
      const view = new DataView(new ArrayBuffer(extra ? 46 : 30));
      let p = 0;
      const u32 = (v) => {
        view.setUint32(p, v, true);
        p += 4;
      };
      const u16 = (v) => {
        view.setUint16(p, v, true);
        p += 2;
      };
      u32(signature);
      if (extra) u16(20);
      [20, 0x0800, 0, 0, 0x21].forEach(u16); // version, UTF-8 names, stored, time, date (1980-01-01)
      [crc, data.length, data.length].forEach(u32);
      u16(nameBytes.length);
      u16(0);
      if (extra) {
        [0, 0, 0].forEach(u16);
        u32(0);
        u32(offset);
      }
      return new Uint8Array(view.buffer);
    };
    const local = header(0x04034b50, false);
    parts.push(local, nameBytes, data);
    central.push(header(0x02014b50, true), nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const xml = (v) =>
  String(v)
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
    // XML 1.0 has no place for control characters other than tab and newlines.
    .split("")
    .filter((c) => c >= " " || c === "\t" || c === "\n" || c === "\r")
    .join("");
const letters = (i) =>
  (i < 26 ? "" : letters(Math.floor(i / 26) - 1)) + String.fromCharCode(65 + (i % 26));

// head: labels; rows: arrays of numbers or strings (null = empty).
export function xlsxBlob(head, rows, sheetName = "Report") {
  const cell = (v, c, r) => {
    const ref = `${letters(c)}${r}`;
    if (v == null || v === "") return "";
    if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${r === 1 ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  };
  const sheetRows = [head, ...rows]
    .map((row, i) => `<row r="${i + 1}">${row.map((v, c) => cell(v, c, i + 1)).join("")}</row>`)
    .join("");
  const ns =
    'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return zip([
    [
      "[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8"?><workbook ${ns}><sheets><sheet name="${xml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    ],
    // Style 1: the bold header.
    [
      "xl/styles.xml",
      `<?xml version="1.0" encoding="UTF-8"?><styleSheet ${ns}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    ],
    [
      "xl/worksheets/sheet1.xml",
      `<?xml version="1.0" encoding="UTF-8"?><worksheet ${ns}><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetData>${sheetRows}</sheetData></worksheet>`,
    ],
  ]);
}
