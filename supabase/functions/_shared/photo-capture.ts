import { bearerToken, corsHeaders, decryptToken, encryptToken, json, randomToken, safeError, serviceClient, sha256 } from "./signature-utils.ts";

const CATEGORIES = new Set(["Tapa","Pantalla y teclado","Parte inferior","Laterales","Serial","Cargador","Daño visible","Otra"]);
const MIMES: Record<string,string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp" };
const invalid = () => safeError("Este enlace ya no está disponible. Solicita uno nuevo desde Fixora.", 410);
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
const publicSession = (row: any) => ({ id:row.id,status:row.status,ingreso_code:row.ingreso_code || "",photo_count:row.photo_count,max_photos:row.max_photos,expires_at:row.expires_at,created_at:row.created_at });
const publicInfo = (row: any) => ({ status:row.status,ingreso_code:row.ingreso_code || "",photo_count:row.photo_count,max_photos:row.max_photos,expires_at:row.expires_at });

async function authenticated(request: Request) {
  const client = serviceClient();
  const { data, error } = await client.auth.getUser(bearerToken(request));
  return { client, user: error ? null : data?.user };
}

async function readBody(request: Request) { try { return await request.json(); } catch { return null; } }

async function resolveToken(body: any, allowCompleted = false) {
  const token = String(body?.token || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const client = serviceClient();
  const { data:session } = await client.from("photo_capture_sessions").select("*").eq("token_hash",await sha256(token)).maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now() && ["pending","receiving"].includes(session.status)) {
    await client.from("photo_capture_sessions").update({status:"expired",updated_at:new Date().toISOString()}).eq("id",session.id);
    return null;
  }
  if (!["pending","receiving",...(allowCompleted?["completed"]:[])].includes(session.status)) return null;
  return { client, session, token };
}

function imageInfo(bytes: Uint8Array, mime: string) {
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (mime === "image/png") {
    if (bytes.length<24 || ![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return null;
    return {width:view.getUint32(16),height:view.getUint32(20)};
  }
  if (mime === "image/jpeg") {
    if (bytes[0]!==0xff || bytes[1]!==0xd8) return null;
    let p=2;
    while (p+9<bytes.length) {
      if (bytes[p]!==0xff) { p++; continue; }
      const marker=bytes[p+1], len=view.getUint16(p+2);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return {height:view.getUint16(p+5),width:view.getUint16(p+7)};
      if (len<2) break; p+=2+len;
    }
    return null;
  }
  if (mime === "image/webp") {
    if (bytes.length<30 || new TextDecoder().decode(bytes.slice(0,4))!=="RIFF" || new TextDecoder().decode(bytes.slice(8,12))!=="WEBP") return null;
    const kind=new TextDecoder().decode(bytes.slice(12,16));
    if(kind==="VP8X") return {width:1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),height:1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)};
    if(kind==="VP8L") { const b0=bytes[21],b1=bytes[22],b2=bytes[23],b3=bytes[24]; return {width:1+(((b2&0x3f)<<8)|b1),height:1+((b3<<6)|(b2>>2))}; }
  }
  return null;
}

