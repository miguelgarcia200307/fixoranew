import { photoPublic } from "../_shared/photo-capture.ts";
Deno.serve((request)=>photoPublic(request,"request"));
