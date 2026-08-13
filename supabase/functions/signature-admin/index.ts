import {
  bearerToken, corsHeaders, decryptToken, encryptToken, json, randomToken, safeError, serviceClient, sha256,
} from "../_shared/signature-utils.ts";

const TYPES = new Set(["client", "receiver"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return safeError("Método no permitido.", 405);

  const client = serviceClient();
  const jwt = bearerToken(request);
  const { data: userResult, error: userError } = await client.auth.getUser(jwt);
  const user = userResult?.user;
  if (userError || !user) return safeError("Tu sesión no es válida.", 401);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return safeError("Solicitud no válida."); }
  const action = String(body.action || "list");
  const ingresoId = String(body.ingreso_id || "");
  const signatureType = String(body.signature_type || "");

  const fetchIngreso = async () => {
    if (!ingresoId) return null;
    const { data } = await client.from("income_entries")
      .select("id,user_id,code,received_by,clients(name,last_name,document)")
      .eq("id", ingresoId).eq("user_id", user.id).maybeSingle();
    return data;
  };

  const listState = async () => {
    const ingreso = await fetchIngreso();
    if (!ingreso) return null;
    await client.from("signature_requests").update({ status: "expired" })
      .eq("business_id", user.id).eq("ingreso_id", ingresoId).eq("status", "pending").lte("expires_at", new Date().toISOString());
    const [{ data: requests }, { data: signatures }] = await Promise.all([
      client.from("signature_requests")
        .select("id,ingreso_id,ingreso_code,signature_type,status,expected_signer_name,expected_signer_document,created_at,expires_at,signed_at,revoked_at,used_at,signature_id")
        .eq("business_id", user.id).eq("ingreso_id", ingresoId).order("created_at", { ascending: false }),
      client.from("electronic_signatures")
        .select("id,signature_request_id,signature_type,signer_name_snapshot,signer_document_snapshot,storage_path,image_sha256,signed_at,consent_version,is_current")
        .eq("business_id", user.id).eq("ingreso_id", ingresoId).eq("is_current", true),
    ]);
    const hydrated = await Promise.all((signatures || []).map(async (signature) => {
      const { data } = await client.storage.from("signatures").createSignedUrl(signature.storage_path, 300);
      return { ...signature, image_url: data?.signedUrl || "" };
    }));
    return { ingreso_code: ingreso.code, requests: requests || [], signatures: hydrated };
  };

  if (action === "list" || action === "status") {
    const state = await listState();
    return state ? json(state) : safeError("El ingreso ya no existe.", 404);
  }

  if (action === "revoke") {
    const requestId = String(body.request_id || "");
    const { data, error } = await client.from("signature_requests").update({
      status: "revoked", revoked_at: new Date().toISOString(), revoked_by: user.id,
    }).eq("id", requestId).eq("business_id", user.id).eq("status", "pending").select("id").maybeSingle();
    if (error || !data) return safeError("La solicitud ya no puede revocarse.", 409);
    return json({ ok: true });
  }

  if (action !== "create") return safeError("Operación no válida.");
  if (!TYPES.has(signatureType)) return safeError("Tipo de firma no válido.");
  const ingreso = await fetchIngreso();
  if (!ingreso) return safeError("El ingreso ya no existe.", 404);

  const nowIso = new Date().toISOString();
  await client.from("signature_requests").update({ status: "expired" })
    .eq("business_id", user.id).eq("ingreso_id", ingresoId).eq("signature_type", signatureType)
    .eq("status", "pending").lte("expires_at", nowIso);

  const { data: active } = await client.from("signature_requests").select("*")
    .eq("business_id", user.id).eq("ingreso_id", ingresoId).eq("signature_type", signatureType)
    .eq("status", "pending").gt("expires_at", nowIso).maybeSingle();
  const regenerate = body.regenerate === true;
  if (active && !regenerate) {
    try {
      return json({ request: { ...active, token_ciphertext: undefined, token_hash: undefined }, token: await decryptToken(active.token_ciphertext), reused: true });
    } catch { return safeError("No se pudo recuperar el enlace activo. Regenera la solicitud.", 409); }
  }
  if (active && regenerate) {
    await client.from("signature_requests").update({ status: "revoked", revoked_at: nowIso, revoked_by: user.id })
      .eq("id", active.id).eq("business_id", user.id);
  }

  const clientInfo = Array.isArray(ingreso.clients) ? ingreso.clients[0] : ingreso.clients;
  let expectedName = "";
  let expectedDocument = "";
  if (signatureType === "client") {
    expectedName = [clientInfo?.name, clientInfo?.last_name].filter(Boolean).join(" ");
    expectedDocument = clientInfo?.document || "";
  } else {
    const receiverId = ingreso.received_by || user.id;
    const { data: receiver } = await client.auth.admin.getUserById(receiverId);
    const metadata = receiver?.user?.user_metadata || {};
    expectedName = metadata.full_name || metadata.name || receiver?.user?.email || user.email || "";
    expectedDocument = metadata.document || metadata.role || "";
  }

  const token = randomToken();
  const expirationMinutes = Math.min(120, Math.max(5, Number(body.expiration_minutes) || 30));
  const expiresAt = new Date(Date.now() + expirationMinutes * 60000).toISOString();
  const { data: created, error } = await client.from("signature_requests").insert({
    business_id: user.id,
    ingreso_id: ingreso.id,
    ingreso_code: ingreso.code,
    signature_type: signatureType,
    token_hash: await sha256(token),
    token_ciphertext: await encryptToken(token),
    status: "pending",
    expected_signer_name: expectedName,
    expected_signer_document: expectedDocument,
    created_by: user.id,
    expires_at: expiresAt,
  }).select("id,ingreso_id,ingreso_code,signature_type,status,expected_signer_name,expected_signer_document,created_at,expires_at").single();
  if (error || !created) return safeError("No se pudo crear la solicitud de firma.", 409);
  return json({ request: created, token, reused: false }, 201);
});

