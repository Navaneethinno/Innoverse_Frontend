import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";

// One reusable file/image upload control — was previously duplicated as
// InstitutionBrandingPage.jsx's local ImageUploadField (logo/favicon) and,
// separately, bare <input type="file"> elements with no preview at all in
// the Customer wizard (identification front/back images, document
// front/back files). Every upload surface in the app should render through
// here so they look and behave identically, and so the "uploading"
// animation / "view what I uploaded" behavior only needs building once.
//
// No real upload/asset-storage endpoint exists anywhere in the app yet —
// confirmed dead end across every API this codebase talks to — so `value`
// is a plain `data:` URL string produced by reading the file client-side,
// stored directly on whatever field the caller is filling in (branding's
// logo/favicon columns, or a document/identification row's front_image/
// back_image/file_front/file_back). Once a real upload endpoint exists,
// `value` becoming a real hosted URL instead of a data: URL needs no
// change here — the "View"/thumbnail logic already treats both the same
// way, since both are just strings a browser can load.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isImageValue(value, accept) {
  if (!value) return false;
  if (value.startsWith("data:image/")) return true;
  if (accept?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(value.split("?")[0] ?? "");
}

export function FileUploadField({
  value,
  onChange,
  accept = "image/*",
  maxBytes = 500 * 1024,
  tr = (s) => s,
  uploadLabel = "Upload file",
  hint,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (accept.startsWith("image/") && !file.type.startsWith("image/")) {
      setError(tr("Please choose an image file"));
      return;
    }
    if (file.size > maxBytes) {
      setError(`${tr("File must be under")} ${Math.round(maxBytes / 1024)}KB`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      onChange(await readFileAsDataUrl(file));
    } finally {
      setUploading(false);
    }
  };

  const previewIsImage = isImageValue(value, accept);

  return (
    <div className="mt-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {uploading ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-xs font-semibold text-muted-foreground">
          <Spinner size={14} className="text-primary" />
          {tr("Uploading...")}
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            title={tr("View uploaded file")}
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
          >
            {previewIsImage ? (
              <img
                src={value}
                alt=""
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <FileText size={20} className="text-muted-foreground" />
            )}
          </a>
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-muted"
          >
            {tr("View")}
          </a>
          {!disabled && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-muted"
            >
              {tr("Replace")}
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500"
              aria-label={tr("Remove file")}
            >
              <X size={15} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-left text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload size={15} className="shrink-0" />
          {tr(uploadLabel)}
        </button>
      )}
      {hint && !uploading && <p className="mt-1 text-[11px] text-muted-foreground">{tr(hint)}</p>}
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}
