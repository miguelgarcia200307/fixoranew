import { corsHeaders,json,safeError } from "../_shared/signature-utils.ts";
import { actor,clean,isAdmin,statusLabels,userClient } from "../_shared/tracking.ts";

const mimes:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
Deno.serve(async(request)=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST")return safeError("Método no permitido.",405);
  const c=await actor(request);if(!c.user||!c.profile?.is_active)return safeError("Sesión no válida.",401);
  let body:any;try{body=await request.json()}catch{return safeError("Solicitud no válida.")}
  const id=String(body.income_entry_id||"");
  const {data:entry}=await c.client.from("income_entries").select("id,user_id,technician_id,status,status_version,client_id,clients(phone,whatsapp,country)").eq("id",id).maybeSingle();
  if(!entry)return safeError("Reparación no encontrada.",404);
  const admin=isAdmin(c,entry.user_id),assigned=!!c.technician?.is_active&&c.technician.business_id===entry.user_id&&c.technician.id===entry.technician_id;
  if(!admin&&!assigned)return safeError("No puedes modificar esta reparación.",403);
  const action=clean(body.action,30)||"publish";
  if(action==="prepare_upload"){
    const mime=clean(body.mime_type,40),size=Number(body.file_size||0);if(!mimes[mime]||!Number.isFinite(size)||size<1||size>5242880)return safeError("La fotografía no es válida o supera 5 MB.");
    const uploadId=crypto.randomUUID(),path=`${entry.user_id}/${entry.id}/${uploadId}.${mimes[mime]}`;
    const {data:signed,error}=await c.client.storage.from("repair-progress").createSignedUploadUrl(path);if(error||!signed)return safeError("No se pudo preparar la fotografía.",503);
    const {error:reserve}=await c.client.from("repair_photo_uploads").insert({id:uploadId,business_id:entry.user_id,income_entry_id:entry.id,storage_path:path,mime_type:mime,expected_size:size,created_by:c.user.id});if(reserve)return safeError("No se pudo reservar la fotografía.",409);
    return json({upload_id:uploadId,upload_url:signed.signedUrl,path_token:signed.token});
  }
  if(action==="record_notification"){
    const phone=clean(body.phone,30).replace(/[^\d+]/g,""),message=clean(body.message,5000),type=["intake","update","finished"].includes(body.notification_type)?body.notification_type:"update";
    if(!phone||!message)return safeError("Teléfono y mensaje son obligatorios.");
    const {data,error}=await c.client.from("whatsapp_notification_attempts").insert({business_id:entry.user_id,income_entry_id:entry.id,repair_update_id:body.repair_update_id||null,client_id:entry.client_id,phone_snapshot:phone,message_snapshot:message,notification_type:type,initiated_by:c.user.id,status:"opened"}).select("id,initiated_at,status").single();
    return error?safeError("No se pudo registrar el intento.",409):json({attempt:data});
  }
  const publicDescription=clean(body.public_description,2000),internalNote=clean(body.internal_note,4000),status=clean(body.status_code,40);
  const photos=Array.isArray(body.photos)?body.photos.slice(0,10).map((p:any,i:number)=>({upload_id:String(p.upload_id||""),caption:clean(p.caption,300),sort_order:i,visible_to_customer:p.visible_to_customer===true})):[];
  const scoped=userClient(request);
  const {data,error}=await scoped.rpc("publish_repair_update",{p_income_entry_id:entry.id,p_status_code:status,p_public_title:clean(body.public_title,120)||statusLabels[status]||"Actualización",p_public_description:publicDescription,p_internal_note:internalNote,p_visible_to_customer:body.visible_to_customer!==false,p_expected_version:Number(body.expected_version),p_photos:photos});
  if(error)return safeError(error.message?.includes("otra sesión")?"El estado cambió en otra sesión. Actualiza e inténtalo nuevamente.":error.message||"No se pudo guardar el avance.",409);
  return json({update:data,status_code:status,status_label:statusLabels[status]},201);
});
