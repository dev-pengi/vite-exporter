import fs from "node:fs";
import path from "node:path";
import {
  ExporterOptions,
  PluginConfig,
  NormalizedDirConfig,
  ProcessingMode,
} from "../types/index.js";
import { DEFAULT_CONFIG } from "../config/defaults.js";
import { isGeneratedIndexFile } from "../utils/file-validation.js";
import { normalizeDirConfig } from "../utils/config-normalizer.js";
import { updateCache } from "../core/cache-manager.js";
import { processDirectory } from "../core/directory-processor.js";
import { scheduleUpdate } from "../core/debounce-manager.js";
import * as logger from "../utils/logger.js";

const dirMap = new Map<string, NormalizedDirConfig>();

export const generateIndexPlugin = (options: ExporterOptions): any => {
  let logLevel = options.logLevel ?? DEFAULT_CONFIG.logLevel;
  // Merge with defaults
  const pluginConfig: Required<PluginConfig> = {
    ...DEFAULT_CONFIG,
    ...options,
    logLevel,
    mode: options.mode ?? ProcessingMode.ExportsOnly, // Set default mode
  };

  // Configure logger
  logger.setLogLevel(pluginConfig.logLevel);

  // Show configuration summary
  logger.configSummary(pluginConfig);

  return {
    name: "vite-exporter-plugin",
    apply: "serve",

    configureServer(server) {
      try {
        pluginConfig.dirs.forEach((dirConfigInput) => {
          const normalizedDirConfig = normalizeDirConfig(dirConfigInput, pluginConfig.mode);
          const dirPath = path.resolve(process.cwd(), normalizedDirConfig.dir);

          if (!fs.existsSync(dirPath)) {
            logger.warn(`Directory does not exist: ${logger.getRelativePath(dirPath)}`);
            return;
          }

          dirMap.set(dirPath, normalizedDirConfig);
          processDirectory(dirPath, pluginConfig, normalizedDirConfig);
          server.watcher.add(dirPath);
          logger.debug(`👀 Watching directory: ${logger.getRelativePath(dirPath)}`);
        });

        const handleFileEvent = (filePath: string, action: "add" | "change" | "unlink") => {
          logger.fileEvent(action, filePath);

          if (isGeneratedIndexFile(filePath, dirMap)) {
            logger.verbose(
              `🚫 Ignoring plugin-generated index.ts: ${logger.getRelativePath(filePath)}`,
            );
            return;
          }

          Array.from(dirMap).forEach(([resolvedDir, dirConfig]) => {
            if (filePath.startsWith(resolvedDir)) {
              updateCache(resolvedDir, filePath, action, pluginConfig, dirConfig);
              scheduleUpdate(resolvedDir, pluginConfig.debounceMs);
            }
          });
        };

        server.watcher.on("change", (file) => handleFileEvent(file, "change"));
        server.watcher.on("add", (file) => handleFileEvent(file, "add"));
        server.watcher.on("unlink", (file) => handleFileEvent(file, "unlink"));

        logger.success("🎉 File watcher configured successfully");
      } catch (error) {
        logger.error(`Failed to configure server: ${error}`);
      }
    },

    buildStart() {
      try {
        logger.info("🏗️ Build started - processing directories...");

        pluginConfig.dirs.forEach((dirConfigInput) => {
          const normalizedDirConfig = normalizeDirConfig(dirConfigInput, pluginConfig.mode);
          const dirPath = path.resolve(process.cwd(), normalizedDirConfig.dir);

          if (fs.existsSync(dirPath)) {
            processDirectory(dirPath, pluginConfig, normalizedDirConfig);
          } else {
            logger.warn(`Build: Directory does not exist: ${logger.getRelativePath(dirPath)}`);
          }
        });

        logger.success("✅ Build processing completed");
      } catch (error) {
        logger.error(`Build failed: ${error}`);
      }
    },
  };
};
