import { createClient } from "npm:@supabase/supabase-js@2.110.7";
import { bearerToken, decryptToken, encryptToken, randomToken, serviceClient, sha256 } from "./signature-utils.ts";

export const trackingTokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const statusLabels: Record<string,string> = {
  received:"Recibido", assigned:"Asignado", diagnosing:"En diagnóstico",
  waiting_customer:"Esperando respuesta del cliente", waiting_authorization:"Esperando autorización",
  waiting_part:"Esperando repuesto", repairing:"En reparación", testing:"En pruebas",
  finished:"Terminado", ready_for_delivery:"Listo para entregar", delivered:"Entregado", cancelled:"Cancelado",
};

export const clean = (value: unknown, max = 2000) => String(value ?? "").trim().slice(0,max);
export const maskSerial = (value: unknown) => {
  const text=clean(value,100); if(!text)return ""; if(text.length<=4)return "•".repeat(text.length);
  return `${"•".repeat(Math.min(8,text.length-4))}${text.slice(-4)}`;
};
export const deviceLabel = (entry: any) => [entry.device_custom_type || ({desktop:"Computador de escritorio",laptop:"Portátil",phone:"Celular",tablet:"Tablet",smartwatch:"Smartwatch",console:"Consola",printer:"Impresora",monitor:"Monitor",other:"Equipo"}[entry.device_type] || "Equipo"),entry.brand_custom||entry.brand,entry.model].filter(Boolean).join(" · ");

export async function authenticated(request: Request) {
  const client=serviceClient();
  const {data,error}=await client.auth.getUser(bearerToken(request));
  return {client,user:error?null:data?.user};
}
export async function actor(request: Request) {
  const auth=await authenticated(request); if(!auth.user)return {...auth,profile:null,technician:null};
  const [{data:profile},{data:technician}]=await Promise.all([
    auth.client.from("profiles").select("role,is_active,business_owner_id").eq("id",auth.user.id).maybeSingle(),
    auth.client.from("technicians").select("id,business_id,is_active").eq("auth_user_id",auth.user.id).maybeSingle(),
  ]);
  return {...auth,profile,technician};
}
export const isAdmin = (context:any,businessId:string) => context.profile?.role==="admin" && context.profile?.is_active && context.profile?.business_owner_id===businessId && context.user?.id===businessId;
export const userClient = (request:Request) => createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:`Bearer ${bearerToken(request)}`}},auth:{persistSession:false,autoRefreshToken:false}});

export async function createLink(client:any,businessId:string,incomeEntryId:string,createdBy:string,force=false) {
  const now=new Date().toISOString();
  const {data:active}=await client.from("repair_tracking_links").select("*").eq("business_id",businessId).eq("income_entry_id",incomeEntryId).eq("status","active").maybeSingle();
  if(active&&!force) return {row:active,token:await decryptToken(active.token_ciphertext),reused:true};
  const version=active?Number(active.version)+1:Number((await client.from("repair_tracking_links").select("version").eq("income_entry_id",incomeEntryId).order("version",{ascending:false}).limit(1)).data?.[0]?.version||0)+1;
  if(active) await client.from("repair_tracking_links").update({status:"superseded",revoked_at:now}).eq("id",active.id).eq("status","active");
  const token=randomToken(),id=crypto.randomUUID();
  const {data:row,error}=await client.from("repair_tracking_links").insert({id,business_id:businessId,income_entry_id:incomeEntryId,token_hash:await sha256(token),token_ciphertext:await encryptToken(token),channel_key:randomToken(),version,status:"active",created_by:createdBy}).select("*").single();
  if(error||!row)throw new Error("No se pudo crear el enlace de seguimiento.");
  return {row,token,reused:false};
}

export async function resolvePublicToken(token:string) {
  if(!trackingTokenPattern.test(token))return null;
  const client=serviceClient();
  const {data:link}=await client.from("repair_tracking_links").select("*").eq("token_hash",await sha256(token)).maybeSingle();
  if(!link||link.status!=="active")return null;
  if(link.expires_at&&new Date(link.expires_at).getTime()<=Date.now()){
    await client.from("repair_tracking_links").update({status:"expired"}).eq("id",link.id).eq("status","active"); return null;
  }
  return {client,link};
}

export function trackingSummary(row:any,token:string,extra:any={}) {
  return {id:row.id,token,version:row.version,status:row.status,created_at:row.created_at,expires_at:row.expires_at,last_accessed_at:row.last_accessed_at,access_count:row.access_count,...extra};
}
