import path from "node:path";
import { FileExportInfo, FileEventAction, NormalizedDirConfig } from "../types/index.js";
import { shouldIncludeFile, isValidFile } from "../utils/file-validation.js";
import { analyzeExports } from "./export-analyzer.js";
import * as logger from "../utils/logger.js";

const cache = new Map<string, FileExportInfo[]>();

export const getCache = (): Map<string, FileExportInfo[]> => cache;

export const updateCache = (
  dirPath: string,
  filePath: string,
  action: FileEventAction,
  config: { extensions: string[] },
  dirConfig: NormalizedDirConfig
) => {
  if (!shouldIncludeFile(filePath, dirPath, dirConfig)) {
    return;
  }

  const currentCache = cache.get(dirPath) || [];
  logger.cacheUpdate(action, filePath, currentCache.length);

  if (action === "unlink") {
    const newCache = currentCache.filter((f) => f.absolutePath !== filePath);
    cache.set(dirPath, newCache);
    logger.verbose(`🗑️ Removed from cache: ${logger.getRelativePath(filePath)}`);
    return;
  }

  if (!isValidFile(filePath, config.extensions)) {
    return;
  }

  try {
    const { hasDefault, hasNamed } = analyzeExports(filePath);
    const relativePath = path.relative(dirPath, filePath).replace(/\\/g, "/");
    const baseName = path.basename(relativePath).replace(/\.[^/.]+$/, "");

    const existingIndex = currentCache.findIndex((f) => f.absolutePath === filePath);
    const fileInfo: FileExportInfo = {
      absolutePath: filePath,
      relativePath,
      baseName,
      hasDefault,
      hasNamed,
    };

    if (action === "change") {
      if (existingIndex >= 0) {
        const existing = currentCache[existingIndex];
        if (existing.hasDefault === hasDefault && existing.hasNamed === hasNamed) {
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