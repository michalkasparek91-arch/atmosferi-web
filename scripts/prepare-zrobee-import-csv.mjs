import fs from "node:fs";

const [input,output,runId]=process.argv.slice(2);
if(!input || !output || !/^[0-9a-f-]{36}$/i.test(runId||""))throw new Error("Usage: node prepare-zrobee-import-csv.mjs input.json output.csv run-id");
const source=JSON.parse(fs.readFileSync(input,"utf8"));
if(!Array.isArray(source.rows))throw new Error("Invalid CLI export");
const emailPattern=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const csv=value=>`"${String(value??"").replaceAll('"','""')}"`;
const seen=new Set();
const lines=["run_id,source_id,raw,normalized_email,status"];
let withEmail=0;
for(const row of source.rows){
  if(seen.has(row.source_id))throw new Error("Duplicate source ID");
  seen.add(row.source_id);
  const raw=row.raw;
  const candidates=[raw.email,...(raw.secondary_emails||[])].filter(v=>typeof v==="string")
    .flatMap(v=>v.split(/[;,]/)).map(v=>v.trim().toLowerCase());
  const email=candidates.find(e=>emailPattern.test(e))||"";
  if(email)withEmail++;
  lines.push([runId,row.source_id,JSON.stringify(raw),email,email?"pending":"no_email"].map(csv).join(","));
}
fs.writeFileSync(output,lines.join("\n")+"\n","utf8");
console.log(JSON.stringify({records:source.rows.length,withEmail,withoutEmail:source.rows.length-withEmail,bytes:fs.statSync(output).size}));
