const directory={
  "properties": [
    {
      "id": "house",
      "name": "The Pavilion House",
      "area": "Assagao",
      "type": "Detached house",
      "agent": 0
    },
    {
      "id": "loft",
      "name": "Foundry Loft",
      "area": "Panaji",
      "type": "Loft apartment",
      "agent": 1
    },
    {
      "id": "garden",
      "name": "The Garden Cottage",
      "area": "Aldona",
      "type": "Garden cottage",
      "agent": 2
    },
    {
      "id": "courtyard",
      "name": "Courtyard Residence",
      "area": "Moira",
      "type": "Family house",
      "agent": 0
    },
    {
      "id": "studio",
      "name": "The Lightwell Studio",
      "area": "Fontainhas",
      "type": "Studio apartment",
      "agent": 1
    },
    {
      "id": "terrace",
      "name": "Parkside Terrace",
      "area": "Siolim",
      "type": "Terraced house",
      "agent": 2
    }
  ],
  "agents": [
    "Amelia Hart",
    "Daniel Cole",
    "Nina Reed"
  ]
};
const params=new URLSearchParams(location.search);
const one=selector=>document.querySelector(selector);
const listingForm=one("#filters");
if(listingForm){
  const fields=listingForm.elements;
  for(const key of ["intent","area","type"]){
    const value=params.get(key);
    if([...fields[key].options].some(option=>option.value===value))fields[key].value=value;
  }
  function filter(){
    if(fields.intent.value==="Sell"){location.href="sell.html";return;}
    let count=0;
    document.querySelectorAll(".card[data-area]").forEach((card,i)=>{
      const visible=(!fields.intent.value||fields.intent.value===card.dataset.intent)&&
        (!fields.area.value||fields.area.value===card.dataset.area)&&
        (!fields.type.value||fields.type.value===directory.properties[i].type);
      card.hidden=!visible;
      if(visible)count++;
    });
    one("#count").textContent=count+" "+(count===1?"property":"properties");
    one("#empty").hidden=count>0;
    if(location.protocol!=="file:"){
      const query=new URLSearchParams();
      for(const key of ["intent","area","type"])if(fields[key].value)query.set(key,fields[key].value);
      history.replaceState(null,"",location.pathname+(query.size?"?"+query:""));
    }
  }
  listingForm.onchange=filter;
  listingForm.onreset=()=>setTimeout(filter,0);
  listingForm.onsubmit=event=>{event.preventDefault();filter();};
  filter();
}
const form=one("#contact");
if(form){
  const fields=form.elements, status=one("#status");
  const selling=Boolean(fields.area);
  const property=selling?null:directory.properties.find(p=>p.id===params.get("property"));
  const suggested=Number(params.get("agent"));
  const validAgent=Number.isInteger(suggested)&&suggested>=0&&suggested<directory.agents.length;
  if(!selling){
    fields.agent.value=String(property?property.agent:validAgent?suggested:0);
    if(property){
      fields.agent.disabled=true;
      fields.message.value="I’d like to arrange a viewing of "+property.name+".";
    }
  }
  function agentIndex(){
    if(!selling)return Number(fields.agent.value);
    return directory.properties.find(p=>p.area===fields.area.value)?.agent??0;
  }
  function showContext(){
    one("#context").className="contextcard";
    one("#context").textContent=(property?property.name+" · ":"")+"Your agent: "+directory.agents[agentIndex()];
  }
  form.addEventListener("change",showContext);
  showContext();
  function payload(){
    return {name:fields.name.value.trim(),email:fields.email.value.trim(),message:fields.message.value.trim(),
      property:property?.id||null,agent:agentIndex(),area:selling?fields.area.value:null,kind:selling?"sell":"enquiry"};
  }
  function whatsAppMessage(data){
    return "Hello "+directory.agents[data.agent]+",\n"+data.message+(data.area?"\nProperty neighbourhood: "+data.area:"")+
      (property?"\nListing: "+property.name:"")+"\nFrom "+data.name+" · "+data.email;
  }
  one("#whatsapp").onclick=()=>{
    if(form.reportValidity())window.open("https://wa.me/?text="+encodeURIComponent(whatsAppMessage(payload())),"_blank","noopener");
  };
  let requestId=null;
  form.oninput=()=>{requestId=null;status.textContent="";};
  form.method="post";
  form.onsubmit=async event=>{
    event.preventDefault();
    if(location.protocol==="file:"){
      status.textContent="Use WhatsApp to share this draft, or open the live demo to submit an enquiry.";
      return;
    }
    const button=form.querySelector("button[type=submit]");
    button.disabled=true;
    requestId??=crypto.randomUUID();
    try{
      const response=await fetch("/api/enquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload(),id:requestId})});
      if(!response.ok)throw new Error();
      status.textContent="Enquiry recorded for "+directory.agents[agentIndex()]+". Reference "+requestId.slice(0,8).toUpperCase()+".";
    }catch{status.textContent="Your enquiry could not be confirmed. Please try again or use WhatsApp.";}
    finally{button.disabled=false;}
  };
}


const showcase=document.querySelector(".showcase");
if(showcase){
  const featured=["house","courtyard","terrace"].map(id=>directory.properties.find(property=>property.id===id));
  const photos=[...showcase.querySelectorAll(".plates img")];
  const controls=[...showcase.querySelectorAll("[data-slide]")];
  const address=showcase.querySelector(".feature-link");
  controls.forEach((control,index)=>{
    control.addEventListener("click",()=>{
      photos.forEach((image,i)=>{
        image.classList.toggle("on",index===i);
        image.setAttribute("aria-hidden",String(index!==i));
        controls[i].setAttribute("aria-pressed",String(index===i));
      });
      const property=featured[index];
      address.href="property-"+property.id+".html";
      address.querySelector("small").textContent=String(index+1).padStart(2,"0")+" / 03　·　"+property.area.toUpperCase();
      address.querySelector("strong").textContent=property.name;
    });
  });
}

const savedKey="fieldwork-shortlist";
const knownIds=directory.properties.map(property=>property.id);
function readShortlist(){
  try{
    const values=JSON.parse(localStorage.getItem(savedKey)||"[]");
    return new Set(Array.isArray(values)?values.filter(id=>knownIds.includes(id)):[]);
  }catch{return new Set();}
}
let saved=readShortlist();
const saveControls=[];
const shortlist=document.querySelector("#saved-homes");
function refreshSaved(){
  for(const {button,property,card} of saveControls){
    const marked=saved.has(property.id);
    button.setAttribute("aria-pressed",String(marked));
    button.setAttribute("aria-label",(marked?"Remove from shortlist: ":"Save to shortlist: ")+property.name);
    button.title=marked?"Remove from shortlist":"Save to shortlist";
    if(shortlist&&card)card.hidden=!marked;
  }
  document.querySelectorAll("[data-total]").forEach(count=>count.textContent=saved.size);
  if(shortlist)document.querySelector("#no-saves").hidden=saved.size>0;
}
function addBookmark(container,property,card){
  const button=document.createElement("button");
  button.className="save-home";
  button.type="button";
  button.addEventListener("click",()=>{
    if(saved.has(property.id))saved.delete(property.id);
    else saved.add(property.id);
    try{localStorage.setItem(savedKey,JSON.stringify([...saved]));}catch{}
    refreshSaved();
    if(shortlist && !saved.has(property.id)){
      const target=shortlist.querySelector(".card:not([hidden]) .save-home") || document.querySelector("#no-saves a");
      target?.focus();
    }
  });
  container.append(button);
  saveControls.push({button,property,card});
}
document.querySelectorAll(".card[data-area]").forEach(card=>{
  const target=card.querySelector("a").getAttribute("href");
  const property=directory.properties.find(item=>target==="property-"+item.id+".html");
  if(property)addBookmark(card,property,card);
});
const propertyPhoto=document.querySelector(".widephoto");
if(propertyPhoto){
  const property=directory.properties.find(item=>location.pathname.endsWith("/property-"+item.id+".html"));
  if(property){
    const frame=document.createElement("div");
    frame.className="gallery-frame";
    propertyPhoto.replaceWith(frame);
    frame.append(propertyPhoto);
    addBookmark(frame,property,null);
  }
}
refreshSaved();
window.addEventListener("pageshow",()=>{saved=readShortlist();refreshSaved();});
window.addEventListener("storage",event=>{
  if(event.key===savedKey||event.key===null){saved=readShortlist();refreshSaved();}
});
if("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches){
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      entry.target.classList.add("reveal-ready");
      observer.unobserve(entry.target);
    }
  },{threshold:.12});
  document.querySelectorAll(".card").forEach((card,i)=>{
    card.style.setProperty("--delay",(i%3)*70+"ms");
    observer.observe(card);
  });
}
