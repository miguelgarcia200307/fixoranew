import { corsHeaders,json,safeError } from "../_shared/signature-utils.ts";
import { actor,createLink,isAdmin,trackingSummary } from "../_shared/tracking.ts";

Deno.serve(async(request)=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST")return safeError("Método no permitido.",405);
  const context=await actor(request); if(!context.user)return safeError("Sesión no válida.",401);
  let body:any;try{body=await request.json()}catch{return safeError("Solicitud no válida.")}
  const id=String(body.income_entry_id||"");
  const {data:entry}=await context.client.from("income_entries").select("id,user_id,code,status,status_version,technician_id,device_type,device_custom_type,brand,brand_custom,model,problem_reported,client_id,clients(name,last_name,phone,whatsapp,country)").eq("id",id).maybeSingle();
  if(!entry)return safeError("Ingreso no encontrado.",404);
  const admin=isAdmin(context,entry.user_id),assigned=!!context.technician?.is_active&&context.technician.business_id===entry.user_id&&context.technician.id===entry.technician_id;
  if(!admin&&!assigned)return safeError("Ingreso no encontrado.",404);
  try{
    const {data:latest}=await context.client.from("repair_tracking_links").select("status").eq("income_entry_id",entry.id).order("version",{ascending:false}).limit(1).maybeSingle();
    if(latest?.status==="revoked"&&body.allow_after_revocation!==true)return json({error:"El enlace de seguimiento fue revocado.",requires_confirmation:true},409);
    if(latest?.status==="revoked"&&(!admin||body.allow_after_revocation!==true))return safeError("Solo el administrador puede reactivar el seguimiento.",403);
    const result=await createLink(context.client,entry.user_id,entry.id,context.user.id,false);
    const {count}=await context.client.from("repair_updates").select("id",{count:"exact",head:true}).eq("income_entry_id",entry.id);
    if(!count){await context.client.from("repair_updates").insert({business_id:entry.user_id,income_entry_id:entry.id,technician_id:null,created_by:context.user.id,status_code:entry.status,public_title:entry.status==="received"?"Recibido":"Seguimiento activado",public_description:entry.status==="received"?"El equipo fue recibido y registrado correctamente.":"El seguimiento comenzó desde la fecha de activación. No se añadieron eventos anteriores.",visible_to_customer:true,status_version:entry.status_version||1});}
    const {data:config}=await context.client.from("business_config").select("business_name,country,phone,whatsapp,tracking_contact_phone,tracking_intake_template,tracking_update_template,tracking_finished_template").eq("user_id",entry.user_id).maybeSingle();
    return json({tracking:trackingSummary(result.row,result.token,{updates_count:Number(count||0)+(count?0:1),notification_config:config||{}}),entry:{id:entry.id,code:entry.code,status:entry.status,client:entry.clients},config:config||{}},result.reused?200:201);
  }catch(error){return safeError(error instanceof Error?error.message:"No se pudo crear el enlace.",409)}
});
