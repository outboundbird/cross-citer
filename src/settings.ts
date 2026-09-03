import { App, PluginSettingTab, Setting } from "obsidian";
import type CrossCiterPlugin from "./main";

export class CrossCiterSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: CrossCiterPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "CrossCiter" });

    new Setting(containerEl)
      .setName("Reference vault path")
      .setDesc("Absolute path to the R vault root.")
      .addText((t) =>
        t
          .setPlaceholder(String.raw`C:\path\to\R`)
          .setValue(this.plugin.settings.refVaultPath)
          .onChange(async (v) => {
            this.plugin.settings.refVaultPath = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Reference vault name")
      .setDesc("Obsidian vault name for R (used in obsidian:// back-links).")
      .addText((t) =>
        t
          .setPlaceholder("PaperBox")
          .setValue(this.plugin.settings.refVaultName)
          .onChange(async (v) => {
            this.plugin.settings.refVaultName = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    const styleOptions: Record<string, string> = {
      apa: "APA",
      vancouver: "Vancouver",
      harvard1: "Harvard",
    };
    for (const s of this.plugin.extraStyles) styleOptions[s] = s;

    new Setting(containerEl)
      .setName("Citation style")
      .setDesc("Built-in: APA, Vancouver, Harvard. Add more via CSL styles folder below.")
      .addDropdown((d) =>
        d
          .addOptions(styleOptions)
          .setValue(this.plugin.settings.citationStyle)
          .onChange(async (v) => {
            this.plugin.settings.citationStyle = v;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Extra CSL styles folder")
      .setDesc("Folder with .csl files (e.g. nature.csl, ieee.csl). Reload plugin after adding files.")
      .addText((t) =>
        t
          .setPlaceholder(String.raw`C:\path\to\csl-styles`)
          .setValue(this.plugin.settings.cslStylesPath)
          .onChange(async (v) => {
            this.plugin.settings.cslStylesPath = v.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Insert mode")
      .addDropdown((d) =>
        d
          .addOptions({ footnote: "Footnote [^key]", inline: "Inline [@key]" })
          .setValue(this.plugin.settings.insertMode)
          .onChange(async (v) => {
            this.plugin.settings.insertMode = v as "footnote" | "inline";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Refresh index now")
      .addButton((b) =>
        b.setButtonText("Refresh").onClick(async () => {
          await this.plugin.refreshIndex();
          this.display();
        }),
      );

    new Setting(containerEl)
      .setName("Reload extra CSL styles")
      .addButton((b) =>
        b.setButtonText("Reload styles").onClick(async () => {
          await this.plugin.reloadStyles();
          this.display();
        }),
      );
  }
}
