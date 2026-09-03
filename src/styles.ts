import { promises as fs } from "fs";
import * as path from "path";
import { registerStyle } from "./format";

export interface StyleLoadReport {
  dir: string;
  loaded: string[];
  failed: { name: string; error: string }[];
  readError?: string;
  filesSeen: number;
  cslFilesSeen: number;
}

export async function loadExtraStyles(dir: string): Promise<StyleLoadReport> {
  const report: StyleLoadReport = { dir, loaded: [], failed: [], filesSeen: 0, cslFilesSeen: 0 };
  if (!dir) return report;

  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err: any) {
    report.readError = err?.message ?? String(err);
    console.error(`[CrossCiter] readdir failed for ${dir}:`, err);
    return report;
  }

  console.log(`[CrossCiter] scanning ${dir} — ${entries.length} entries`);

  for (const e of entries) {
    if (!e.isFile()) continue;
    report.filesSeen++;
    if (!e.name.toLowerCase().endsWith(".csl")) continue;
    report.cslFilesSeen++;

    const name = path.basename(e.name, path.extname(e.name));
    try {
      const xml = await fs.readFile(path.join(dir, e.name), "utf8");
      registerStyle(name, xml);
      report.loaded.push(name);
      console.log(`[CrossCiter] loaded style: ${name}`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      report.failed.push({ name, error: msg });
      console.error(`[CrossCiter] failed to load style ${e.name}:`, err);
    }
  }

  return report;
}
