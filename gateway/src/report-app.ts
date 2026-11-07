import { App } from "@modelcontextprotocol/ext-apps";

type Section = { heading: string; text?: string; columns?: string[]; rows?: Array<Array<string | number | null>>; chart?: { labels: string[]; values: number[] }; events?: Array<{ at: string; label: string; detail?: string }> };
type Report = { title: string; projectId: string; kind: string; sections: Section[]; sourceRefs: string[] };
const root = document.getElementById("report")!;
const app = new App({ name: "ContextForge Report Viewer", version: "1.0.0" });
const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: unknown) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = String(text); return node; };

function render(report: Report, url: string) {
  root.replaceChildren();
  root.append(element("small", `${report.projectId} · ${report.kind}`), element("h1", report.title));
  const link = element("a", "Open permanent report in browser");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  root.append(link);
  for (const section of report.sections ?? []) {
    const card = element("section");
    card.append(element("h2", section.heading));
    if (section.text) card.append(element("p", section.text));
    if (section.columns && section.rows) {
      const input = element("input"); input.type = "search"; input.placeholder = "Filter rows";
      const table = element("table"); const head = element("thead"); const headRow = element("tr");
      for (const [index, col] of section.columns.entries()) {
        const th = element("th", col); th.scope = "col";
        th.onclick = () => { const rows = Array.from(body.rows).sort((a,b) => a.cells[index].textContent!.localeCompare(b.cells[index].textContent!,undefined,{numeric:true})); body.replaceChildren(...rows); };
        headRow.append(th);
      }
      head.append(headRow); table.append(head);
      const body = element("tbody");
      for (const row of section.rows) { const tr = element("tr"); for (const cell of row) tr.append(element("td", cell ?? "")); body.append(tr); }
      table.append(body);
      input.oninput = () => { for (const tr of Array.from(body.rows)) tr.hidden = !tr.textContent?.toLowerCase().includes(input.value.toLowerCase()); };
      card.append(input, table);
    }
    if (section.chart) {
      const max = Math.max(1, ...section.chart.values);
      for (const [index, label] of section.chart.labels.entries()) {
        const bar = element("div"); bar.className = "chart-row";
        const fill = element("span"); fill.className = "bar"; fill.style.width = `${Math.max(0,Math.min(100,100*(section.chart.values[index] ?? 0)/max))}%`;
        bar.append(element("span", label), fill, element("b", section.chart.values[index])); card.append(bar);
      }
    }
    if (section.events) { const list = element("ol"); for (const event of section.events) { const li = element("li"); li.append(element("time", event.at), element("strong", event.label)); if (event.detail) li.append(element("p", event.detail)); list.append(li); } card.append(list); }
    root.append(card);
  }
  const refs = element("section"); refs.append(element("h2", "Sources"));
  const list = element("ul"); for (const ref of report.sourceRefs ?? []) list.append(element("li", ref)); refs.append(list); root.append(refs);
}
app.ontoolresult = params => {
  const data = params.structuredContent as { report?: Report; url?: string } | undefined;
  if (data?.report && data.url) render(data.report, data.url);
  else root.textContent = "Open the permanent report URL in the tool result.";
};
void app.connect();
