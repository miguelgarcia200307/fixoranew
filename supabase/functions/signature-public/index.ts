import { corsHeaders, json, safeError, serviceClient, sha256 } from "../_shared/signature-utils.ts";

const CONSENT_TEXT = "Declaro que la firma trazada corresponde a mi aceptación del comprobante de ingreso indicado.";
const CONSENT_VERSION = "fixora-es-1.0";
const invalid = () => safeError("Este enlace ya no es válido. Solicita uno nuevo al establecimiento.", 410);

const decodePng = (dataUrl: string) => {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("invalid_png");
  const binary = atob(match[1]);
  if (binary.length < 300 || binary.length > 1024 * 1024) throw new Error("invalid_size");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => bytes[index] === byte)) throw new Error("invalid_png");
  const view = new DataView(bytes.buffer);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width < 120 || height < 60 || width > 4096 || height > 4096) throw new Error("invalid_dimensions");
  return bytes;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return safeError("Método no permitido.", 405);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return invalid(); }
  const token = String(body.token || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return invalid();

  const client = serviceClient();
  const tokenHash = await sha256(token);
  const { data: signatureRequest } = await client.from("signature_requests").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (!signatureRequest || signatureRequest.status !== "pending") return invalid();
  if (new Date(signatureRequest.expires_at).getTime() <= Date.now()) {
    await client.from("signature_requests").update({ status: "expired" }).eq("id", signatureRequest.id).eq("status", "pending");
    return invalid();
  }

  if (String(body.action || "inspect") === "inspect") {
    return json({
      ingreso_code: signatureRequest.ingreso_code,
      signature_type: signatureRequest.signature_type,
      expected_signer_name: signatureRequest.expected_signer_name,
      expires_at: signatureRequest.expires_at,
      consent_text: CONSENT_TEXT,
      consent_version: CONSENT_VERSION,
    });
  }
  if (body.action !== "submit") return invalid();
  if (body.consent !== true) return safeError("Debes aceptar la declaración antes de enviar.");

  let png: Uint8Array;
  try { png = decodePng(String(body.image || "")); }
  catch { return safeError("La firma enviada no es válida. Limpia el recuadro e inténtalo de nuevo."); }

  const signatureId = crypto.randomUUID();
  const storagePath = `${signatureRequest.business_id}/${signatureRequest.ingreso_id}/${signatureRequest.signature_type}/${signatureId}.png`;
  const imageHash = await sha256(png);
  const { error: uploadError } = await client.storage.from("signatures").upload(storagePath, png, {
    contentType: "image/png", cacheControl: "3600", upsert: false,
  });
  if (uploadError) return safeError("No se pudo guardar la firma. Inténtalo nuevamente.", 503);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const { data: completed, error } = await client.rpc("complete_electronic_signature", {
    p_request_id: signatureRequest.id,
    p_storage_path: storagePath,
    p_image_sha256: imageHash,
    p_consent_text: CONSENT_TEXT,
    p_consent_version: CONSENT_VERSION,
    p_ip_address: forwarded,
    p_user_agent: request.headers.get("user-agent") || "",
  });
  if (error || !completed) {
    await client.storage.from("signatures").remove([storagePath]);
    return invalid();
  }
  return json({ ok: true, ingreso_code: signatureRequest.ingreso_code, signed_at: completed.signed_at });
});
