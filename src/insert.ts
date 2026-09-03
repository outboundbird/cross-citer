import { Editor, MarkdownView, Notice } from "obsidian";
import { RefEntry, CrossCiterSettings } from "./types";
import { formatCitation } from "./format";

function backlink(entry: RefEntry, vaultName: string): string {
  if (!vaultName) return "";
  const file = encodeURIComponent(entry.relPath.replace(/\.md$/i, ""));
  return ` [Open in ${vaultName}](obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${file})`;
}

function ensureFootnote(editor: Editor, key: string, defLine: string) {
  const content = editor.getValue();
  const marker = `[^${key}]:`;
  if (content.includes(marker)) return; // already defined
  const suffix = content.endsWith("\n") ? "" : "\n";
  const block = `${suffix}\n${defLine}\n`;
  const lastLine = editor.lastLine();
  const lastCh = editor.getLine(lastLine).length;
  editor.replaceRange(block, { line: lastLine, ch: lastCh });
}

export function insertReference(
  view: MarkdownView,
  entry: RefEntry,
  settings: CrossCiterSettings,
) {
  const editor = view.editor;
  const citation = formatCitation(entry, settings.citationStyle);
  const back = backlink(entry, settings.refVaultName);

  if (settings.insertMode === "inline") {
    editor.replaceSelection(`[@${entry.citekey}]`);
    return;
  }

  // footnote mode
  editor.replaceSelection(`[^${entry.citekey}]`);
  ensureFootnote(editor, entry.citekey, `[^${entry.citekey}]: ${citation}${back}`);
}

const FOOTNOTE_DEF_RE = /^\[\^([^\]]+)\]:\s*(.*)$/;
const CITE_MARKER_RE = /\[\^([A-Za-z0-9_-]+)\]/g;
const BIB_HEADING_RE = /^##\s+Bibliography\s*$/m;

export function exportBibliography(
  view: MarkdownView,
  index: RefEntry[],
  settings: CrossCiterSettings,
) {
  const editor = view.editor;
  const text = editor.getValue();

  const keys = new Set<string>();
  for (const m of text.matchAll(CITE_MARKER_RE)) keys.add(m[1]);
  if (keys.size === 0) {
    new Notice("CrossCiter: no citations found in this note.");
    return;
  }

  const byKey = new Map(index.map((e) => [e.citekey, e]));
  const entries: RefEntry[] = [];
  const missing: string[] = [];
  for (const k of keys) {
    const e = byKey.get(k);
    if (e) entries.push(e);
    else missing.push(k);
  }
  entries.sort((a, b) => {
    const sa = (a.authors[0] ?? "").toLowerCase();
    const sb = (b.authors[0] ?? "").toLowerCase();
    return sa.localeCompare(sb);
  });

  const lines = entries.map((e) => {
    const citation = formatCitation(e, settings.citationStyle);
    return `- ${citation}`;
  });
  const section = `## Bibliography\n\n${lines.join("\n")}\n`;

  let newText: string;
  const match = text.match(BIB_HEADING_RE);
  if (match) {
    // Replace existing Bibliography section (until next `## ` heading or EOF)
    const start = text.indexOf(match[0]);
    const rest = text.slice(start + match[0].length);
    const nextHeadingIdx = rest.search(/\n##\s+/);
    const end = nextHeadingIdx === -1 ? text.length : start + match[0].length + nextHeadingIdx + 1;
    newText = text.slice(0, start) + section + text.slice(end);
  } else {
    const sep = text.endsWith("\n") ? "\n" : "\n\n";
    newText = text + sep + section;
  }

  editor.setValue(newText);
  new Notice(
    `CrossCiter: exported ${entries.length} reference(s)${missing.length ? ` · skipped ${missing.length} unknown: ${missing.join(", ")}` : ""}.`,
  );
}

export function reformatAllCitations(
  view: MarkdownView,
  index: RefEntry[],
  settings: CrossCiterSettings,
) {
  const editor = view.editor;
  const byKey = new Map(index.map((e) => [e.citekey, e]));
  let changed = 0;
  let missing = 0;

  const lines = editor.getValue().split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FOOTNOTE_DEF_RE);
    if (!m) continue;
    const key = m[1];
    const entry = byKey.get(key);
    if (!entry) {
      missing++;
      continue;
    }
    const citation = formatCitation(entry, settings.citationStyle);
    const back = backlink(entry, settings.refVaultName);
    const newLine = `[^${key}]: ${citation}${back}`;
    if (newLine !== lines[i]) {
      lines[i] = newLine;
      changed++;
    }
  }

  if (changed === 0 && missing === 0) {
    new Notice("CrossCiter: no citations to reformat.");
    return;
  }

  editor.setValue(lines.join("\n"));
  new Notice(
    `CrossCiter: reformatted ${changed} citation(s)${missing ? ` · ${missing} unknown citekey(s) skipped` : ""}.`,
  );
}
