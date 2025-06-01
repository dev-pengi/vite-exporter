import path from "node:path";
import { minimatch } from "minimatch";
import { NormalizedDirConfig } from "../types/index.js";
import * as logger from "./logger.js";

export const shouldIncludeFile = (
  filePath: string,
  baseDirPath: string,
  config: NormalizedDirConfig
): boolean => {
  // Get relative path from the base directory
  const relativePath = path.relative(baseDirPath, filePath).replace(/\\/g, "/");

  // Check exclusion patterns first
  if (config.exclude.length > 0) {
    const isExcluded = config.exclude.some((pattern) => {
      try {
        const isMatch = minimatch(relativePath, pattern);
        if (isMatch) {
          logger.verbose(`🚫 File excluded by pattern "${pattern}": ${logger.getRelativePath(filePath)}`);
        }
        return isMatch;
      } catch (error) {
        logger.warn(`Invalid exclusion pattern "${pattern}": ${error}`);
        return false;
      }
    });

    if (isExcluded) {
      return false;
    }
  }

  // Check inclusion patterns
  const isIncluded = config.match.some((pattern) => {
    try {
      return minimatch(relativePath, pattern);
    } catch (error) {
      logger.warn(`Invalid match pattern "${pattern}": ${error}`);
      return false;
    }
  });

  if (!isIncluded) {
    logger.verbose(`🚫 File not matched by patterns: ${logger.getRelativePath(filePath)}`);
  }

  return isIncluded;
};

export const isValidFile = (filePath: string, extensions: string[]): boolean => {
  const isIndex = path.basename(filePath) === "index.ts";
  const hasValidExtension = extensions.some((ext) => filePath.endsWith(ext));

  if (isIndex) {
    logger.verbose(`🚫 Skipping index file: ${logger.getRelativePath(filePath)}`);
    return false;
  }

  if (!hasValidExtension) {
    logger.verbose(`🚫 Invalid extension for: ${logger.getRelativePath(filePath)}`);
    return false;
  }

  return true;
};

export const isGeneratedIndexFile = (filePath: string, dirMap: Map<string, NormalizedDirConfig>): boolean => {
  return Array.from(dirMap.keys()).some((resolvedDir) => {
    const generatedIndex = path.join(resolvedDir, "index.ts");
    return filePath === generatedIndex;
  });
}; 