import fs from "node:fs";
import path from "node:path";
import { HEADER } from "../config/constants.js";
import { getCache } from "./cache-manager.js";
import * as logger from "../utils/logger.js";

export const generateIndexFromCache = (dirPath: string) => {
  try {
    const fileInfos = getCache().get(dirPath) || [];
    logger.verbose(
      `📝 Generating index for: ${logger.getRelativePath(dirPath)} with ${fileInfos.length} files`
    );

    if (fileInfos.length === 0) {
      logger.warn(`No valid files found in cache for: ${logger.getRelativePath(dirPath)}`);
      return;
    }

    const defaultOnly = fileInfos
      .filter(({ hasDefault, hasNamed }) => hasDefault && !hasNamed)
      .sort((a, b) => a.baseName.localeCompare(b.baseName))
      .map(
        ({ relativePath, baseName }) =>
          `export { default as ${baseName} } from './${relativePath}';`
      );

    const namedOnly = fileInfos
      .filter(({ hasDefault, hasNamed }) => !hasDefault && hasNamed)
      .sort((a, b) => a.baseName.localeCompare(b.baseName))
      .map(({ relativePath }) => `export * from './${relativePath}';`);

    const both = fileInfos
      .filter(({ hasDefault, hasNamed }) => hasDefault && hasNamed)
      .sort((a, b) => a.baseName.localeCompare(b.baseName))
      .map(
        ({ relativePath, baseName }) =>
          `export { default as ${baseName} } from './${relativePath}';\nexport * from './${relativePath}';`
      );

    let exports = "";
    if (both.length > 0) {
      exports += "// Default and named exports\n";
      exports += both.join("\n");
    }
    if (defaultOnly.length > 0) {
      exports += "\n\n// Default exports only\n";
      exports += defaultOnly.join("\n");
    }
    if (namedOnly.length > 0) {
      exports += "\n\n// Named exports only\n";
      exports += namedOnly.join("\n");
    }

    const indexPath = path.join(dirPath, "index.ts");
    fs.writeFileSync(indexPath, HEADER + exports);
    logger.indexGeneration(dirPath, fileInfos.length);
  } catch (error) {
    logger.error(`Failed to generate index for ${logger.getRelativePath(dirPath)}: ${error}`);
  }
};
