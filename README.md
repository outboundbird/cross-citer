# CrossCiter

An Obsidian plugin that turns a separate vault of reference notes into a Zotero/EndNote-style citation library. Search your reference vault (**R**), preview any entry, and insert a formatted citation into any note in your writing vault (**W**) — as a footnote or inline marker, with an `obsidian://` back-link to the source note.

Citations are formatted from the BibTeX block embedded in each reference note, so switching styles (APA, Nature, IEEE, Vancouver, any CSL) reformats everything cleanly.

## Features

- **Fuzzy search** across the reference vault, indexed from YAML frontmatter (`authors`, `year`, `title`, `doi`, `citekey`).
- **Two-pane search modal**: results on the left, live-rendered preview of the reference note on the right.
- **BibTeX-driven formatting** via [citation.js](https://citation.js.org) — pulls `volume`, `issue`, `pages`, publisher, italics, etc. straight from the BibTeX block.
- **Built-in styles**: APA, Vancouver, Harvard. Drop any `.csl` file into an "extra styles" folder and it appears in the dropdown (thousands available at [citation-style-language/styles](https://github.com/citation-style-language/styles)).
- **Footnote or inline** insert mode (`[^citekey]` or `[@citekey]`).
- **`obsidian://` back-link** to the reference note in R, appended to each footnote definition.
- **Stable citekeys**: the plugin writes a unique `citekey:` field back to each reference note's frontmatter, so keys never drift when you add or edit references.
- **Reformat all citations** in the current note when you switch styles.
- **Export bibliography**: scan the current note, collect every cited reference, sort alphabetically, and produce a `## Bibliography` section. Idempotent — rerunning replaces the existing section.

## Install (end users)

1. Go to the [Releases page](../../releases) and download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. In your writing vault **W**, create the folder `<W>/.obsidian/plugins/cross-citer/` and drop those three files in.
3. Obsidian → Settings → Community plugins → **Reload** → enable **CrossCiter**.
4. Or, if you use [BRAT](https://github.com/TfTHacker/obsidian42-brat): add this repo URL as a beta plugin and it auto-installs and updates.

## Configure

Open Obsidian settings → CrossCiter and set:

- **Reference vault path** — absolute path to R's root folder.
- **Reference vault name** — R's Obsidian vault name (used for `obsidian://open` back-links).
- **Extra CSL styles folder** *(optional)* — folder of `.csl` files to load in addition to the built-in styles.

Then click **Refresh index now** (or run the command). On the first run, the plugin writes a `citekey:` field into every reference note's frontmatter to lock keys in place.

## Reference note format

Each reference note in R should have YAML frontmatter and, ideally, a BibTeX code block. Example:

```markdown
---
title: "Agentic AI: A Comprehensive Survey…"
authors:
  - Ali, Mohamad Abou
  - Dornaika, Fadi
year: 2025
doi: 10.1007/s10462-025-11422-4
citekey: ali2025   # written by the plugin if absent
---

## Abstract
…

## Citation

```bibtex
@article{ali2025,
  title = {Agentic AI: A Comprehensive Survey…},
  author = {Ali, Mohamad Abou and Dornaika, Fadi},
  year = {2025},
  doi = {10.1007/s10462-025-11422-4}
}
```
```

The BibTeX block drives citation formatting. YAML fields drive search and preview.

## Commands

Accessible via the command palette (Ctrl/Cmd + P) or the ribbon icon:

| Command | What it does |
|---|---|
| **Insert reference** | Opens the two-pane search modal; select an entry to insert. |
| **Refresh reference index** | Rescans R, updates cached index, persists any missing citekeys. |
| **Reformat all citations in current note** | Rewrites every `[^citekey]:` footnote definition in the active note using the current citation style. |
| **Export bibliography for current note** | Appends (or replaces) a `## Bibliography` section listing every cited entry, alphabetically. |
| **Reload extra CSL styles** | Rescans the CSL folder without a full restart. |
| **Log reference index to console (debug)** | Prints the in-memory index for troubleshooting. |

## Build from source (developers)

```
npm install
npm run build
```

`main.js` is bundled with esbuild. Copy the three runtime files (`main.js`, `manifest.json`, `styles.css`) into `<W>/.obsidian/plugins/cross-citer/` after each build.

## Publishing a release

```
git tag v0.1.0
git push origin v0.1.0
```

Then on GitHub → Releases → *Draft a new release* → choose the tag → attach `main.js`, `manifest.json`, and `styles.css` → publish. Bump `version` in `manifest.json` and `package.json` beforehand.

## Notes

- Desktop-only. Uses Node `fs` to read the R vault directly — mobile/browser Obsidian is not supported.
- The plugin never creates wikilinks between W and R, so R stays clean of backlinks from W.
