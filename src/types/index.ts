import { LogLevel } from "../utils/logger.js";

export interface FileExportInfo {
  absolutePath: string;
  relativePath: string;
  baseName: string;
  hasDefault: boolean;
  hasNamed: boolean;
  isRunImport?: boolean; // New flag for side-effect imports
}

export interface DirConfig {
  dir: string;
  match?: string | string[]; // if not assigned match everything
  exclude?: string | string[]; // if not assigned match nothing
  run?: string | string[]; // files to import for side effects even if no exports
}

export interface NormalizedDirConfig {
  dir: string;
  match: string[];
  exclude: string[];
  run: string[]; // normalized run patterns
}

export interface PluginConfig {
  dirs: (string | DirConfig)[];
  extensions?: string[];
  debounceMs?: number;
  logLevel?: LogLevel;
  enableTimestamp?: boolean;
}

export interface ExporterOptions {
  dirs: (string | DirConfig)[];
  extensions?: string[];
  debounceMs?: number;
  logLevel?: LogLevel;
  enableTimestamp?: boolean;
  // Legacy support
  enableDebugging?: boolean;
  enableDebuggingVerbose?: boolean;
}

export type FileEventAction = "add" | "change" | "unlink"; 