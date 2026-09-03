import { MarkdownView, Notice, Plugin } from "obsidian";
import { promises as fs } from "fs";
import matter from "gray-matter";
import { CrossCiterSettings, DEFAULT_SETTINGS, RefEntry } from "./types";
import { indexRefVault } from "./indexer";
import { CrossCiterSettingTab } from "./settings";
import { ReferenceSearchModal } from "./modal";
import { loadExtraStyles } from "./styles";
import { exportBibliography, reformatAllCitations } from "./insert";

export default class CrossCiterPlugin extends Plugin {
  settings!: CrossCiterSettings;
  index: RefEntry[] = [];
  extraStyles: string[] = [];

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new CrossCiterSettingTab(this.app, this));

    this.addRibbonIcon("quote-glyph", "Insert reference (CrossCiter)", () => this.openSearch());

    this.addCommand({ id: "insert-reference", name: "Insert reference", callback: () => this.openSearch() });
    this.addCommand({ id: "refresh-reference-index", name: "Refresh reference index", callback: () => this.refreshIndex() });
    this.addCommand({ id: "reload-csl-styles", name: "Reload extra CSL styles", callback: () => this.reloadStyles() });
    this.addCommand({
      id: "export-bibliography",
      name: "Export bibliography for current note",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return false;
        if (checking) return true;
        exportBibliography(view, this.index, this.settings);
        return true;
      },
    });
    this.addCommand({
      id: "reformat-citations",
      name: "Reformat all citations in current note",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return false;
        if (checking) return true;
        reformatAllCitations(view, this.index, this.settings);
        return true;
      },
    });
    this.addCommand({
      id: "log-reference-index",
      name: "Log reference index to console (debug)",
      callback: () => {
        console.log(`[CrossCiter] ${this.index.length} entries`, this.index);
        new Notice(`CrossCiter: ${this.index.length} entries (see console)`);
      },
    });

    const cached = await this.loadData();
    if (cached?.index) this.index = cached.index;

    await this.reloadStyles();
    this.app.workspace.onLayoutReady(() => this.refreshIndex());
  }

  openSearch() {
    if (this.index.length === 0) {
      new Notice("CrossCiter: index is empty — run Refresh reference index.");
      return;
    }
    new ReferenceSearchModal(this.app, this).open();
  }

  async refreshIndex() {
    if (!this.settings.refVaultPath) {
      new Notice("CrossCiter: set the reference vault path in settings first.");
      return;
    }
    new Notice("CrossCiter: indexing reference vault…");
    try {
      this.index = await indexRefVault(this.settings.refVaultPath);
      await this.saveData({ settings: this.settings, index: this.index });
      new Notice(`CrossCiter: indexed ${this.index.length} references.`);
    } catch (e: any) {
      console.error(e);
      new Notice(`CrossCiter: index failed — ${e?.message ?? e}`);
    }
  }

  async reloadStyles() {
    if (!this.settings.cslStylesPath) {
      this.extraStyles = [];
      new Notice("CrossCiter: no CSL styles folder set.");
      return;
    }
    try {
      const report = await loadExtraStyles(this.settings.cslStylesPath);
      this.extraStyles = report.loaded;
      console.log("[CrossCiter] style load report:", report);

      if (report.readError) {
        new Notice(`CrossCiter: cannot read folder — ${report.readError}`, 8000);
      } else if (report.cslFilesSeen === 0) {
        new Notice(`CrossCiter: no .csl files found in ${this.settings.cslStylesPath}`, 8000);
      } else if (report.loaded.length === 0) {
        new Notice(`CrossCiter: ${report.cslFilesSeen} .csl file(s) found but all failed to load — see console.`, 8000);
      } else {
        new Notice(
          `CrossCiter: loaded ${report.loaded.length}/${report.cslFilesSeen} styles: ${report.loaded.join(", ")}${
            report.failed.length ? ` · ${report.failed.length} failed` : ""
          }`,
          8000,
        );
      }
    } catch (e: any) {
      console.error(e);
      new Notice(`CrossCiter: style load failed — ${e?.message ?? e}`);
    }
  }

  async persistCitekey(entry: RefEntry) {
    try {
      const raw = await fs.readFile(entry.path, "utf8");
      const parsed = matter(raw);
      if (parsed.data?.citekey === entry.citekey) return; // already set
      parsed.data = { ...parsed.data, citekey: entry.citekey };
      const rebuilt = matter.stringify(parsed.content, parsed.data);
      await fs.writeFile(entry.path, rebuilt, "utf8");
      // update in-memory index too
      const cached = this.index.find((e) => e.path === entry.path);
      if (cached) cached.citekey = entry.citekey;
    } catch (e) {
      console.error("[CrossCiter] persistCitekey failed:", e);
    }
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
  }

  async saveSettings() {
    const data = (await this.loadData()) ?? {};
    data.settings = this.settings;
    await this.saveData(data);
  }
}
