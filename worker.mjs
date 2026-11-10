const json=(body,status)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function saveEnquiry(request,env,directory){
  if(request.method!=="POST")return json({error:"POST required."},405);
  if(request.headers.get("Origin")!==new URL(request.url).origin)return json({error:"Invalid origin."},403);
  if(!request.headers.get("Content-Type")?.startsWith("application/json"))return json({error:"Expected JSON."},415);
  const data=await request.json().catch(()=>null);
  if(!data||typeof data.id!=="string"||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.id))return json({error:"Invalid reference."},400);
  for(const [key,max] of [["name",80],["email",254],["message",1800]]){
    if(typeof data[key]!=="string"||!data[key].trim()||data[key].length>max)return json({error:"Check your contact details."},400);
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))return json({error:"Invalid email."},400);
  const listing=directory.properties.find(p=>p.id===data.property);
  let agent=data.agent;
  if(data.kind==="sell"){
    const local=directory.properties.find(p=>p.area===data.area);
    if(!local&&data.area!=="Other")return json({error:"Invalid area."},400);
    agent=local?.agent??0;
  }else if(data.kind==="enquiry"){
    if(data.property&&!listing)return json({error:"Unknown listing."},400);
    if(listing)agent=listing.agent;
  }else return json({error:"Invalid enquiry type."},400);
  if(!Number.isInteger(agent)||!directory.agents[agent])return json({error:"Unknown agent."},400);
  await env.DB.prepare("INSERT INTO enquiries (id, name, email, message, kind, property, area, agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
    .bind(data.id,data.name.trim(),data.email.trim(),data.message.trim(),data.kind,listing?.id??null,data.kind==="sell"?data.area:null,agent).run();
  return json({id:data.id,agent},201);
}
export function handleRequest(request,env,assets,directory){
  const path=new URL(request.url).pathname;
  if(path==="/api/enquiries")return saveEnquiry(request,env,directory);
  if(!["GET","HEAD"].includes(request.method))return new Response("Method not allowed",{status:405});
  const asset=assets[path==="/"?"/index.html":path];
  if(!asset)return new Response("Not found",{status:404});
  const body=request.method==="HEAD"?null:asset.binary?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
  return new Response(body,{headers:{"Content-Type":asset.type,"X-Content-Type-Options":"nosniff"}});
}

