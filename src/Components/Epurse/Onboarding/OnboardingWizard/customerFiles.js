// FILE fields of the customer wizard (File upload handoff, 2026-09): the file
// is uploaded on its own for this onboarding/section/field, and the stored
// path it returns is the field's value when the section is saved. A row's
// document type (from the section's `types`) may narrow the formats and size;
// sending its id as type_id makes the server apply them too.
const ALL_FORMATS = ["PDF", "JPEG", "PNG", "TIFF", "WEBP"];
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = {
  PDF: "application/pdf,.pdf",
  JPEG: "image/jpeg,.jpg,.jpeg",
  JPG: "image/jpeg,.jpg,.jpeg",
  PNG: "image/png,.png",
  TIFF: "image/tiff,.tif,.tiff",
  TIF: "image/tiff,.tif,.tiff",
  WEBP: "image/webp,.webp",
};

const formatsOf = (type) => {
  const raw = type?.file_formats;
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const clean = list.map((f) => String(f).trim().toUpperCase()).filter(Boolean);
  return clean.length ? clean : ALL_FORMATS;
};

const sizeLabel = (bytes) => (bytes >= 1024 * 1024 ? `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB` : `${Math.round(bytes / 1024)} KB`);

// Props for FileUploadField: upload/download bound to this onboarding,
// section and field, plus accept/size/hint from the row's type.
export function customerFileProps({ api, referenceId, sectionCode, fieldKey, type, t }) {
  const formats = formatsOf(type);
  const maxBytes = Number(type?.max_file_size_kb) > 0 ? Number(type.max_file_size_kb) * 1024 : MAX_BYTES;
  return {
    accept: formats.map((f) => ACCEPT[f] ?? `.${f.toLowerCase()}`).join(","),
    maxBytes,
    hint: t("customer:fileHint", { formats: formats.join(", "), size: sizeLabel(maxBytes) }),
    upload: (file) => api.upload({ reference_id: referenceId, section_code: sectionCode, field: fieldKey, type_id: type?.id, file }),
    download: (path) => api.file({ reference_id: referenceId, path }),
  };
}

// A stored customer file path, as upload returns it
// ("institution/2/customer/corporate/<ref>/document/front_file_….png").
export const isStoredCustomerFile = (value) => typeof value === "string" && /^institution\/\d+\/customer\//.test(value);
