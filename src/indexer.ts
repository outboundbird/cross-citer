import { promises as fs } from "fs";
import * as path from "path";
import matter from "gray-matter";
import { RefEntry } from "./types";

const BIBTEX_RE = /```bibtex\s*([\s\S]*?)```/i;
const CITEKEY_RE = /@\w+\s*\{\s*([^,\s]+)/;

interface RawEntry {
  fmCitekey?: string;
  derivedCitekey: string;
  entry: RefEntry;
  needsPersist: boolean;
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(p);
  }
  return out;
}

function deriveBaseKey(fm: any, bibtex: string | undefined, fallback: string): string {
  if (bibtex) {
    const m = bibtex.match(CITEKEY_RE);
    if (m) return m[1];
  }
  const firstAuthor: string | undefined = Array.isArray(fm?.authors) && fm.authors[0];
  const surname = firstAuthor
    ? String(firstAuthor).split(",")[0].trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    : "ref";
  const year = fm?.year ?? "nd";
  return `${surname}${year}` || fallback;
}

function nextSuffix(n: number): string {
  // 1 -> "a", 2 -> "b", ... 26 -> "z", 27 -> "aa", ...
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

export async function indexRefVault(rootAbs: string): Promise<RefEntry[]> {
  if (!rootAbs) return [];
  const files = await walk(rootAbs);
  const raws: RawEntry[] = [];

  for (const abs of files) {
    try {
      const raw = await fs.readFile(abs, "utf8");
      const parsed = matter(raw);
      const fm = parsed.data ?? {};
      const bibMatch = parsed.content.match(BIBTEX_RE);
      const bibtex = bibMatch ? bibMatch[1].trim() : undefined;
      const rel = path.relative(rootAbs, abs).split(path.sep).join("/");
      const fallback = path.basename(abs, ".md");
      const fmCitekey = fm?.citekey ? String(fm.citekey) : undefined;
      const derivedCitekey = fmCitekey ?? deriveBaseKey(fm, bibtex, fallback);
      raws.push({
        fmCitekey,
        derivedCitekey,
        needsPersist: !fmCitekey,
        entry: {
          citekey: derivedCitekey,
          authors: Array.isArray(fm.authors) ? fm.authors.map(String) : [],
          year: fm.year ?? null,
          title: String(fm.title ?? fallback),
          doi: fm.doi ? String(fm.doi) : undefined,
          url: fm.url ? String(fm.url) : undefined,
          path: abs,
          relPath: rel,
          bibtex,
        },
      });
    } catch {
      // skip unreadable files
    }
  }

  // Pass 1: reserve every citekey that is already persisted in frontmatter — those are fixed.
  const claimed = new Set<string>();
  for (const r of raws) {
    if (r.fmCitekey) claimed.add(r.fmCitekey);
  }

  // Pass 2: for entries without a persisted citekey, resolve collisions deterministically
  //   using the file's relPath as the tiebreak order so runs are stable.
  const pending = raws.filter((r) => !r.fmCitekey);
  pending.sort((a, b) => a.entry.relPath.localeCompare(b.entry.relPath));

  for (const r of pending) {
    let key = r.derivedCitekey;
    let n = 0;
    while (claimed.has(key)) {
      n++;
      key = r.derivedCitekey + nextSuffix(n);
    }
    claimed.add(key);
    r.entry.citekey = key;
    r.needsPersist = true;
  }

  // Pass 3: persist newly assigned citekeys back to each note's frontmatter
  for (const r of raws) {
    if (!r.needsPersist) continue;
    try {
      const raw = await fs.readFile(r.entry.path, "utf8");
      const parsed = matter(raw);
      if (parsed.data?.citekey === r.entry.citekey) continue;
      parsed.data = { ...parsed.data, citekey: r.entry.citekey };
      const rebuilt = matter.stringify(parsed.content, parsed.data);
      await fs.writeFile(r.entry.path, rebuilt, "utf8");
    } catch (err) {
      console.error(`[CrossCiter] failed to persist citekey to ${r.entry.path}:`, err);
    }
  }

  return raws.map((r) => r.entry);
}
