// The largest file an upload may send: the API refuses anything bigger
// (10 MB, PCI SSS Q69), so the portal stops it before it is sent.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// "" when the file may be sent, otherwise why not.
export function uploadProblem(file, maxBytes = MAX_UPLOAD_BYTES) {
  if (!file || file.size <= maxBytes) return "";
  const mb = (n) => `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
  return `This file is ${mb(file.size)}. The most a file can be is ${mb(maxBytes)}.`;
}
