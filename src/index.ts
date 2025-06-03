// Re-export main plugin functionality
export { generateIndexPlugin } from "./plugin/plugin.js";

// Re-export types for external use
export type { ExporterOptions, PluginConfig, FileExportInfo } from "./types/index.js";
export { ProcessingMode } from "./types/index.js";

// Re-export logger and LogLevel for external use
export { LogLevel } from "./utils/logger.js";
export * as logger from "./utils/logger.js";
