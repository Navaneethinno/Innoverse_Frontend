import { API_BASE_URL } from "@/Utils/Constant";

// Passwords, PINs and codes never travel as readable text: each is sealed
// with the platform's RSA public key (RSA-OAEP-256, WebCrypto) and the API
// gateway opens it. An envelope works once, for five minutes, so every
// request seals afresh. Only the public half is here; only the server can
// open an envelope.

// The fields the server refuses in plain text once sealing is "required".
const SEALED = new Set(["password", "old_password", "new_password", "confirm_password", "current_password", "password_hash", "pin", "current_pin", "new_pin", "confirm_pin", "txn_pin", "card_pin", "current_card_pin", "otp"]);

let credKey = null;
// Server clock minus this device's clock, so a wrong device clock does not
// make every envelope look expired.
let clockOffset = 0;

async function loadKey() {
  // WebCrypto exists only on a secure page (https, or http://localhost); an
  // http:// network address (e.g. the dev server opened by its IP) has none.
  if (!globalThis.crypto?.subtle) throw new Error("Sign-in needs a secure connection. Open this page over https or on localhost.");
  const res = await fetch(`${API_BASE_URL}/auth/public_key`);
  const k = (await res.json())?.data?.[0];
  if (!k?.spki) throw new Error("The encryption key could not be loaded. Please try again.");
  if (Number(k.server_time)) clockOffset = Number(k.server_time) - Date.now();
  const der = Uint8Array.from(atob(k.spki), (c) => c.charCodeAt(0));
  credKey = { id: k.key_id, key: await crypto.subtle.importKey("spki", der, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]) };
}

// Dev server only: opened by its network address (http, so no WebCrypto),
// credentials go unsealed, over the API's own https, for testing on other
// devices. A production build always seals: this branch is not in it.
const devUnsealed = () => import.meta.env.DEV && !globalThis.crypto?.subtle;

export async function seal(value) {
  if (devUnsealed()) return value;
  if (!credKey) await loadKey();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const plain = new TextEncoder().encode(JSON.stringify({ v: value, ts: Date.now() + clockOffset, n: nonce }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, credKey.key, plain));
  const b64url = btoa(String.fromCharCode(...ct)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `enc:v1:${credKey.id}:${b64url}`;
}

// A copy of `body` with every listed field that holds a value sealed.
export async function sealFields(body) {
  const out = { ...body };
  for (const [key, value] of Object.entries(out)) {
    if (SEALED.has(key) && typeof value === "string" && value !== "") out[key] = await seal(value);
  }
  return out;
}

// Runs send() (which seals its fields itself) and retries once when the
// envelope was refused: a changed key is loaded again; an expired one is
// sealed again, after taking the clock from the refusal.
export async function withSealedRetry(send) {
  try {
    return await send();
  } catch (error) {
    if (error?.code === "credential.envelope_invalid") credKey = null;
    else if (error?.code === "credential.envelope_expired") {
      if (Number(error.serverTime)) clockOffset = Number(error.serverTime) - Date.now();
    } else throw error;
    return send();
  }
}
