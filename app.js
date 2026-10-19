/* MoApp Run — vanilla JS frontend. Secrets must never be placed here. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const STORE_KEY = "moapp-run-activities-v1";
  const CONFIG_KEY = "moapp-run-config-v1";
  const defaultConfig = { supabaseUrl: "", supabaseAnonKey: "" };
  let config = {...defaultConfig, ...(window.MOAPP_CONFIG || {}), ...readJson(CONFIG_KEY, {})};
  let supabase = null, session = null, activities = readJson(STORE_KEY, []);
  const fmtDate = (v) => { const d = new Date(v); return Number.isNaN(+d) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric"}).format(d); };
  const fmtDuration = (minutes) => { if (!Number.isFinite(minutes)) return "—"; const total = Math.round(minutes*60); return `${Math.floor(total/3600)}:${String(Math.floor(total%3600/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`.replace(/^0:/,""); };
  const fmtPace = (km, min) => { if (!(km>0 && min>0)) return "—"; const sec=Math.round(min*60/km); return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`; };
  function readJson(k, fallback){ try { const v=JSON.parse(localStorage.getItem(k)||"null"); return v ?? fallback; } catch { return fallback; } }
  function persist(){ localStorage.setItem(STORE_KEY, JSON.stringify(activities)); render(); }
  function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2800); }
  function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function navigate(id){ document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id)); document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.go===id)); window.location.hash=id; window.scrollTo({top:0,behavior:"smooth"}); }
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
  window.addEventListener("hashchange",()=>{const id=location.hash.slice(1); if($("#"+id)?.classList.contains("page")) navigate(id);});
  const today=new Date(); const monday=new Date(today); monday.setDate(today.getDate()-(today.getDay()+6)%7); monday.setHours(0,0,0,0); const nextMonday=new Date(monday);nextMonday.setDate(monday.getDate()+7);
  $("#week-range").textContent=`${monday.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})} – ${new Date(nextMonday-86400000).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}`;
  function render(){
    const week=activities.filter(a=>{const d=new Date(a.start_date);return d>=monday&&d<nextMonday;});
    $("#week-distance").textContent=week.reduce((s,a)=>s+(Number(a.distance_km)||0),0).toLocaleString("fr-FR",{maximumFractionDigits:1});
    $("#week-sessions").innerHTML=`${week.length} <em>/ 3</em>`;
    $("#activity-count").textContent=`${activities.length} sortie${activities.length>1?"s":""}`;
    const sorted=[...activities].sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
    const itemHtml=a=>`<article class="activity-item"><span class="activity-icon">↗</span><div class="activity-info"><strong>${esc(a.name||"Course à pied")}</strong><p>${fmtDate(a.start_date)} · ${a.source==="strava"?"Strava":"Saisie manuelle"}${a.avg_hr?` · ${esc(a.avg_hr)} bpm`: ""}</p></div><div class="activity-metric">${Number(a.distance_km).toLocaleString("fr-FR",{maximumFractionDigits:2})} km<small>${fmtPace(Number(a.distance_km),Number(a.duration_min))}/km</small></div></article>`;
    $("#recent-activities").innerHTML=sorted.slice(0,3).map(itemHtml).join("")||'<div class="empty-state">Aucune activité pour le moment. Connecte Strava ou ajoute ta première sortie.</div>';
    $("#all-activities").innerHTML=sorted.map(itemHtml).join("")||'<div class="empty-state">Aucune activité enregistrée.</div>';
    $("#performance-summary").textContent=activities.length?`${activities.length} activité(s) enregistrée(s). Les performances officielles et les records GPS restent à vérifier.`:"Ajoute ou synchronise des activités pour commencer.";
    const dist=activities.reduce((s,a)=>s+(Number(a.distance_km)||0),0), dur=activities.reduce((s,a)=>s+(Number(a.duration_min)||0),0);
    $("#pace-summary").textContent=dist>0?fmtPace(dist,dur)+" /km":"—";
  }
  $("#activity-form").addEventListener("submit",e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const a={id:crypto.randomUUID?.()||String(Date.now()),source:"manual",name:"Course à pied",start_date:f.get("start_date"),distance_km:Number(f.get("distance_km")),duration_min:Number(f.get("duration_min")),avg_hr:f.get("avg_hr")?Number(f.get("avg_hr")):null,effort:f.get("effort")?Number(f.get("effort")):null,notes:String(f.get("notes")||"").trim(),created_at:new Date().toISOString()};
    if(!a.start_date||!(a.distance_km>0)||!(a.duration_min>0)){toast("Vérifie la date, la distance et la durée.");return;}
    const duplicate=activities.some(x=>Math.abs(new Date(x.start_date)-new Date(a.start_date))<120000&&Math.abs(Number(x.distance_km)-a.distance_km)<0.03);
    if(duplicate&&!confirm("Une activité similaire existe déjà. Ajouter quand même ?"))return;
    activities.push(a);persist();e.currentTarget.reset();toast("Activité enregistrée sur cet appareil.");navigate("activites");
  });
  $("#export-json").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({app:"MoApp Run",version:1,exported_at:new Date().toISOString(),activities},null,2)],{type:"application/json"});download(blob,`moapp-run-${new Date().toISOString().slice(0,10)}.json`);$("#import-status").textContent="Export prêt. Conserve ce fichier dans un emplacement privé.";});
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  $("#file-import").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;if(file.size>15*1024*1024){toast("Fichier trop volumineux (maximum 15 Mo).");return;}
    try{const text=await file.text();let incoming=[];
      if(file.name.toLowerCase().endsWith(".json")){const obj=JSON.parse(text);incoming=Array.isArray(obj)?obj:obj.activities;if(!Array.isArray(incoming))throw Error("Le JSON ne contient pas de liste activities.");}
      else {const rows=parseCsv(text);if(!rows.length)throw Error("CSV vide ou illisible.");incoming=rows.map((r,i)=>({id:`csv-${Date.now()}-${i}`,source:"csv",name:r.name||"Course à pied",start_date:r.start_date||r.start_date_local||r.date,distance_km:Number(r.distance_km??(Number(r.distance_m)/1000)),duration_min:Number(r.duration_min??(Number(r.moving_time||r.elapsed_time)/60)),avg_hr:r.avg_hr?Number(r.avg_hr):null,notes:""}));}
      const valid=incoming.filter(a=>a.start_date&&Number(a.distance_km)>0&&Number(a.duration_min)>0).map(a=>({...a,id:a.id||crypto.randomUUID?.()||String(Date.now()),source:a.source||"import",distance_km:Number(a.distance_km),duration_min:Number(a.duration_min)}));
      if(!valid.length)throw Error("Aucune activité valide. Vérifie date, distance et durée.");
      const fresh=valid.filter(a=>!activities.some(x=>(a.source==="strava"&&x.source==="strava"&&String(x.source_id)===String(a.source_id))||(Math.abs(new Date(x.start_date)-new Date(a.start_date))<120000&&Math.abs(Number(x.distance_km)-a.distance_km)<0.03)));
      if(!confirm(`${valid.length} activité(s) valide(s), ${fresh.length} nouvelle(s), ${valid.length-fresh.length} doublon(s) probable(s). Importer les nouvelles activités ?`))return;
      activities.push(...fresh);persist();$("#import-status").textContent=`Import terminé : ${fresh.length} ajoutée(s), ${valid.length-fresh.length} doublon(s) ignoré(s).`;toast("Import terminé.");
    }catch(err){$("#import-status").textContent=`Import impossible : ${err.message}`;}finally{e.target.value="";}
  });
  function parseCsv(text){const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)return[];const parseLine=line=>{const out=[];let v="",q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'&&q){v+='"';i++;}else if(c==='"')q=!q;else if(c===","&&!q){out.push(v);v="";}else v+=c;}out.push(v);return out;};const headers=parseLine(lines.shift()).map(x=>x.trim().toLowerCase());return lines.map(line=>Object.fromEntries(parseLine(line).map((v,i)=>[headers[i],v.trim()])));}
  $("#clear-local").addEventListener("click",()=>{if(confirm("Effacer toutes les activités stockées localement sur cet appareil ? Cette action ne supprime pas d’éventuelles copies exportées.")){activities=[];persist();toast("Données locales effacées.");}});
  async function initCloud(){
    if(!config.supabaseUrl||!config.supabaseAnonKey||!window.supabase){$("#account-status").textContent="Mode local — configuration Supabase non renseignée.";return;}
    try{supabase=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);const {data}=await supabase.auth.getSession();session=data.session;updateCloudUI();supabase.auth.onAuthStateChange((_event,s)=>{session=s;updateCloudUI();});if(session)await pullCloudActivities();}catch(e){$("#account-status").textContent="Cloud indisponible. Les activités locales restent accessibles.";}
  }
  function updateCloudUI(){const connected=!!session;$("#account-status").textContent=connected?`Connecté : ${session.user.email||"compte authentifié"}`:"Mode local — non connecté.";$("#sign-in").hidden=connected;$("#sign-out").hidden=!connected;$("#connect-strava").disabled=!connected;$("#sync-strava").disabled=!connected;}
  $("#sign-in").addEventListener("click",async()=>{if(!supabase){toast("Cloud non configuré. Consulte le README.");return;}const email=prompt("Ton adresse e-mail pour recevoir le lien de connexion :");if(!email)return;const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split("#")[0]}});toast(error?`Connexion impossible : ${error.message}`:"Lien de connexion envoyé par e-mail.");});
  $("#sign-out").addEventListener("click",async()=>{if(supabase){await supabase.auth.signOut();session=null;updateCloudUI();toast("Déconnecté du cloud.");}});
  async function edge(name,body={}){const {data:{session:s}}=await supabase.auth.getSession();const res=await fetch(`${config.supabaseUrl}/functions/v1/${name}`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${s.access_token}`,"apikey":config.supabaseAnonKey},body:JSON.stringify(body)});const obj=await res.json().catch(()=>({}));if(!res.ok)throw Error(obj.error||`Erreur serveur (${res.status})`);return obj;}
  $("#connect-strava").addEventListener("click",async()=>{if(!session){toast("Connecte-toi au cloud d’abord.");return;}try{const x=await edge("strava-auth-url");location.href=x.url;}catch(e){toast(e.message);}});
  $("#sync-strava").addEventListener("click",async()=>{if(!session)return;$("#sync-strava").disabled=true;$("#strava-status").textContent="Synchronisation en cours…";try{const x=await edge("strava-sync");const remote=x.activities||[];let added=0;for(const a of remote){if(!activities.some(v=>(v.source==="strava"&&String(v.source_id)===String(a.source_id))||(Math.abs(new Date(v.start_date)-new Date(a.start_date))<120000&&Math.abs(Number(v.distance_km)-Number(a.distance_km))<0.03))){activities.push(a);added++;}}persist();$("#strava-status").textContent=`Synchronisation terminée : ${added} nouvelle(s) activité(s).`;toast("Strava synchronisé.");}catch(e){$("#strava-status").textContent=`Synchronisation impossible : ${e.message}`;}finally{$("#sync-strava").disabled=!session;}});
  async function pullCloudActivities(){try{const {data,error}=await supabase.from("activities").select("id,source,source_id,name,start_date,distance_km,duration_min,avg_hr,notes,effort").order("start_date",{ascending:false}).limit(500);if(error)throw error;const merged=[...activities];for(const a of data||[]){if(!merged.some(x=>x.id===a.id||(a.source==="strava"&&x.source==="strava"&&String(x.source_id)===String(a.source_id))))merged.push(a);}activities=merged;localStorage.setItem(STORE_KEY,JSON.stringify(activities));render();}catch(e){console.warn("Chargement cloud non disponible",e.message);}}
  const params=new URLSearchParams(location.search);if(params.get("strava")==="connected"){history.replaceState({}, "", location.pathname+location.hash);toast("Compte Strava connecté. Tu peux synchroniser tes activités.");}
  initCloud();render();
})();
