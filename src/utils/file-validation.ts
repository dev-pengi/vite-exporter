import path from "node:path";
import { minimatch } from "minimatch";
import { NormalizedDirConfig, ProcessingMode } from "../types/index.js";
import * as logger from "./logger.js";

export const shouldIncludeFile = (
  filePath: string,
  baseDirPath: string,
  config: NormalizedDirConfig
): boolean => {
  const relativePath = path.relative(baseDirPath, filePath).replace(/\\/g, "/");

  // Check exclude patterns first (they take precedence)
  const isExcluded = config.exclude.some((pattern) => {
    try {
      const isMatch = minimatch(relativePath, pattern);
      if (isMatch) {
        logger.verbose(
          `🚫 File excluded by pattern "${pattern}": ${logger.getRelativePath(filePath)}`
        );
      }
      return isMatch;
    } catch (error) {
      logger.warn(`Invalid exclude pattern "${pattern}": ${error}`);
      return false;
    }
  });

  if (isExcluded) return false;

  // Check include patterns
  const isIncluded = config.match.some((pattern) => {
    try {
      const isMatch = minimatch(relativePath, pattern);
      if (isMatch) {
        logger.verbose(
          `✅ File matched by pattern "${pattern}": ${logger.getRelativePath(filePath)}`
        );
      }
      return isMatch;
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

export const shouldIncludeAsImport = (
  hasDefault: boolean,
  hasNamed: boolean,
  mode: ProcessingMode
): boolean => {
  const hasExports = hasDefault || hasNamed;

  switch (mode) {
    case ProcessingMode.ExportsOnly:
      // Only include files that have exports
      return hasExports;

    case ProcessingMode.ExportsAndImports:
      // Include all files - files without exports become side-effect imports
      return true;

    case ProcessingMode.ImportAll:
      // Include all files - files without exports become side-effect imports
      return true;

    default:
      logger.warn(`Unknown processing mode: ${mode}, defaulting to ExportsOnly`);
      return hasExports;
  }
};

export const shouldGenerateSideEffectImport = (
  hasDefault: boolean,
  hasNamed: boolean,
  mode: ProcessingMode
): boolean => {
  const hasExports = hasDefault || hasNamed;

  switch (mode) {
    case ProcessingMode.ExportsOnly:
      // Never generate side-effect imports in exports-only mode
      return false;

    case ProcessingMode.ExportsAndImports:
      // Generate side-effect imports for files without exports
      return !hasExports;

    case ProcessingMode.ImportAll:
      // Generate side-effect imports for files without exports
      return !hasExports;

    default:
      logger.warn(`Unknown processing mode: ${mode}, defaulting to no side-effect imports`);
      return false;
  }
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

export const isGeneratedIndexFile = (
  filePath: string,
  dirMap: Map<string, NormalizedDirConfig>
): boolean => {
  return Array.from(dirMap.keys()).some((resolvedDir) => {
    const generatedIndex = path.join(resolvedDir, "index.ts");
    return filePath === generatedIndex;
  });
};
