import { API_BASE_URL } from "@/Utils/Constant";

// Passwords, PINs and codes never travel as readable text: each is sealed
// with the platform's RSA public key (RSA-OAEP-256, WebCrypto) and the API
// gateway opens it. An envelope works once, for five minutes, so every
// request seals afresh. Only the public half is here; only the server can
// open an envelope.

let credKey = null;

async function loadKey() {
  const res = await fetch(`${API_BASE_URL}/auth/public_key`);
  const k = (await res.json())?.data?.[0];
  if (!k?.spki) throw new Error("The encryption key could not be loaded. Please try again.");
  const der = Uint8Array.from(atob(k.spki), (c) => c.charCodeAt(0));
  credKey = { id: k.key_id, key: await crypto.subtle.importKey("spki", der, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]) };
}

export async function seal(value) {
  if (!credKey) await loadKey();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const plain = new TextEncoder().encode(JSON.stringify({ v: value, ts: Date.now(), n: nonce }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, credKey.key, plain));
  const b64url = btoa(String.fromCharCode(...ct)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `enc:v1:${credKey.id}:${b64url}`;
}

// Runs send() (which seals its fields itself) and retries once when the
// envelope was refused: a changed key is loaded again; an expired one is
// simply sealed again.
export async function withSealedRetry(send) {
  try {
    return await send();
  } catch (error) {
    if (error?.code === "credential.envelope_invalid") credKey = null;
    else if (error?.code !== "credential.envelope_expired") throw error;
    return send();
  }
}
