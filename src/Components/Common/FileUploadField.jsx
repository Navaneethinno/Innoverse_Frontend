import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";

// One reusable file/image upload control — every upload surface in the app
// renders through here so they look and behave identically.
//
// Files are stored on the server (File upload handoff, 2026-09): with
// `upload(file)` the chosen file is sent on its own and `value` becomes the
// stored path it returns; the record is then saved with that path. A stored
// path can't be an <img src> (the download needs the bearer token), so
// `download(path)` fetches it as a Blob for the preview and "View".
// Without `upload` the file is read client-side into a data: URL. Values that are already data:/
// http(s) URLs (older records) are shown directly.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const isDirectUrl = (value) => /^(data:|blob:|https?:)/i.test(value);
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;
// TIFF is accepted for upload but browsers can't render it — icon instead.
const isPreviewableImage = (type) => type?.startsWith("image/") && type !== "image/tiff";

// A browser-loadable URL (+ whether it is an image) for a stored value.
// Stored paths are downloaded once per value; the object URL is revoked
// when the value changes or the component unmounts.
export function useStoredFileUrl(value, download) {
  const [state, setState] = useState({ url: null, isImage: false, loading: false, error: "" });
  useEffect(() => {
    if (!value) {
      setState({ url: null, isImage: false, loading: false, error: "" });
      return undefined;
    }
    if (isDirectUrl(value) || !download) {
      setState({ url: value, isImage: value.startsWith("data:image/") || IMAGE_EXT.test(value.split("?")[0]), loading: false, error: "" });
      return undefined;
    }
    let url = null;
    let cancelled = false;
    setState({ url: null, isImage: IMAGE_EXT.test(value), loading: true, error: "" });
    download(value)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({ url, isImage: isPreviewableImage(blob.type), loading: false, error: "" });
      })
      .catch((error) => !cancelled && setState({ url: null, isImage: false, loading: false, error: error.message }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // `download` is rebuilt by callers each render; the value decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return state;
}

// Read-only thumbnail of a stored file (view screens).
export function StoredFilePreview({ value, download, className = "h-10 w-10" }) {
  const file = useStoredFileUrl(value, download);
  if (!value) return "—";
  const box = `flex ${className} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white`;
  if (file.loading) return <span className={box}><Spinner size={14} /></span>;
  return (
    <a href={file.url ?? undefined} target="_blank" rel="noreferrer" title={file.error || undefined} className={box}>
      {file.url && file.isImage ? <img src={file.url} alt="" className="h-full w-full object-contain" /> : <FileText size={18} className="text-muted-foreground" />}
    </a>
  );
}

export function FileUploadField({
  value,
  onChange,
  upload,
  download,
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
  const file = useStoredFileUrl(value, download);

  const handleFile = async (chosen) => {
    if (!chosen) return;
    if (accept.startsWith("image/") && !chosen.type.startsWith("image/")) {
      setError(tr("Please choose an image file"));
      return;
    }
    // Early check only; the server has the final say on size and format.
    if (chosen.size > maxBytes) {
      setError(`${tr("File must be under")} ${maxBytes >= 1024 * 1024 ? `${Math.round(maxBytes / (1024 * 1024))}MB` : `${Math.round(maxBytes / 1024)}KB`}`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      onChange(upload ? (await upload(chosen)).path : await readFileAsDataUrl(chosen));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

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
            href={file.url ?? undefined}
            target="_blank"
            rel="noreferrer"
            title={file.error || tr("View uploaded file")}
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
          >
            {file.loading ? (
              <Spinner size={14} />
            ) : file.url && file.isImage ? (
              <img
                src={file.url}
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
          {file.url && (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-muted"
            >
              {tr("View")}
            </a>
          )}
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
      {(error || file.error) && <p className="mt-1 text-[11px] font-medium text-red-500">{error || file.error}</p>}
    </div>
  );
}
