# CrossCiter

Search reference notes in another Obsidian vault (R) and insert citations into notes in your writing vault (W).

## M1 status
- Settings tab (reference vault path, vault name, style, insert mode)
- Indexer: walks R, parses frontmatter + BibTeX block, derives citekeys, dedupes
- Commands: `Refresh reference index`, `Log reference index to console (debug)`
- Cached to `data.json`, refreshed on layout ready

## Build
```
npm install
npm run build
```
Copy `main.js`, `manifest.json` (and `styles.css` later) into `<W>/.obsidian/plugins/cross-citer/`, enable in Obsidian.

## Next
- M2: SuggestModal fuzzy search + naïve APA formatter
- M3: citation.js (`@citation-js/core` + bibtex + csl) with style dropdown
- M4: footnote insertion, dedupe, `obsidian://open?vault=R&file=...` back-link
- M5: fs.watch auto-refresh, collision handling, toasts
