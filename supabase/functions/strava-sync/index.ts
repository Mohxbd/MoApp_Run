import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Méthode non autorisée"},405);
  const auth=req.headers.get("Authorization")||"";
  const userClient=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return json({error:"Authentification requise"},401);
  const service=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:conn,error}=await service.from("strava_connections").select("*").eq("user_id",user.id).maybeSingle();
  if(error||!conn)return json({error:"Compte Strava non connecté"},400);
  let access=conn.access_token, refresh=conn.refresh_token, expires=Number(conn.expires_at);
  if(expires*1000<Date.now()+60_000){
    const res=await fetch("https://www.strava.com/oauth/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_id:Deno.env.get("STRAVA_CLIENT_ID"),client_secret:Deno.env.get("STRAVA_CLIENT_SECRET"),grant_type:"refresh_token",refresh_token:refresh})});
    if(!res.ok)return json({error:"Renouvellement Strava impossible. Reconnecte le compte."},502);
    const t=await res.json();access=t.access_token;refresh=t.refresh_token;expires=t.expires_at;
    const {error:upErr}=await service.from("strava_connections").update({access_token:access,refresh_token:refresh,expires_at:expires,updated_at:new Date().toISOString()}).eq("user_id",user.id);
    if(upErr)return json({error:"Impossible d'enregistrer le renouvellement"},500);
  }
  const response=await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=100&page=1",{headers:{Authorization:`Bearer ${access}`}});
  if(!response.ok)return json({error:`Strava API indisponible (${response.status})`},502);
  const raw=await response.json();
  const runs=(raw||[]).filter((a:any)=>a.type==="Run"||a.sport_type==="Run").map((a:any)=>({user_id:user.id,source:"strava",source_id:String(a.id),name:a.name||"Course à pied",start_date:a.start_date,distance_km:Number(a.distance)/1000,duration_min:Number(a.moving_time)/60,avg_hr:a.has_heartrate&&a.average_heartrate?Math.round(a.average_heartrate):null,max_hr:a.has_heartrate&&a.max_heartrate?Math.round(a.max_heartrate):null,elevation_gain_m:a.total_elevation_gain??null,raw_summary:{elapsed_time:a.elapsed_time,moving_time:a.moving_time,average_speed:a.average_speed,max_speed:a.max_speed,has_heartrate:a.has_heartrate}}));
  for(const a of runs){
    const {error:saveErr}=await service.from("activities").upsert(a,{onConflict:"user_id,source,source_id",ignoreDuplicates:false});
    if(saveErr)return json({error:"Import partiel : une activité n'a pas pu être enregistrée"},500);
  }
  return json({activities:runs.map(a=>({...a,id:undefined,created_at:new Date().toISOString()})),count:runs.length});
});
