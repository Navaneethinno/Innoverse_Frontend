// A people file (CSV or Excel) as the rows `check` / `add` take: the header
// names the columns (phone_number, email, then field keys); every other
// column goes into `fields` as text. Blank lines are skipped.

// RFC 4180: quoted cells may hold commas, quotes ("") and line breaks.
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
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const text = (v) => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

function toPeople(table) {
  const [header = [], ...body] = table;
  const keys = header.map((h) => text(h));
  return body
    .filter((cells) => cells.some((c) => text(c) !== ""))
    .map((cells) => {
      const fields = {};
      let phone = "";
      let email = "";
      keys.forEach((key, i) => {
        const value = text(cells[i]);
        if (!key) return;
        if (key === "phone_number") phone = value;
        else if (key === "email") email = value;
        else if (value !== "") fields[key] = value;
      });
      return { phone_number: phone, ...(email ? { email } : {}), fields };
    });
}

// { rows, columns } from a File; throws when it cannot be read.
export async function readPeopleFile(file) {
  const excel = /\.xlsx$/i.test(file.name);
  let table;
  if (excel) {
    // Loaded only when an Excel file is picked.
    const { readSheet } = await import("read-excel-file/browser");
    table = await readSheet(file);
  } else {
    table = parseCsv(await file.text());
  }
  return { rows: toPeople(table), columns: (table[0] ?? []).map(text).filter(Boolean) };
}

// A base64 file from a reply, saved as `name`.
export function base64Blob(base64, type = "text/csv") {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}
