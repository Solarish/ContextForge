import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { contextBundle, contextRead, validateContext } from "./context.js";
import { refreshIndex, searchSources } from "./indexer.js";
import { createReport, getReportHtml, listReports } from "./report.js";

test("project isolation, compact context, incremental refresh, and immutable safe report", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "contextforge-test-"));
  const previousProjects = process.env.CONTEXTFORGE_PROJECTS_FILE;
  const previousState = process.env.CONTEXTFORGE_STATE_ROOT;
  try {
    for (const id of ["alpha", "beta"]) {
      await fs.mkdir(path.join(root, id, "report"), { recursive: true });
      await fs.mkdir(path.join(root, id, "wiki"), { recursive: true });
      await fs.writeFile(path.join(root, id, "report", "README.md"), `# ${id} unique\n## Facts\n${id} text\n`);
      await fs.writeFile(path.join(root, id, "wiki", "index.md"), `# ${id} wiki`);
    }
    await fs.writeFile(path.join(root, "projects.json"), JSON.stringify({ projects: ["alpha", "beta"].map(id => ({ id, title: id, reportRoot: `${id}/report`, wikiRoot: `${id}/wiki` })) }));
    process.env.CONTEXTFORGE_PROJECTS_FILE = path.join(root, "projects.json");
    process.env.CONTEXTFORGE_STATE_ROOT = path.join(root, "state");
    assert.ok((await refreshIndex("alpha")).changed > 0);
    assert.equal((await refreshIndex("alpha")).changed, 0);
    await refreshIndex("beta");
    assert.equal((await searchSources({ projectId: "alpha", query: "beta" })).results.length, 0);
    assert.ok((await searchSources({ query: "beta", acrossProjects: true })).results.some(item => item.projectId === "beta"));
    const bundle = await contextBundle({ projectId: "alpha", topic: "alpha", taskType: "general" });
    assert.equal(bundle.status, "ready");
    assert.ok(Buffer.byteLength(JSON.stringify(bundle)) < 8192);
    assert.equal((await validateContext({ projectId: "alpha", taskType: "general", loadedPaths: ["README.md"] })).status, "ready");
    assert.match((await contextRead({ projectId: "alpha", sourceId: "report:README.md", heading: "Facts" })).text, /alpha text/);
    await assert.rejects(contextRead({ projectId: "alpha", sourceId: "report:../beta/report/README.md" }));
    const report = await createReport({ projectId: "alpha", title: "<script>alert(1)</script>", kind: "table", sections: [{ heading: "Results", columns: ["Name"], rows: [["<img src=x onerror=alert(1)>"]] }], sourceRefs: ["report:README.md"] });
    const html = await getReportHtml("alpha", report.id);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("&lt;img"));
    assert.ok(!html.includes("<img src=x"));
    await fs.writeFile(path.join(root,"alpha","report","README.md"),"# alpha changed after report creation\n");
    assert.equal(await getReportHtml("alpha",report.id),html);
    assert.equal((await listReports("alpha")).reports[0].id, report.id);
    const concurrent = await Promise.all(Array.from({ length: 5 }, () => contextBundle({ projectId: "alpha", topic: "alpha", taskType: "general" })));
    assert.ok(concurrent.every(item => item.indexGeneration === bundle.indexGeneration));
    assert.equal((await contextBundle({ projectId: "alpha", topic: "", taskType: "unregistered" })).status, "blocked_unknown_task_type");
  } finally {
    if (previousProjects === undefined) delete process.env.CONTEXTFORGE_PROJECTS_FILE; else process.env.CONTEXTFORGE_PROJECTS_FILE = previousProjects;
    if (previousState === undefined) delete process.env.CONTEXTFORGE_STATE_ROOT; else process.env.CONTEXTFORGE_STATE_ROOT = previousState;
    await fs.rm(root, { recursive: true, force: true });
  }
});
