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

    const exports = fileInfos
      .map(({ relativePath, baseName, hasDefault, hasNamed }) => {
        if (hasDefault && hasNamed) {
          return `export { default as ${baseName} } from './${relativePath}';\nexport * from './${relativePath}';`;
        } else if (hasDefault) {
          return `export { default as ${baseName} } from './${relativePath}';`;
        } else if (hasNamed) {
          return `export * from './${relativePath}';`;
        }
        return `// No exports found in './${relativePath}'`;
      })
      .join("\n");

    const indexPath = path.join(dirPath, "index.ts");
    fs.writeFileSync(indexPath, HEADER + exports);
    logger.indexGeneration(dirPath, fileInfos.length);
  } catch (error) {
    logger.error(`Failed to generate index for ${logger.getRelativePath(dirPath)}: ${error}`);
  }
}; 