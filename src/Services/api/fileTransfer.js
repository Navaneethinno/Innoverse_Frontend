import { scopedPath } from "@/Utils/Lib/apiScope";
import { API_BASE_URL } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Stored files (File upload handoff, 2026-09). A file field's value is the
// server `path` an upload returned; a file is shown by downloading it by
// that path. Same auth/language headers and error rules as every JSON
// request helper, except: uploads go as multipart (no Content-Type header —
// the browser adds the boundary) and a successful download is the file
// itself, not JSON. Failures are still the JSON envelope (`message`).

const headers = () => {
  const token = getAccessToken();
  return {
    Deviceinfo: JSON.stringify(DEVICE_INFO),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...apiLanguageHeader(),
  };
};

const STATUS_FALLBACK = { 404: "The File Was Not Found", 409: "This customer can't be changed right now", 413: "The file is too large" };

async function send(path, init) {
  const controller = new AbortController();
  // A 10 MB file on a slow link needs more than the JSON calls' timeout.
  const timeout = window.setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${API_BASE_URL}${scopedPath(path)}`, { method: "POST", ...init, signal: controller.signal });
    const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
    if (response.ok && !isJson) return { response, payload: null };
    const payload = isJson ? await response.json().catch(() => null) : null;
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(getApiErrorMessage(payload, statusError));
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") {
      // A proxy in front of the API can refuse an oversized upload with an
      // HTML page instead of the JSON envelope; keep the reason readable.
      throw new Error(getApiErrorMessage(payload, STATUS_FALLBACK[response.status] ?? "Request failed"));
    }
    return { response, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Request timed out");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

// Upload one file with its form fields; resolves to data[0]:
// { path, file_name, content_type, size }.
export async function uploadFile(path, fields) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") form.append(key, value);
  });
  const { payload } = await send(path, { headers: headers(), body: form });
  const data = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  if (!data?.path) throw new Error(getApiErrorMessage(payload, "Upload failed"));
  return data;
}

// Download a stored file (JSON body) as a Blob.
export async function downloadFile(path, body) {
  const { response, payload } = await send(path, {
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // A JSON reply is never the file, even with a 200.
  if (payload) throw new Error(getApiErrorMessage(payload, "The File Was Not Found"));
  return response.blob();
}

// A generated download (e.g. a report export): the file plus the name the
// server gave it in Content-Disposition (exposed by the gateway), or
// `fallbackName` when there is none.
export async function downloadAttachment(path, body, fallbackName = "download") {
  const { response, payload } = await send(path, {
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (payload) throw new Error(getApiErrorMessage(payload, "Download failed"));
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
  return { blob: await response.blob(), fileName: fileName ? decodeURIComponent(fileName) : fallbackName };
}

// Hands a Blob to the browser as a file download.
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
