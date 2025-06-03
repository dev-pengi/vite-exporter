import path from "node:path";
import { FileExportInfo, FileEventAction, NormalizedDirConfig } from "../types/index.js";
import {
  shouldIncludeFile,
  shouldIncludeAsImport,
  shouldGenerateSideEffectImport,
  isValidFile,
} from "../utils/file-validation.js";
import { analyzeExports } from "./export-analyzer.js";
import * as logger from "../utils/logger.js";

const cache = new Map<string, FileExportInfo[]>();

export const getCache = (): Map<string, FileExportInfo[]> => cache;

export const updateCache = (
  dirPath: string,
  filePath: string,
  action: FileEventAction,
  config: { extensions: string[] },
  dirConfig: NormalizedDirConfig,
) => {
  if (
    !isValidFile(filePath, config.extensions) ||
    !shouldIncludeFile(filePath, dirPath, dirConfig)
  ) {
    logger.verbose(`⚡ Skipping file (not valid or included): ${logger.getRelativePath(filePath)}`);
    return;
  }

  const currentCache = cache.get(dirPath) || [];

  if (action === "unlink") {
    const filteredCache = currentCache.filter((f) => f.absolutePath !== filePath);
    cache.set(dirPath, filteredCache);
    logger.verbose(`🗑️ Removed from cache: ${logger.getRelativePath(filePath)}`);
    return;
  }

  try {
    const { hasDefault, hasNamed } = analyzeExports(filePath);
    const relativePath = path.relative(dirPath, filePath).replace(/\\/g, "/");
    const baseName = path.basename(relativePath).replace(/\.[^/.]+$/, "");

    // Check if this file should be included based on the processing mode
    if (!shouldIncludeAsImport(hasDefault, hasNamed, dirConfig.mode)) {
      // Remove from cache if it exists but shouldn't be included anymore
      const existingIndex = currentCache.findIndex((f) => f.absolutePath === filePath);
      if (existingIndex >= 0) {
        currentCache.splice(existingIndex, 1);
        cache.set(dirPath, currentCache);
        logger.verbose(
          `🗑️ Removed from cache (mode exclusion): ${logger.getRelativePath(filePath)}`,
        );
      }
      return;
    }

    const shouldImport = shouldGenerateSideEffectImport(hasDefault, hasNamed, dirConfig.mode);

    const existingIndex = currentCache.findIndex((f) => f.absolutePath === filePath);
    const fileInfo: FileExportInfo = {
      absolutePath: filePath,
      relativePath,
      baseName,
      hasDefault,
      hasNamed,
      shouldImport,
    };

    if (action === "change") {
      if (existingIndex >= 0) {
        const existing = currentCache[existingIndex];
        if (
          existing.hasDefault === hasDefault &&
          existing.hasNamed === hasNamed &&
          existing.shouldImport === shouldImport
        ) {
          logger.verbose(`⚡ No export changes detected for: ${logger.getRelativePath(filePath)}`);
          return;
        }
        currentCache[existingIndex] = fileInfo;
        logger.verbose(`📝 Updated cache entry: ${logger.getRelativePath(filePath)}`);
      } else {
        currentCache.push(fileInfo);
        logger.verbose(`➕ Added new cache entry: ${logger.getRelativePath(filePath)}`);
      }
    } else if (action === "add") {
      if (existingIndex === -1) {
        currentCache.push(fileInfo);
        logger.verbose(`➕ Added to cache: ${logger.getRelativePath(filePath)}`);
      }
    }

    cache.set(dirPath, currentCache);
  } catch (error) {
    logger.error(`Failed to update cache for ${logger.getRelativePath(filePath)}: ${error}`);
  }
};

export const clearCache = () => {
  cache.clear();
  logger.verbose("🧹 Cache cleared");
};
