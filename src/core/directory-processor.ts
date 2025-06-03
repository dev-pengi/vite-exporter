import fs from "node:fs";
import path from "node:path";
import { NormalizedDirConfig } from "../types/index.js";
import {
  shouldIncludeFile,
  shouldIncludeAsImport,
  shouldGenerateSideEffectImport,
  isValidFile,
} from "../utils/file-validation.js";
import { analyzeExports } from "./export-analyzer.js";
import { getCache } from "./cache-manager.js";
import { generateIndexFromCache } from "./index-generator.js";
import * as logger from "../utils/logger.js";

export const processDirectory = (
  dirPath: string,
  config: { extensions: string[] },
  dirConfig: NormalizedDirConfig,
) => {
  logger.verbose(`📂 Processing directory: ${logger.getRelativePath(dirPath)}`);

  try {
    const files: string[] = [];
    const stack = [dirPath];

    while (stack.length > 0) {
      const currentDir = stack.pop()!;

      if (!fs.existsSync(currentDir)) {
        logger.warn(`Directory does not exist: ${currentDir}`);
        continue;
      }

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (
          entry.isFile() &&
          isValidFile(fullPath, config.extensions) &&
          shouldIncludeFile(fullPath, dirPath, dirConfig)
        ) {
          files.push(fullPath);
        }
      }
    }

    const fileInfos = files
      .map((file) => {
        const relativePath = path.relative(dirPath, file).replace(/\\/g, "/");
        const baseName = path.basename(relativePath).replace(/\.[^/.]+$/, "");
        const { hasDefault, hasNamed } = analyzeExports(file);

        // Check if this file should be included based on the processing mode
        if (!shouldIncludeAsImport(hasDefault, hasNamed, dirConfig.mode)) {
          return null; // Filter out files that shouldn't be included
        }

        const shouldImport = shouldGenerateSideEffectImport(hasDefault, hasNamed, dirConfig.mode);
        return { absolutePath: file, relativePath, baseName, hasDefault, hasNamed, shouldImport };
      })
      .filter((fileInfo) => fileInfo !== null); // Remove filtered out files

    getCache().set(dirPath, fileInfos);
    generateIndexFromCache(dirPath);
    logger.directoryProcessing(dirPath, files.length);
  } catch (error) {
    logger.error(`Failed to process directory ${logger.getRelativePath(dirPath)}: ${error}`);
  }
};
