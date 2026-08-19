import { photoAdmin } from "../_shared/photo-capture.ts";
Deno.serve((request)=>photoAdmin(request,"create"));
