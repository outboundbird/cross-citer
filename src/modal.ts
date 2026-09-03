import { App, Component, MarkdownRenderer, MarkdownView, Notice, SuggestModal, prepareFuzzySearch } from "obsidian";
import { promises as fs } from "fs";
import { RefEntry } from "./types";
import type CrossCiterPlugin from "./main";
import { insertReference } from "./insert";

export class ReferenceSearchModal extends SuggestModal<RefEntry> {
  private previewEl!: HTMLDivElement;
  private previewComponent = new Component();
  private currentPreviewKey: string | null = null;
  private observer?: MutationObserver;

  constructor(app: App, private plugin: CrossCiterPlugin) {
    super(app);
    this.setPlaceholder("Search reference notes in R (author, year, title)…");
    this.modalEl.addClass("cross-citer-modal");
  }

  onOpen(): void {
    super.onOpen();
    // Wrap the results list in a flex row alongside the preview
    const parent = this.resultContainerEl.parentElement!;
    const row = parent.createDiv({ cls: "cross-citer-body" });
    parent.insertBefore(row, this.resultContainerEl);
    row.appendChild(this.resultContainerEl);
    this.previewEl = row.createDiv({ cls: "cross-citer-preview" });
    this.previewEl.setText("Highlight an entry to preview its reference note.");

    // Watch for selection changes in the suggestion list
    this.observer = new MutationObserver(() => this.updatePreview());
    this.observer.observe(this.resultContainerEl, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    setTimeout(() => this.updatePreview(), 30);
  }

  onClose(): void {
    this.observer?.disconnect();
    this.previewComponent.unload();
    super.onClose();
  }

  private getSelectedEntry(): RefEntry | null {
    const el = this.resultContainerEl.querySelector(".suggestion-item.is-selected") as HTMLElement | null;
    if (!el) return null;
    const key = el.dataset.crossCiterKey;
    if (!key) return null;
    return this.plugin.index.find((e) => e.citekey === key) ?? null;
  }

  private async updatePreview() {
    const entry = this.getSelectedEntry();
    if (!entry) return;
    if (entry.citekey === this.currentPreviewKey) return;
    this.currentPreviewKey = entry.citekey;

    this.previewComponent.unload();
    this.previewComponent = new Component();
    this.previewEl.empty();

    const header = this.previewEl.createDiv({ cls: "cross-citer-preview-header" });
    header.createEl("div", { text: entry.title, cls: "cross-citer-preview-title" });
    header.createEl("small", {
      text: `${entry.authors.join("; ")} · ${entry.year ?? ""} · [${entry.citekey}]`,
    });

    const body = this.previewEl.createDiv({ cls: "cross-citer-preview-body" });
    try {
      const raw = await fs.readFile(entry.path, "utf8");
      await MarkdownRenderer.render(this.app, raw, body, entry.path, this.previewComponent);
    } catch (err: any) {
      body.setText(`Failed to read note: ${err?.message ?? err}`);
    }
  }

  getSuggestions(query: string): RefEntry[] {
    const q = query.trim();
    const entries = this.plugin.index;
    if (!q) return entries.slice(0, 50);
    const fuzzy = prepareFuzzySearch(q);
    const scored: { e: RefEntry; score: number }[] = [];
    for (const e of entries) {
      const hay = `${e.authors.join(" ")} ${e.year ?? ""} ${e.title} ${e.citekey}`;
      const r = fuzzy(hay);
      if (r) scored.push({ e, score: r.score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 50).map((x) => x.e);
  }

  renderSuggestion(e: RefEntry, el: HTMLElement): void {
    el.dataset.crossCiterKey = e.citekey;
    el.createEl("div", { text: e.title, cls: "cross-citer-title" });
    const meta = [e.authors.slice(0, 3).join("; "), e.year ?? ""].filter(Boolean).join(" · ");
    el.createEl("small", { text: `${meta}   [${e.citekey}]`, cls: "cross-citer-meta" });
  }

  onChooseSuggestion(entry: RefEntry): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice("CrossCiter: open a markdown note in W first.");
      return;
    }
    insertReference(view, entry, this.plugin.settings);
    // fire and forget: persist citekey back to R's frontmatter
    void this.plugin.persistCitekey(entry);
  }
}
