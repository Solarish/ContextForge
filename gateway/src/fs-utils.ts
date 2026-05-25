import fs from "node:fs/promises";
import path from "node:path";

export function stamp(agent = "codex", now = new Date()): string {
  const bangkok = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);
  return `[Updated by: ${agent} | Time: ${bangkok} +0700]`;
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  if (!(await pathExists(filePath))) return fallback;
  const parsed = JSON.parse(await readText(filePath));
  if (parsed && typeof parsed === "object" && "data" in parsed) return parsed.data as T;
  return parsed as T;
}

export async function writeJsonStamped(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify({ _stamp: stamp(), data: value }, null, 2)}\n`);
}

export function titleFromMarkdown(content: string, fallback: string): string {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

export function headingsFromMarkdown(content: string): string[] {
  return [...content.matchAll(/^#{1,4}\s+(.+)$/gm)].map(match => match[1].trim()).slice(0, 20);
}

export function excerpt(content: string): string {
  return content.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 420);
}

export async function listMarkdown(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      if (entry.isFile() && [".md", ".html"].includes(path.extname(entry.name).toLowerCase())) out.push(full);
    }
  }
  await walk(root);
  return out.sort();
}

