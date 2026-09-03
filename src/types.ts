export interface RefEntry {
  citekey: string;
  authors: string[];
  year: number | string | null;
  title: string;
  doi?: string;
  url?: string;
  path: string;
  relPath: string;
  bibtex?: string;
}

export interface CrossCiterSettings {
  refVaultPath: string;
  refVaultName: string;
  citationStyle: string;
  insertMode: "footnote" | "inline";
  cslStylesPath: string; // optional folder containing extra .csl files
}

export const DEFAULT_SETTINGS: CrossCiterSettings = {
  refVaultPath: "",
  refVaultName: "",
  citationStyle: "apa",
  insertMode: "footnote",
  cslStylesPath: "",
};
