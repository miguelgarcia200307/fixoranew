import { corsHeaders,json,safeError } from "../_shared/signature-utils.ts";
import { clean,deviceLabel,maskSerial,resolvePublicToken,statusLabels } from "../_shared/tracking.ts";

const unavailable=()=>safeError("Este enlace ya no está disponible. Puede haber vencido, sido reemplazado o revocado.",410);
Deno.serve(async(request)=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST")return safeError("Método no permitido.",405);
  let body:any;try{body=await request.json()}catch{return unavailable()}
  const resolved=await resolvePublicToken(String(body.token||""));if(!resolved)return unavailable();
  const {client,link}=resolved;
  const [{data:entry},{data:config},{data:updates}]=await Promise.all([
    client.from("income_entries").select("id,code,status,received_at,device_type,device_custom_type,brand,brand_custom,model,serial,problem_reported,clients(name,last_name)").eq("id",link.income_entry_id).eq("user_id",link.business_id).maybeSingle(),
    client.from("business_config").select("business_name,phone,whatsapp,logo_url,color_primary,color_secondary,tracking_show_model,tracking_show_masked_serial,tracking_show_photos,tracking_contact_phone,tracking_footer").eq("user_id",link.business_id).maybeSingle(),
    client.from("repair_updates").select("id,status_code,public_title,public_description,occurred_at,created_at,repair_update_photos(id,storage_path,caption,sort_order,visible_to_customer,mime_type)").eq("income_entry_id",link.income_entry_id).eq("visible_to_customer",true).order("occurred_at",{ascending:false}),
  ]);
  if(!entry)return unavailable();
  const showPhotos=config?.tracking_show_photos!==false;
  const safeUpdates=await Promise.all((updates||[]).map(async(update:any)=>{
    const photos=[];
    if(showPhotos)for(const photo of (update.repair_update_photos||[]).filter((p:any)=>p.visible_to_customer).sort((a:any,b:any)=>a.sort_order-b.sort_order)){
      const {data}=await client.storage.from("repair-progress").createSignedUrl(photo.storage_path,300);
      if(data?.signedUrl)photos.push({id:photo.id,url:data.signedUrl,caption:clean(photo.caption,300),mime_type:photo.mime_type});
    }
    return {id:update.id,status_code:update.status_code,status_label:statusLabels[update.status_code]||"Actualización",title:clean(update.public_title,120)||statusLabels[update.status_code],description:clean(update.public_description,2000),occurred_at:update.occurred_at,photos};
  }));
  const model=config?.tracking_show_model===false?"":entry.model;
  const clientInfo=Array.isArray(entry.clients)?entry.clients[0]:entry.clients;
  await client.from("repair_tracking_links").update({last_accessed_at:new Date().toISOString(),access_count:Number(link.access_count||0)+1}).eq("id",link.id).eq("status","active");
  return json({
    tracking:{status:link.status,version:link.version,created_at:link.created_at,expires_at:link.expires_at,historical:entry.status==="delivered",updated_at:safeUpdates[0]?.occurred_at||entry.received_at},
    business:{name:clean(config?.business_name,120)||"Fixora",logo_url:clean(config?.logo_url,1000),primary_color:clean(config?.color_primary,20)||"#6366f1",secondary_color:clean(config?.color_secondary,20)||"#0ea5e9",contact_phone:clean(config?.tracking_contact_phone||config?.whatsapp||config?.phone,40),footer:clean(config?.tracking_footer,300)||"Seguimiento seguro proporcionado por Fixora."},
    repair:{code:clean(entry.code,60),status_code:entry.status,status_label:statusLabels[entry.status]||"En proceso",received_at:entry.received_at,device:deviceLabel({...entry,model}),device_type:entry.device_type,brand:clean(entry.brand_custom||entry.brand,100),model:clean(model,100),serial:config?.tracking_show_masked_serial?maskSerial(entry.serial):"",service_requested:clean(entry.problem_reported,1000)},
    customer:{first_name:clean(clientInfo?.name,80)},updates:safeUpdates,
  });
});
