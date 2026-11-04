// Drag and drop for every upload: a file dropped on (or close around) a file
// input goes through that input's own change handler, so its size and type
// checks apply. A file dropped anywhere else is ignored, instead of the
// browser leaving the page to open it.
const LEVELS = 4;
const HOVER = ["ring-2", "ring-primary", "rounded-xl"];

// Whether a file fits an input's `accept` list (".csv", "image/*", "*/*").
export function fileMatches(accept, file) {
  const rules = String(accept ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!rules.length) return true;
  const name = String(file.name ?? "").toLowerCase();
  const type = String(file.type ?? "").toLowerCase();
  return rules.some((rule) => {
    if (rule === "*/*") return true;
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

// The nearest area holding exactly one usable file input.
function dropArea(start) {
  let el = start?.nodeType === 1 ? start : start?.parentElement;
  for (let i = 0; el && el !== document.body && i < LEVELS; i += 1, el = el.parentElement) {
    const inputs = el.querySelectorAll('input[type="file"]');
    if (inputs.length > 1) return null;
    if (inputs.length === 1) return inputs[0].disabled ? null : { area: el, input: inputs[0] };
  }
  return null;
}

const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes("Files");

export function installFileDrop(onRefused) {
  let lit = null;
  const light = (area) => {
    if (lit === area) return;
    lit?.classList.remove(...HOVER);
    area?.classList.add(...HOVER);
    lit = area;
  };
  const over = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    const found = dropArea(event.target);
    event.dataTransfer.dropEffect = found ? "copy" : "none";
    light(found?.area ?? null);
  };
  const leave = (event) => {
    if (!event.relatedTarget) light(null);
  };
  const drop = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    light(null);
    const found = dropArea(event.target);
    if (!found) return;
    const files = [...event.dataTransfer.files].slice(0, found.input.multiple ? undefined : 1);
    if (!files.length) return;
    if (!files.every((f) => fileMatches(found.input.accept, f))) return onRefused?.(found.input.accept);
    const picked = new DataTransfer();
    files.forEach((f) => picked.items.add(f));
    found.input.files = picked.files;
    found.input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  document.addEventListener("dragover", over);
  document.addEventListener("dragleave", leave);
  document.addEventListener("drop", drop);
}
