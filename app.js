/* MoApp Run — version simple, sans backend ni secrets. */
(() => {
"use strict";
const $=s=>document.querySelector(s), KEY="moapp-run-activities-v1";
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}};
let activities=read();
const dateFmt=v=>{const d=new Date(v);return Number.isNaN(+d)?"Date inconnue":new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric"}).format(d)};
const pace=(km,min)=>{if(!(km>0&&min>0))return"—";const s=Math.round(min*60/km);return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2800)}
function save(){localStorage.setItem(KEY,JSON.stringify(activities));render()}
function navigate(id){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.go===id));history.replaceState(null,"","#"+id);window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
window.addEventListener("hashchange",()=>{const id=location.hash.slice(1);if($("#"+id)?.classList.contains("page"))navigate(id)});
const now=new Date();const monday=new Date(now);monday.setDate(now.getDate()-(now.getDay()+6)%7);monday.setHours(0,0,0,0);const next=new Date(monday);next.setDate(next.getDate()+7);
$("#week-range").textContent=`${monday.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})} – ${new Date(+next-86400000).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}`;
const item=a=>`<article class="activity-item"><span class="activity-icon">↗</span><div class="activity-info"><strong>${esc(a.name||"Course à pied")}</strong><p>${dateFmt(a.start_date)} · ${esc(a.source_label||"Import manuel")}${a.avg_hr?` · ${esc(a.avg_hr)} bpm`:""}</p></div><div class="activity-metric">${Number(a.distance_km).toLocaleString("fr-FR",{maximumFractionDigits:2})} km<small>${pace(Number(a.distance_km),Number(a.duration_min))}/km</small></div></article>`;
function render(){
 const sorted=[...activities].sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
 const week=activities.filter(a=>new Date(a.start_date)>=monday&&new Date(a.start_date)<next);
 $("#week-distance").textContent=week.reduce((s,a)=>s+Number(a.distance_km||0),0).toLocaleString("fr-FR",{maximumFractionDigits:1});
 $("#week-sessions").innerHTML=`${week.length} <em>/ 3</em>`;
 $("#activity-count").textContent=`${activities.length} sortie${activities.length>1?"s":""}`;
 $("#recent-activities").innerHTML=sorted.slice(0,3).map(item).join("")||'<div class="empty-state">Aucune activité. Importe ton premier fichier CSV ou ajoute une sortie manuellement.</div>';
 $("#all-activities").innerHTML=sorted.map(item).join("")||'<div class="empty-state">Aucune activité enregistrée.</div>';
 $("#performance-summary").textContent=activities.length?`${activities.length} activité(s) importée(s). Ces résultats sont issus des données fournies et ne constituent pas des records officiels certifiés.`:"Importe tes activités pour commencer.";
 const km=activities.reduce((s,a)=>s+Number(a.distance_km||0),0),min=activities.reduce((s,a)=>s+Number(a.duration_min||0),0);
 $("#pace-summary").textContent=km?pace(km,min)+" /km":"—";
}
$("#activity-form").addEventListener("submit",e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);
 const a={id:crypto.randomUUID?.()||String(Date.now()),source_label:"Saisie manuelle",name:"Course à pied",start_date:f.get("start_date"),distance_km:Number(f.get("distance_km")),duration_min:Number(f.get("duration_min")),avg_hr:f.get("avg_hr")?Number(f.get("avg_hr")):null,effort:f.get("effort")?Number(f.get("effort")):null,notes:String(f.get("notes")||"").trim()};
 if(!a.start_date||!(a.distance_km>0)||!(a.duration_min>0)){toast("Vérifie la date, la distance et la durée.");return}
 const dup=activities.some(x=>Math.abs(new Date(x.start_date)-new Date(a.start_date))<120000&&Math.abs(Number(x.distance_km)-a.distance_km)<.03);
 if(dup&&!confirm("Une activité similaire existe déjà. Ajouter quand même ?"))return;
 activities.push(a);save();e.currentTarget.reset();toast("Activité enregistrée sur cet appareil.");navigate("activites");
});
function parseCSV(text){
 const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)return[];
 const line=s=>{const out=[];let v="",q=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'&&s[i+1]==='"'&&q){v+='"';i++}else if(c==='"')q=!q;else if((c===","||c===";")&&!q){out.push(v);v=""}else v+=c}out.push(v);return out};
 const headers=line(lines.shift()).map(x=>x.trim().toLowerCase());
 return lines.map(s=>Object.fromEntries(line(s).map((v,i)=>[headers[i],v.trim()])));
}
function normalizeDate(r){return r.start_date_local||r.start_date||r.date||r["date de l'activité"]||""}
function normalizeActivity(r,i){
 const distRaw=r.distance_km??r.distance??r.distance_m;
 let km=Number(String(distRaw??"").replace(",","."));
 if(r.distance_m!==undefined&&r.distance_km===undefined)km/=1000;
 // Strava export typically stores distance in metres.
 if(r.distance!==undefined&&r.distance_km===undefined&&r.distance_m===undefined&&km>100)km/=1000;
 let duration=Number(String(r.duration_min??r.moving_time??r.elapsed_time??r.moving_time_seconds??"").replace(",","."));
 if(r.moving_time!==undefined||r.elapsed_time!==undefined||r.moving_time_seconds!==undefined)duration/=60;
 const hr=r.average_heartrate??r.avg_hr??r.average_heart_rate;
 return {id:r.id||r.activity_id||`import-${Date.now()}-${i}`,source_id:r.id||r.activity_id||null,source_label:"Import CSV",name:r.name||r.activity_name||"Course à pied",start_date:normalizeDate(r),distance_km:km,duration_min:duration,avg_hr:hr?Number(hr):null,notes:""};
}
$("#file-import").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;if(file.size>25*1024*1024){toast("Fichier trop volumineux (maximum 25 Mo).");return}
 try{
  let incoming=[];
  if(file.name.toLowerCase().endsWith(".json")){const obj=JSON.parse(await file.text());incoming=Array.isArray(obj)?obj:obj.activities;if(!Array.isArray(incoming))throw Error("Le JSON ne contient pas de liste d'activités.");}
  else if(file.name.toLowerCase().endsWith(".csv"))incoming=parseCSV(await file.text()).map(normalizeActivity);
  else throw Error("Format non pris en charge. Utilise un CSV ou JSON.");
  const valid=incoming.filter(a=>a.start_date&&Number(a.distance_km)>0&&Number(a.duration_min)>0);
  if(!valid.length)throw Error("Aucune activité valide trouvée. Vérifie les colonnes date, distance et durée.");
  const fresh=valid.filter(a=>!activities.some(x=>(a.source_id&&x.source_id&&String(a.source_id)===String(x.source_id))||(Math.abs(new Date(x.start_date)-new Date(a.start_date))<120000&&Math.abs(Number(x.distance_km)-Number(a.distance_km))<.03)));
  if(!confirm(`${valid.length} activité(s) valide(s), ${fresh.length} nouvelle(s), ${valid.length-fresh.length} doublon(s) probable(s). Ajouter les nouvelles activités ?`))return;
  activities.push(...fresh);save();$("#import-status").textContent=`Import terminé : ${fresh.length} ajoutée(s), ${valid.length-fresh.length} doublon(s) probable(s) ignoré(s).`;toast("Import terminé.");
 }catch(err){$("#import-status").textContent=`Import impossible : ${err.message}`}finally{e.target.value=""}
});
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200)}
$("#export-json").addEventListener("click",()=>{download(new Blob([JSON.stringify({app:"MoApp Run",version:1,exported_at:new Date().toISOString(),activities},null,2)],{type:"application/json"}),`moapp-run-${new Date().toISOString().slice(0,10)}.json`);$("#import-status").textContent="Sauvegarde JSON prête à enregistrer dans Fichiers."});
$("#clear-local").addEventListener("click",()=>{if(confirm("Effacer toutes les activités enregistrées sur cet appareil ?")){activities=[];save();toast("Activités locales effacées.")}});
const params=new URLSearchParams(location.search);if(params.get("strava")){history.replaceState(null,"",location.pathname+location.hash)}
render();
})();