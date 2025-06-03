import { PluginConfig, ProcessingMode } from "../types/index.js";
import { LogLevel } from "../utils/logger.js";

// Default configuration
export const DEFAULT_CONFIG: Required<Omit<PluginConfig, "dirs">> = {
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  debounceMs: 2000,
  logLevel: LogLevel.INFO,
  enableTimestamp: true,
  mode: ProcessingMode.ExportsOnly,
};
