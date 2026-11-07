import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { listProjects, getProject } from "./projects.js";
import { refreshIndex, refreshAll, loadIndex, searchSources } from "./indexer.js";
import { contextBundle, contextRead, validateContext } from "./context.js";
import { createReport, getReport, getReportHtml, getLegacyReportHtml, listReports } from "./report.js";

const config = getConfig();
const server = http.createServer(async (req,res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return json(res,403,{error:"Cross-origin mutation denied"});
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/dashboard")) return file(res,path.join(config.publicDir,"index.html"),"text/html; charset=utf-8");
    if (url.pathname === "/api/status" && req.method === "GET") return json(res,200,{service:"contextforge",projects:(await listProjects()).map(p=>({id:p.id,title:p.title})),reportHub:true});
    if (url.pathname === "/api/projects" && req.method === "GET") return json(res,200,{projects:(await listProjects()).map(p=>({id:p.id,title:p.title}))});
    if (url.pathname === "/api/index/refresh" && req.method === "POST") { const b=await body(req);return json(res,200,b.projectId?await refreshIndex(b.projectId):await refreshAll()); }
    if (url.pathname === "/api/context/search" && req.method === "GET") return json(res,200,await searchSources({projectId:url.searchParams.get("projectId")??undefined,query:url.searchParams.get("q")??"",acrossProjects:url.searchParams.get("acrossProjects")==="true",limit:Number(url.searchParams.get("limit")??8)}));
    if (url.pathname === "/api/context/read" && req.method === "POST") return json(res,200,await contextRead(await body(req)));
    if (url.pathname === "/api/context/bundle" && req.method === "POST") return json(res,200,await contextBundle(await body(req)));
    if (url.pathname === "/api/context/validate" && req.method === "POST") return json(res,200,await validateContext(await body(req)));
    if (url.pathname === "/api/reports" && req.method === "GET") return json(res,200,await listReports(required(url.searchParams.get("projectId")),url.searchParams.get("q")??"",Number(url.searchParams.get("limit")??20)));
    if (url.pathname === "/api/reports" && req.method === "POST") return json(res,201,await createReport(await body(req)));
    const match=url.pathname.match(/^\/reports\/([a-z0-9-]+)\/([a-f0-9-]{36})$/);
    if (match && req.method === "GET") return html(res,200,await getReportHtml(match[1],match[2]));
    const legacy=url.pathname.match(/^\/reports\/([a-z0-9-]+)\/(legacy-[a-f0-9]{20})$/);
    if (legacy && req.method === "GET") return html(res,200,await getLegacyReportHtml(legacy[1],legacy[2]));
    const meta=url.pathname.match(/^\/api\/reports\/([a-z0-9-]+)\/([a-f0-9-]{36}|legacy-[a-f0-9]{20})$/);
    if (meta && req.method === "GET") return json(res,200,await getReport(meta[1],meta[2]));
    return json(res,404,{error:"not found"});
  } catch(e) { const message=e instanceof Error?e.message:String(e);return json(res,/unknown|invalid|missing|required|large|outside/.test(message)?400:500,{error:message}); }
});
server.listen(config.port,config.host,()=>console.log(`contextforge listening on http://${config.host}:${config.port}`));
function sameOrigin(req:http.IncomingMessage) { if(req.headers["sec-fetch-site"]==="cross-site")return false;const origin=req.headers.origin;if(!origin)return true;try{const o=new URL(origin);return o.protocol==="http:"&&o.host===req.headers.host&&(o.hostname==="127.0.0.1"||o.hostname==="localhost");}catch{return false;} }
function required(v:string|null){if(!v)throw new Error("projectId required");return v;}
async function body(req:http.IncomingMessage):Promise<any>{const chunks:Buffer[]=[];let size=0;for await(const c of req){const b=Buffer.isBuffer(c)?c:Buffer.from(c);size+=b.length;if(size>300_000)throw new Error("request too large");chunks.push(b);}return chunks.length?JSON.parse(Buffer.concat(chunks).toString("utf8")):{};}
function json(res:http.ServerResponse,status:number,value:unknown){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});res.end(JSON.stringify(value));}
function html(res:http.ServerResponse,status:number,value:string){res.writeHead(status,{"content-type":"text/html; charset=utf-8","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'","x-content-type-options":"nosniff","referrer-policy":"no-referrer"});res.end(value);}
async function file(res:http.ServerResponse,p:string,type:string){const s=await fs.readFile(p);res.writeHead(200,{"content-type":type});res.end(s);}
