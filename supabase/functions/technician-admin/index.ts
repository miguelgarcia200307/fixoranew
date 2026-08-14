import { bearerToken, corsHeaders, json, safeError, serviceClient } from "../_shared/signature-utils.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: unknown, max = 200) => String(value || "").trim().slice(0, max);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return safeError("Método no permitido.", 405);
  const client = serviceClient();
  const { data: authData, error: authError } = await client.auth.getUser(bearerToken(request));
  const admin = authData?.user;
  if (authError || !admin) return safeError("Sesión no válida.", 401);
  const { data: profile } = await client.from("profiles").select("role,is_active,business_owner_id").eq("id", admin.id).maybeSingle();
  if (!profile || profile.role !== "admin" || !profile.is_active || profile.business_owner_id !== admin.id) return safeError("No autorizado.", 403);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return safeError("Solicitud no válida."); }
  const action = clean(body.action, 30);

  if (action === "create") {
    const email = clean(body.email, 254).toLowerCase();
    const password = String(body.password || "");
    const fullName = clean(body.full_name, 120);
    const specialty = clean(body.specialty, 100);
    const documentNumber = clean(body.document_number, 40);
    if (!emailPattern.test(email) || fullName.length < 2 || !specialty || !documentNumber) return safeError("Completa correctamente los campos obligatorios.");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return safeError("La contraseña debe tener al menos 8 caracteres, letras y números.");
    const { data: created, error: createError } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (createError || !created.user) return safeError(createError?.message || "No se pudo crear el acceso.", 409);
    const authUserId = created.user.id;
    const technician = {
      business_id: admin.id, auth_user_id: authUserId, full_name: fullName,
      document_type: clean(body.document_type, 10) || "CC", document_number: documentNumber,
      phone: clean(body.phone, 30).replace(/[^\d+]/g, ""), email, specialty,
      linked_at: clean(body.linked_at, 10) || new Date().toISOString().slice(0, 10),
      visibility_scope: clean(body.visibility_scope, 30) || "assigned",
      can_view_client: body.can_view_client !== false, can_view_prices: body.can_view_prices === true,
      can_view_commission: body.can_view_commission !== false,
      can_view_commission_status: body.can_view_commission_status !== false, created_by: admin.id,
    };
    const { data: row, error: rowError } = await client.from("technicians").insert(technician).select("*").single();
    if (rowError) { await client.auth.admin.deleteUser(authUserId); return safeError("No se pudo guardar el técnico. Verifica correo y documento únicos.", 409); }
    const { error: profileError } = await client.from("profiles").upsert({ id: authUserId, email, business_name: "", role: "technician", business_owner_id: admin.id, is_active: true });
    if (profileError) { await client.from("technicians").delete().eq("id", row.id); await client.auth.admin.deleteUser(authUserId); return safeError("No se pudo completar el perfil técnico.", 409); }
    return json({ technician: row }, 201);
  }

  const technicianId = clean(body.technician_id, 60);
  const { data: technician } = await client.from("technicians").select("*").eq("id", technicianId).eq("business_id", admin.id).maybeSingle();
  if (!technician) return safeError("Técnico no encontrado.", 404);

  if (action === "update") {
    const email = clean(body.email, 254).toLowerCase();
    const fullName = clean(body.full_name, 120);
    const specialty = clean(body.specialty, 100);
    const documentNumber = clean(body.document_number, 40);
    const visibilityScope = clean(body.visibility_scope, 30);
    const linkedAt = clean(body.linked_at, 10);
    if (!emailPattern.test(email) || fullName.length < 2 || !specialty || !documentNumber) return safeError("Completa correctamente los campos obligatorios.");
    if (!["assigned", "business_read", "assigned_unassigned"].includes(visibilityScope)) return safeError("Alcance de visualización no válido.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(linkedAt)) return safeError("Fecha de vinculación no válida.");
    const changes = {
      full_name: fullName,
      document_type: clean(body.document_type, 15) || "CC",
      document_number: documentNumber,
      phone: clean(body.phone, 30).replace(/[^\d+]/g, ""),
      email,
      specialty,
      linked_at: linkedAt,
      visibility_scope: visibilityScope,
      can_view_client: body.can_view_client === true,
      can_view_prices: body.can_view_prices === true,
      can_view_commission: body.can_view_commission === true,
      can_view_commission_status: body.can_view_commission_status === true,
      updated_at: new Date().toISOString(),
    };
    const emailChanged = email !== technician.email;
    if (emailChanged) {
      const { error: authUpdateError } = await client.auth.admin.updateUserById(technician.auth_user_id, { email, email_confirm: true });
      if (authUpdateError) return safeError("No se pudo actualizar el correo de acceso. Verifica que sea único.", 409);
    }
    const { data: updated, error: updateError } = await client.from("technicians").update(changes).eq("id", technician.id).eq("business_id", admin.id).select("*").single();
    if (updateError || !updated) {
      if (emailChanged) await client.auth.admin.updateUserById(technician.auth_user_id, { email: technician.email, email_confirm: true });
      return safeError("No se pudieron guardar los cambios. Verifica documento y correo únicos.", 409);
    }
    await client.from("profiles").update({ email, updated_at: new Date().toISOString() }).eq("id", technician.auth_user_id);
    await client.auth.admin.updateUserById(technician.auth_user_id, { user_metadata: { full_name: fullName } });
    return json({ technician: updated });
  }

  if (action === "set-active") {
    const isActive = body.is_active === true;
    const { data: activeJobs } = await client.from("income_entries").select("id").eq("technician_id", technician.id).not("status", "in", "(ready,delivered,cancelled)");
    if (!isActive && activeJobs?.length) return safeError("Reasigna los trabajos activos antes de desactivar al técnico.", 409);
    await client.from("technicians").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", technician.id);
    await client.from("profiles").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", technician.auth_user_id);
    await client.auth.admin.updateUserById(technician.auth_user_id, { ban_duration: isActive ? "none" : "876000h" });
    return json({ ok: true, is_active: isActive });
  }

  if (action === "reset-password") {
    const password = String(body.password || "");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return safeError("La contraseña debe tener al menos 8 caracteres, letras y números.");
    const { error } = await client.auth.admin.updateUserById(technician.auth_user_id, { password });
    if (error) return safeError("No se pudo actualizar la contraseña.", 409);
    return json({ ok: true });
  }
  return safeError("Operación no válida.");
});
