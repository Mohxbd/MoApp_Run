import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const auth=req.headers.get("Authorization")||"";
 const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return new Response(JSON.stringify({error:"Authentification requise"}),{status:401,headers:cors});
 const service=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:conn}=await service.from("strava_connections").select("access_token").eq("user_id",user.id).maybeSingle();
 if(conn?.access_token) await fetch("https://www.strava.com/oauth/deauthorize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({access_token:conn.access_token})});
 await service.from("strava_connections").delete().eq("user_id",user.id);
 return new Response(JSON.stringify({ok:true}),{headers:cors});
});
