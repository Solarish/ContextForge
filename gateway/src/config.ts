import path from "node:path";
const gatewayRoot = path.resolve(new URL("..", import.meta.url).pathname);
export function getConfig() {
  return {
    gatewayRoot,
    projectsFile: path.resolve(process.env.CONTEXTFORGE_PROJECTS_FILE ?? path.join(gatewayRoot, "..", "workspace", "projects.json")),
    stateRoot: path.resolve(process.env.CONTEXTFORGE_STATE_ROOT ?? path.join(gatewayRoot, "..", "workspace", ".state")),
    publicDir: path.join(gatewayRoot, "public"),
    port: Number(process.env.PORT ?? "8787"),
    host: process.env.HOST ?? "127.0.0.1",
    publicBaseUrl: (process.env.CONTEXTFORGE_PUBLIC_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "8787"}`).replace(/\/$/, "")
  };
}