export async function photoAdmin(request: Request, action: "create"|"revoke") {
  if (request.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if (request.method!=="POST") return safeError("Método no permitido.",405);
  const body=await readBody(request); if(!body) return safeError("Solicitud no válida.");
  const {client,user}=await authenticated(request); if(!user) return safeError("Tu sesión no es válida.",401);
  if(action==="revoke") {
    const id=String(body.session_id||"");
    const {data}=await client.from("photo_capture_sessions").update({status:"revoked",revoked_at:new Date().toISOString(),revoked_by:user.id,updated_at:new Date().toISOString()})
      .eq("id",id).eq("business_id",user.id).in("status",["pending","receiving"]).select("id").maybeSingle();
    return data?json({ok:true}):safeError("La sesión ya no puede revocarse.",409);
  }
  const ingresoId=body.ingreso_id?String(body.ingreso_id):null, draftId=body.draft_id?String(body.draft_id):null;
  if((!!ingresoId)===(!!draftId) || (ingresoId&&!uuid(ingresoId)) || (draftId&&!uuid(draftId))) return safeError("El contexto de fotografías no es válido.");
  let ingreso:any=null;
  if(ingresoId) {
    const {data}=await client.from("income_entries").select("id,user_id,code,status").eq("id",ingresoId).eq("user_id",user.id).maybeSingle(); ingreso=data;
    if(!ingreso) return safeError("El ingreso ya no existe.",404);
    if(["delivered","cancelled"].includes(ingreso.status)) return safeError("El estado del ingreso no permite agregar fotografías.",409);
  }
  const now=new Date().toISOString();
  let q=client.from("photo_capture_sessions").select("*").eq("business_id",user.id).in("status",["pending","receiving"]).gt("expires_at",now);
  q=ingresoId?q.eq("ingreso_id",ingresoId):q.eq("draft_id",draftId);
  const {data:active}=await q.maybeSingle();
  if(active && body.regenerate!==true) {
    try { return json({session:publicSession(active),token:await decryptToken(active.token_ciphertext),reused:true}); }
    catch { return safeError("No se pudo recuperar el enlace activo. Regenera la sesión.",409); }
  }
  const token=randomToken(), expiresAt=new Date(Date.now()+Math.min(60,Math.max(5,Number(body.expiration_minutes)||30))*60000).toISOString();
  const sessionId=crypto.randomUUID();
  if(active) await client.from("photo_capture_sessions").update({status:"superseded",superseded_by:sessionId,updated_at:now}).eq("id",active.id).eq("business_id",user.id);
  const {data:created,error}=await client.from("photo_capture_sessions").insert({id:sessionId,business_id:user.id,created_by:user.id,ingreso_id:ingresoId,draft_id:draftId,ingreso_code:ingreso?.code||null,token_hash:await sha256(token),token_ciphertext:await encryptToken(token),expires_at:expiresAt,max_photos:12,status:"pending"})
    .select("*").single();
  return error||!created?safeError("No se pudo crear la sesión de fotografías.",409):json({session:publicSession(created),token,reused:false},201);
}

export async function photoPublic(request: Request, action: "inspect"|"request"|"confirm"|"complete"|"delete") {
  if(request.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST") return safeError("Método no permitido.",405);
  const body=await readBody(request); if(!body) return invalid();
  const resolved=await resolveToken(body,action==="complete"); if(!resolved) return invalid();
  const {client,session}=resolved;
  if(action==="inspect") return json(publicInfo(session));
  if(action==="request") {
    const mime=String(body.mime_type||""), size=Number(body.file_size||0), category=CATEGORIES.has(String(body.category))?String(body.category):"Otra";
    if(!MIMES[mime]) return safeError("Formato de fotografía no compatible.");
    if(!Number.isFinite(size)||size<1||size>3145728) return safeError("La fotografía optimizada supera el tamaño permitido.");
    const [{count:confirmed},{count:pending}]=await Promise.all([
      client.from("income_entry_photos").select("id",{count:"exact",head:true}).eq("capture_session_id",session.id).neq("status","deleted"),
      client.from("photo_upload_reservations").select("id",{count:"exact",head:true}).eq("session_id",session.id).eq("status","pending")
    ]);
    if((confirmed||0)+(pending||0)>=session.max_photos) return safeError("Se alcanzó el límite de fotografías.",409);
    const photoId=crypto.randomUUID(), path=`${session.business_id}/remote/${session.id}/${photoId}.${MIMES[mime]}`;
    const {data:signed,error}=await client.storage.from("income-entry-photos").createSignedUploadUrl(path);
    if(error||!signed) return safeError("No se pudo preparar la carga.",503);
    const {error:reserveError}=await client.from("photo_upload_reservations").insert({id:photoId,session_id:session.id,business_id:session.business_id,storage_path:path,category,sort_order:Math.max(0,Number(body.sort_order)||0),mime_type:mime,expected_size:size});
    if(reserveError) return safeError("No se pudo preparar la fotografía.",409);
    await client.from("photo_capture_sessions").update({status:"receiving",updated_at:new Date().toISOString(),user_agent:request.headers.get("user-agent")||"",ip_address:request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||null}).eq("id",session.id).eq("status","pending");
    return json({photo_id:photoId,upload_url:signed.signedUrl,path_token:signed.token});
  }
  if(action==="confirm") {
    const photoId=String(body.photo_id||"");
    const {data:reservation}=await client.from("photo_upload_reservations").select("*").eq("id",photoId).eq("session_id",session.id).maybeSingle();
    if(!reservation) return safeError("La carga no existe.",404);
    if(reservation.status==="confirmed") return json({ok:true,photo_id:photoId,reused:true});
    if(reservation.status!=="pending") return safeError("La carga ya no está disponible.",409);
    const {data:blob,error:downloadError}=await client.storage.from("income-entry-photos").download(reservation.storage_path);
    if(downloadError||!blob) return safeError("No se encontró la fotografía cargada.",409);
    if(blob.size!==Number(reservation.expected_size)||blob.size>3145728) { await client.storage.from("income-entry-photos").remove([reservation.storage_path]); return safeError("El archivo recibido no es válido."); }
    const bytes=new Uint8Array(await blob.arrayBuffer()), info=imageInfo(bytes,reservation.mime_type);
    if(!info||info.width<160||info.height<160||info.width>6000||info.height>6000) { await client.storage.from("income-entry-photos").remove([reservation.storage_path]); return safeError("La imagen recibida no es válida."); }
    const hash=await sha256(bytes), status=session.ingreso_id?"attached":"staged";
    const {error:insertError}=await client.from("income_entry_photos").insert({id:photoId,user_id:session.business_id,income_entry_id:session.ingreso_id||null,draft_id:session.draft_id||null,capture_session_id:session.id,file_path:reservation.storage_path,angle:reservation.category,sort_order:reservation.sort_order,status,origin:"mobile_qr",image_sha256:hash,file_size:blob.size,mime_type:reservation.mime_type,width:info.width,height:info.height,captured_at:new Date().toISOString()});
    if(insertError) { await client.storage.from("income-entry-photos").remove([reservation.storage_path]); return insertError.code==="23505"?safeError("Esta fotografía ya fue enviada.",409):safeError("No se pudo confirmar la fotografía.",409); }
    await client.from("photo_upload_reservations").update({status:"confirmed",confirmed_at:new Date().toISOString()}).eq("id",photoId);
    const {count}=await client.from("income_entry_photos").select("id",{count:"exact",head:true}).eq("capture_session_id",session.id).neq("status","deleted");
    await client.from("photo_capture_sessions").update({photo_count:count||0,status:"receiving",updated_at:new Date().toISOString()}).eq("id",session.id);
    return json({ok:true,photo_id:photoId,width:info.width,height:info.height,count:count||0});
  }
  if(action==="delete") {
    if(session.status==="completed") return invalid();
    const photoId=String(body.photo_id||"");
    const {data:photo}=await client.from("income_entry_photos").select("id,file_path").eq("id",photoId).eq("capture_session_id",session.id).neq("status","deleted").maybeSingle();
    if(!photo) {
      const {data:reservation}=await client.from("photo_upload_reservations").select("id,storage_path,status").eq("id",photoId).eq("session_id",session.id).maybeSingle();
      if(!reservation) return safeError("La fotografía no existe.",404);
      await client.storage.from("income-entry-photos").remove([reservation.storage_path]);
      await client.from("photo_upload_reservations").update({status:"deleted"}).eq("id",photoId).eq("session_id",session.id);
      return json({ok:true,count:session.photo_count||0});
    }
    await client.from("income_entry_photos").update({status:"deleted",deleted_at:new Date().toISOString()}).eq("id",photo.id).eq("capture_session_id",session.id);
    await client.storage.from("income-entry-photos").remove([photo.file_path]);
    const {count}=await client.from("income_entry_photos").select("id",{count:"exact",head:true}).eq("capture_session_id",session.id).neq("status","deleted");
    await client.from("photo_capture_sessions").update({photo_count:count||0,updated_at:new Date().toISOString()}).eq("id",session.id);
    return json({ok:true,count:count||0});
  }
  if(session.status==="completed") return json({ok:true,count:session.photo_count,reused:true,ingreso_code:session.ingreso_code||""});
  const [{count},{count:pending}]=await Promise.all([
    client.from("income_entry_photos").select("id",{count:"exact",head:true}).eq("capture_session_id",session.id).neq("status","deleted"),
    client.from("photo_upload_reservations").select("id",{count:"exact",head:true}).eq("session_id",session.id).eq("status","pending")
  ]);
  if(!(count||0)) return safeError("Agrega al menos una fotografía antes de enviar.",409);
  if((pending||0)>0) return safeError("Espera a que terminen todas las cargas.",409);
  const {data:done}=await client.from("photo_capture_sessions").update({status:"completed",photo_count:count,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id).in("status",["pending","receiving"]).select("ingreso_code").maybeSingle();
  return done?json({ok:true,count,ingreso_code:done.ingreso_code||""}):invalid();
}
