import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-csl";
import { RefEntry } from "./types";

// Built-in styles in @citation-js/plugin-csl: apa, vancouver, harvard1.
// Extra styles must be registered via addStyle() with raw CSL XML.
const EXTRA_STYLES: Record<string, string> = {};

export function registerStyle(name: string, cslXml: string) {
  const config = plugins.config.get("@csl") as any;
  if (!config) throw new Error("@csl plugin not loaded");
  const register = config.templates ?? config.styles;
  if (!register || typeof register.add !== "function") {
    throw new Error(`@csl config has no styles/templates register (keys: ${Object.keys(config).join(", ")})`);
  }
  register.add(name, cslXml);
  EXTRA_STYLES[name] = cslXml;
}

const BUILTIN = new Set(["apa", "vancouver", "harvard1"]);

function naiveAPA(e: RefEntry): string {
  const authors = e.authors.length
    ? e.authors
        .map((a) => {
          const s = a.trim();
          if (s.includes(",")) {
            const [sur, given] = s.split(",").map((x) => x.trim());
            const inits = given.split(/\s+/).filter(Boolean).map((g) => g[0].toUpperCase() + ".").join(" ");
            return `${sur}, ${inits}`.trim();
          }
          return s;
        })
        .join(", ")
    : "";
  const year = e.year ? `(${e.year})` : "(n.d.)";
  const title = e.title.endsWith(".") ? e.title : e.title + ".";
  const doi = e.doi ? ` https://doi.org/${e.doi}` : e.url ? ` ${e.url}` : "";
  return `${authors} ${year}. ${title}${doi}`.trim();
}

export function formatCitation(entry: RefEntry, style: string): string {
  // Fallback to naive when no BibTeX is present
  if (!entry.bibtex) return naiveAPA(entry);

  const template = BUILTIN.has(style) || style in EXTRA_STYLES ? style : "apa";
  try {
    const cite = new Cite(entry.bibtex);
    const out = cite.format("bibliography", {
      format: "text",
      template,
      lang: "en-US",
    });
    return String(out).trim();
  } catch (e) {
    console.error("[CrossCiter] citation.js failed, falling back:", e);
    return naiveAPA(entry);
  }
}
