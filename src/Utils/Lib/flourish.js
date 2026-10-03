import { i18n } from "@/Utils/I18n/i18n";

// Short overlays that never block the page (pointer-events: none) and clear
// themselves: the approval stamp, cards into the bureau envelope, cards
// handed to a staff user. Styles in theme.css ("Light flourishes").

const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function show(html, ms) {
  const layer = document.createElement("div");
  layer.className = "flourish-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = html;
  document.body.appendChild(layer);
  window.setTimeout(() => layer.classList.add("is-leaving"), ms);
  window.setTimeout(() => layer.remove(), ms + 300);
}

export function stamp(approved) {
  const word = i18n.t(approved ? "common:stampApproved" : "common:stampRejected");
  show(`<div class="approval-stamp ${approved ? "is-approved" : "is-rejected"}">${escape(word)}</div>`, 900);
}

export function cardsIntoEnvelope() {
  show('<div class="flourish-envelope"><span class="mini-card"></span><span class="mini-card"></span><span class="mini-card"></span><span class="env"></span></div>', 950);
}

export function cardsHandedTo(name) {
  show(`<div class="flourish-handover"><span class="stack"><span class="mini-card"></span><span class="mini-card"></span><span class="mini-card"></span></span><span>${escape(name)}</span></div>`, 1000);
}

// Every maker-checker approve / reject ends in .../auth or .../deauth
// (also receive_auth, delete_auth, ...), across all the api modules. One
// watch on fetch stamps any that succeed, instead of each page doing it.
const DECISION = /\/(?:[a-z]+_)?(auth|deauth)$/;
export function watchApprovals() {
  const original = window.fetch;
  window.fetch = async (input, init) => {
    const response = await original(input, init);
    const path = new URL(typeof input === "string" ? input : input.url, window.location.href).pathname;
    const match = DECISION.exec(path);
    if (match && response.ok) {
      response
        .clone()
        .json()
        .then((body) => body?.status !== "Fail" && body?.code !== 0 && stamp(match[1] === "auth"))
        .catch(() => {});
    }
    return response;
  };
}
