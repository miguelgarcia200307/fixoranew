import { bearerToken, corsHeaders, json, safeError, serviceClient } from "../_shared/signature-utils.ts";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async(request)=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST")return safeError("Método no permitido.",405);
  const client=serviceClient();
  const {data:userData,error:userError}=await client.auth.getUser(bearerToken(request));
  const user=userData?.user;
  if(userError||!user)return safeError("Tu sesión no es válida.",401);
  let body:any;try{body=await request.json()}catch{return safeError("Solicitud no válida.")}
  const ids=[...new Set(Array.isArray(body.income_ids)?body.income_ids.map(String):[])];
  if(!ids.length||ids.length>50||ids.some(id=>!UUID.test(id)))return safeError("Selecciona ingresos válidos para eliminar.");
  const {data,error}=await client.rpc("delete_income_entries_admin",{p_business_id:user.id,p_income_ids:ids});
  if(error||!data)return safeError("No se pudieron eliminar los ingresos seleccionados.",409);
  const objects=Array.isArray(data.objects)?data.objects:[];
  let pending=0;
  for(const bucket of [...new Set(objects.map((item:any)=>String(item.bucket)))]){
    const group=objects.filter((item:any)=>item.bucket===bucket);
    const {error:removeError}=await client.storage.from(bucket).remove(group.map((item:any)=>String(item.path)));
    if(removeError){pending+=group.length;await client.from("storage_cleanup_queue").update({status:"failed",error_message:"storage_remove_failed"}).in("id",group.map((item:any)=>item.id));continue}
    await client.from("storage_cleanup_queue").update({status:"cleaned",cleaned_at:new Date().toISOString(),error_message:""}).in("id",group.map((item:any)=>item.id));
  }
  return json({ok:true,deleted_count:Number(data.deleted_count)||ids.length,cleanup_pending:pending});
});
