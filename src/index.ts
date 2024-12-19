import fs from "fs";
import path from "path";
import { parse } from "@typescript-eslint/parser";
import { HEADER } from "./constants.js";
// import { Plugin } from "vite";

const matchExclusion = (filePath: string, exclusions?: string[]): boolean => {
  if (!exclusions || typeof exclusions !== "object") return false;
  return exclusions.some((excludePattern) => {
    const regex = new RegExp(
      excludePattern.replace(/\*/g, ".*").replace(/\//g, "\\/")
    );
    return regex.test(filePath);
  });
};

const analyzeExports = (
  filePath: string
): { hasDefault: boolean; hasNamed: boolean } => {
  const content = fs.readFileSync(filePath, "utf8");

  let jsx = false;

  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) jsx = true;

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
    } else if (
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportAllDeclaration"
    ) {
      hasNamed = true;
    }
  });

  return { hasDefault, hasNamed };
};

const gatherFiles = (dir: string, exclusions?: string[]): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  let files: string[] = [];

  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (matchExclusion(fullPath, exclusions)) return;

    if (entry.isDirectory()) {
      files = files.concat(gatherFiles(fullPath, exclusions));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".tsx") ||
        (entry.name.endsWith(".ts") && entry.name !== "index.ts"))
    ) {
      files.push(fullPath);
    }
  });

  return files;
};

const generateIndex = (rootDir: string, exclusions?: string[]) => {
  const files = gatherFiles(rootDir, exclusions);

  const exports = files
    .map((filePath) => {
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
      const baseName = path.basename(relativePath).replace(/\.[^/.]+$/, "");
      const { hasDefault, hasNamed } = analyzeExports(filePath);

      if (hasDefault && hasNamed) {
        return `export { default as ${baseName} } from './${relativePath}';\nexport * from './${relativePath}';`;
      } else if (hasDefault) {
        return `export { default as ${baseName} } from './${relativePath}';`;
      } else if (hasNamed) {
        return `export * from './${relativePath}';`;
      } else {
        console.warn(`Warning: No exports found in ${relativePath}`);
        return `// No exports found in './${relativePath}'`;
      }
    })
    .join("\n");

  const indexFilePath = path.join(rootDir, "index.ts");

  fs.writeFileSync(indexFilePath, HEADER + exports, "utf8");

  console.log(`Generated index.ts in ${rootDir}`);
};

export type ExporterOptions = {
  dirs: string[];
  excludes?: string[];
};

export function generateIndexPlugin(options: ExporterOptions): any {
  return {
    name: "vite-exporter-plugin",
    apply: "serve",

    configureServer(server) {
      options.dirs.forEach((dir) => {
        const dirPath = path.resolve(process.cwd(), dir);

        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          server.watcher.add(dirPath);
        } else {
          console.warn(`Directory ${dir} does not exist`);
        }
      });

      options.dirs.forEach((dir) => {
        const dirPath = path.resolve(process.cwd(), dir);

        server.watcher.on("change", (filePath) => {
          if (
            filePath.startsWith(dirPath) &&
            !matchExclusion(filePath, options.excludes)
          ) {
            console.log(`File changed: ${filePath}`);
            generateIndex(dirPath, options.excludes);
          }
        });

        server.watcher.on("unlink", (filePath) => {
          if (
            filePath.startsWith(dirPath) &&
            !matchExclusion(filePath, options.excludes)
          ) {
            console.log(`File deleted: ${filePath}`);
            generateIndex(dirPath, options.excludes);
          }
        });

        server.watcher.on("add", (filePath) => {
          if (
            filePath.startsWith(dirPath) &&
            !matchExclusion(filePath, options.excludes)
          ) {
            console.log(`File added: ${filePath}`);
            generateIndex(dirPath, options.excludes);
          }
        });
      });
    },

    buildStart() {
      options.dirs.forEach((dir) => {
        const dirPath = path.resolve(process.cwd(), dir);
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          generateIndex(dirPath, options.excludes);
        } else {
          console.warn(`Directory ${dir} does not exist`);
        }
      });
    },
  };
}
