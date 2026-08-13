import { createClient } from "npm:@supabase/supabase-js@2.110.7";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export const serviceClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const bearerToken = (request: Request) => {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
};

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlToBytes = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

export const randomToken = () => bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));

export const sha256 = async (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer));
  return Array.from(digest).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const encryptionKey = async () => {
  const material = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`fixora-signature:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`),
  );
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const encryptToken = async (token: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(token),
  ));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(encrypted)}`;
};

export const decryptToken = async (value: string) => {
  const [ivValue, encryptedValue] = String(value || "").split(".");
  if (!ivValue || !encryptedValue) throw new Error("invalid_ciphertext");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(ivValue) },
    await encryptionKey(),
    base64UrlToBytes(encryptedValue),
  );
  return new TextDecoder().decode(plain);
};

export const safeError = (message: string, status = 400) => json({ error: message }, status);
