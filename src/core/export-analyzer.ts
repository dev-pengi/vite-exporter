import fs from "node:fs";
import path from "node:path";
import { parse } from "@typescript-eslint/parser";
import * as logger from "../utils/logger.js";

export const analyzeExports = (filePath: string): { hasDefault: boolean; hasNamed: boolean } => {
  logger.verbose(`🔎 Analyzing exports: ${logger.getRelativePath(filePath)}`);

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const jsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");

    const parsed = parse(content, {
      sourceType: "module",
      ecmaVersion: "latest",
      jsx,
    });

    let hasDefault = false;
    let hasNamed = false;

    parsed.body.forEach((node: any) => {
      if (node.type === "ExportDefaultDeclaration") {
        hasDefault = true;
      } else if (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") {
        hasNamed = true;
      }
    });

    logger.exportAnalysis(path.basename(filePath), hasDefault, hasNamed);
    return { hasDefault, hasNamed };
  } catch (error) {
    logger.error(`Failed to analyze exports in ${logger.getRelativePath(filePath)}: ${error}`);
    return { hasDefault: false, hasNamed: false };
  }
}; 