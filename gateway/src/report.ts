import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getConfig } from "./config.js";
import { getProject } from "./projects.js";
import { loadIndex } from "./indexer.js";
import { listMarkdown } from "./fs-utils.js";
import type { ReportInput, ReportSection } from "./types.js";

const escapeHtml = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
const directory = (projectId: string) => path.join(getConfig().stateRoot, "reports", projectId);
const reportUrl = (projectId: string, id: string) => `${getConfig().publicBaseUrl}/reports/${projectId}/${id}`;
const idOk = (id: string) => /^[a-f0-9-]{36}$/.test(id);
function renderSection(s: ReportSection): string {
  const text = s.text ? `<p>${escapeHtml(s.text)}</p>` : "";
  const table = s.columns && s.rows ? `<div class="table-wrap"><table><thead><tr>${s.columns.map(c => `<th scope="col">${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${s.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const chart = s.chart ? `<div class="bars" role="img" aria-label="${escapeHtml(s.chart.labels.map((l,i) => `${l}: ${s.chart!.values[i]}`).join(", "))}">${s.chart.labels.map((label,i) => `<div><span>${escapeHtml(label)}</span><div class="bar-track"><div class="bar" style="width:${Math.max(0,Math.min(100,100*(s.chart!.values[i]??0)/Math.max(1,...s.chart!.values)))}%"></div></div><b>${escapeHtml(s.chart!.values[i])}</b></div>`).join("")}</div>` : "";
  const events = s.events ? `<ol class="timeline">${s.events.map(e => `<li><time>${escapeHtml(e.at)}</time><strong>${escapeHtml(e.label)}</strong><p>${escapeHtml(e.detail)}</p></li>`).join("")}</ol>` : "";
  return `<section class="card"><h2>${escapeHtml(s.heading)}</h2>${text}${table}${chart}${events}</section>`;
}
function render(record: ReportInput & { id: string; createdAt: string }): string {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(record.title)}</title><style>body{margin:0;background:#0b1220;color:#eef3fb;font:15px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:28px 20px 70px}h1{font-size:clamp(26px,4vw,42px);line-height:1.2}h2{font-size:21px}small{color:#aebdd1}.card{background:#17243a;border:1px solid #33445e;padding:20px;margin:16px 0;border-radius:14px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #3d4d64;padding:8px 12px}th{cursor:pointer}input{width:100%;max-width:360px;background:#1e2c44;color:#fff;border:1px solid #60718b;padding:10px;border-radius:8px}.bars>div{display:grid;grid-template-columns:130px 1fr 70px;gap:10px;align-items:center;margin:8px 0}.bar-track{height:18px;background:#263955;border-radius:9px}.bar{height:100%;background:#6bc3da;border-radius:9px}.timeline{border-left:2px solid #6bc3da;padding-left:25px}.timeline li{margin:15px 0}.timeline time{display:block;color:#aebdd1}.timeline p{margin:3px 0}a{color:#9edaff}</style></head><body><main><small>${escapeHtml(record.projectId)} · ${escapeHtml(record.kind)} · ${escapeHtml(record.createdAt)} · ${escapeHtml(record.id)}</small><h1>${escapeHtml(record.title)}</h1><label for="filter">กรองแถวในตาราง</label><br><input id="filter" type="search" placeholder="ค้นหาในตาราง">${record.sections.map(renderSection).join("")}<section class="card"><h2>แหล่งอ้างอิง</h2><ul>${record.sourceRefs.map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul></section></main><script>const f=document.getElementById('filter');f.addEventListener('input',()=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(f.value.toLowerCase())));document.querySelectorAll('th').forEach(h=>h.addEventListener('click',()=>{const b=h.closest('table').tBodies[0],i=[...h.parentElement.children].indexOf(h);[...b.rows].sort((a,c)=>a.cells[i].textContent.localeCompare(c.cells[i].textContent,undefined,{numeric:true})).forEach(r=>b.appendChild(r))}));</script></body></html>`;
}
export async function createReport(input: ReportInput) {
  await getProject(input.projectId);
  if (!input.title?.trim() || !Array.isArray(input.sections) || !input.sections.length || !Array.isArray(input.sourceRefs) || !input.sourceRefs.length) throw new Error("title, sections, sourceRefs required");
  if (input.sections.length > 40 || JSON.stringify(input).length > 250_000) throw new Error("report too large");
  if (!input.sections.every(s => s.heading && (!s.rows || (s.columns && s.rows.length <= 500 && s.rows.every(r => r.length === s.columns!.length))) && (!s.chart || s.chart.labels.length === s.chart.values.length))) throw new Error("invalid report section");
  const known = new Set((await loadIndex(input.projectId)).cards.map(c => c.id));
  if (input.sourceRefs.some(r => !known.has(r) && !/^https:\/\//.test(r))) throw new Error("unknown source reference");
  const id = crypto.randomUUID();
  const record = { ...input, id, createdAt: new Date().toISOString() };
  const dir = directory(input.projectId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.html`), render(record), { flag: "wx" });
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(record), { flag: "wx" });
  return { id, projectId: input.projectId, title: input.title, createdAt: record.createdAt, url: reportUrl(input.projectId,id), resourceUri: `ui://contextforge/reports/${input.projectId}/${id}` };
}
export async function getReport(projectId: string, id: string) {
  await getProject(projectId);
  if (/^legacy-[a-f0-9]{20}$/.test(id)) {
    const project = await getProject(projectId);
    for (const root of project.legacyHtmlRoots ?? []) {
      for (const file of (await listMarkdown(root)).filter(name => name.endsWith(".html"))) {
        if (`legacy-${crypto.createHash("sha256").update(file).digest("hex").slice(0,20)}` === id) {
          return { id, projectId, title:path.basename(file,".html"), kind:"legacy", createdAt:(await fs.stat(file)).mtime.toISOString(), url:reportUrl(projectId,id), sourceRefs:[], sections:[] };
        }
      }
    }
    throw new Error("unknown legacy report id");
  }
  if (!idOk(id)) throw new Error("invalid report id");
  const text = await fs.readFile(path.join(directory(projectId), `${id}.json`), "utf8");
  return JSON.parse(text);
}
export async function getReportHtml(projectId: string, id: string): Promise<string> {
  if (id.startsWith("legacy-")) return getLegacyReportHtml(projectId,id);
  await getReport(projectId,id);
  return fs.readFile(path.join(directory(projectId), `${id}.html`), "utf8");
}
export async function listReports(projectId: string, query = "", limit = 20) {
  const project = await getProject(projectId);
  const files = (await fs.readdir(directory(projectId)).catch(() => [])).filter(f => /^[a-f0-9-]{36}\.json$/.test(f));
  const items = await Promise.all(files.map(async f => { const r = await getReport(projectId,f.slice(0,-5)); return { id:r.id, projectId, title:r.title, kind:r.kind, createdAt:r.createdAt, url:reportUrl(projectId,r.id) }; }));
  for (const root of project.legacyHtmlRoots ?? []) {
    for (const file of (await listMarkdown(root)).filter(name => name.endsWith(".html"))) {
      const id = `legacy-${crypto.createHash("sha256").update(file).digest("hex").slice(0,20)}`;
      const stat = await fs.stat(file);
      items.push({ id, projectId, title:path.basename(file,".html"), kind:"legacy", createdAt:stat.mtime.toISOString(), url:reportUrl(projectId,id) });
    }
  }
  return { reports: items.filter(r => r.title.toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,Math.max(1,Math.min(100,limit))) };
}
export async function getLegacyReportHtml(projectId: string, id: string): Promise<string> {
  const project = await getProject(projectId);
  if (!/^legacy-[a-f0-9]{20}$/.test(id)) throw new Error("invalid legacy report id");
  for (const root of project.legacyHtmlRoots ?? []) {
    for (const file of (await listMarkdown(root)).filter(name => name.endsWith(".html"))) {
      if (`legacy-${crypto.createHash("sha256").update(file).digest("hex").slice(0,20)}` === id) return fs.readFile(file,"utf8");
    }
  }
  throw new Error("unknown legacy report id");
}
