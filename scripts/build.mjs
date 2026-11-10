import fs from "node:fs";
import path from "node:path";
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".jpg":"image/jpeg"};
const assets={};
function collect(dir,prefix="/"){
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,item.name),key=prefix+item.name;
    if(item.isDirectory()){collect(file,key+"/");continue;}
    const type=types[path.extname(item.name)];
    if(!type)throw Error("Unsupported asset: "+key);
    const binary=type.startsWith("image/");
    assets[key]={type,binary,body:fs.readFileSync(file,binary?"base64":"utf8")};
  }
}
collect("site");
const directory=JSON.parse(fs.readFileSync("directory.json","utf8"));
fs.mkdirSync("dist/server",{recursive:true});
const worker=fs.readFileSync("worker.mjs","utf8");
fs.writeFileSync("dist/server/index.js",worker+"\nconst assets="+JSON.stringify(assets)+";\nconst directory="+JSON.stringify(directory)+";\nexport default {fetch(request,env){return handleRequest(request,env,assets,directory);}};\n");
console.log("Built "+Object.keys(assets).length+" assets.");

