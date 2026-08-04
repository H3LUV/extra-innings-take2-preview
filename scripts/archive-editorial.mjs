import fs from "node:fs/promises";
const latestUrl=new URL("../public/data/editorial.json",import.meta.url);const latest=JSON.parse(await fs.readFile(latestUrl,"utf8"));
if(!latest.slug)throw new Error("editorial.json has no slug");
const dir=new URL("../public/data/editorials/",import.meta.url);await fs.mkdir(dir,{recursive:true});
await fs.writeFile(new URL(`${latest.slug}.json`,dir),JSON.stringify(latest,null,2));console.log(`Archived editorial: ${latest.slug}`);