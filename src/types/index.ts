import { LogLevel } from "../utils/logger.js";

export enum ProcessingMode {
  /** Only export files that have exports - ignores files with no exports */
  ExportsOnly = "exports-only",
  /** Export files with exports, import files without exports for side effects */
  ExportsAndImports = "exports-and-imports",
  /** Import all files - exports for files with exports, side-effect imports for files without */
  ImportAll = "import-all",
}

export interface FileExportInfo {
  absolutePath: string;
  relativePath: string;
  baseName: string;
  hasDefault: boolean;
  hasNamed: boolean;
  shouldImport?: boolean; // Flag for whether to include as side-effect import
}

export interface DirConfig {
  dir: string;
  match?: string | string[]; // if not assigned match everything
  exclude?: string | string[]; // if not assigned match nothing
  mode?: ProcessingMode; // how to handle files without exports
}

export interface NormalizedDirConfig {
  dir: string;
  match: string[];
  exclude: string[];
  mode: ProcessingMode; // normalized mode with default
}

export interface PluginConfig {
  dirs: (string | DirConfig)[];
  extensions?: string[];
  debounceMs?: number;
  logLevel?: LogLevel;
  enableTimestamp?: boolean;
  mode?: ProcessingMode; // global default mode
}

export interface ExporterOptions {
  dirs: (string | DirConfig)[];
  extensions?: string[];
  debounceMs?: number;
  logLevel?: LogLevel;
  enableTimestamp?: boolean;
  mode?: ProcessingMode; // global default mode
}

export type FileEventAction = "add" | "change" | "unlink";
