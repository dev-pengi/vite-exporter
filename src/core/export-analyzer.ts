import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import * as logger from "../utils/logger.js";

export const analyzeExports = (filePath: string): { hasDefault: boolean; hasNamed: boolean } => {
  logger.verbose(`🔎 Analyzing exports: ${logger.getRelativePath(filePath)}`);

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const isTypeScript = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
    const isJSX = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");

    // Create TypeScript source file
    const sourceFile = ts.createSourceFile(
      path.basename(filePath),
      content,
      ts.ScriptTarget.Latest,
      true, // setParentNodes
      isTypeScript
        ? isJSX
          ? ts.ScriptKind.TSX
          : ts.ScriptKind.TS
        : isJSX
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.JS
    );

    let hasDefault = false;
    let hasNamed = false;

    // Traverse the AST to find export declarations
    function visitNode(node: ts.Node) {
      if (ts.isExportDeclaration(node)) {
        // export { ... } or export * from "..."
        hasNamed = true;
      } else if (ts.isExportAssignment(node)) {
        // export = ... (CommonJS style)
        if (node.isExportEquals) {
          hasNamed = true;
        } else {
          hasDefault = true;
        }
      } else if (ts.canHaveModifiers(node)) {
        const modifiers = ts.getModifiers(node);
        if (modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
          // export function, export class, export const, etc.
          if (modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) {
            // export default ...
            hasDefault = true;
          } else {
            // export function, export const, etc.
            hasNamed = true;
          }
        }
      }

      // Continue traversing child nodes
      ts.forEachChild(node, visitNode);
    }

    visitNode(sourceFile);

    logger.exportAnalysis(path.basename(filePath), hasDefault, hasNamed);
    return { hasDefault, hasNamed };
  } catch (error) {
    logger.error(`Failed to analyze exports in ${logger.getRelativePath(filePath)}: ${error}`);
    return { hasDefault: false, hasNamed: false };
  }
};
