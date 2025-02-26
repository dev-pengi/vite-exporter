import fs from "fs";
import path from "path";
import { parse } from "@typescript-eslint/parser";
import { HEADER } from "./constants.js";

// Cache for export analysis results
const exportCache = new Map<
  string,
  { mtime: Date; hasDefault: boolean; hasNamed: boolean }
>();

// Cache for directory file listings
const directoryCache = new Map<string, Set<string>>();

const matchExclusion = (filePath: string, exclusions?: string[]): boolean => {
  if (!exclusions || !Array.isArray(exclusions)) return false;
  return exclusions.some((pattern) => {
    const regex = new RegExp(
      pattern.replace(/\*/g, ".*").replace(/\//g, "\\/")
    );
    return regex.test(filePath);
  });
};

const analyzeExports = (
  filePath: string
): { hasDefault: boolean; hasNamed: boolean } => {
  try {
    const stats = fs.statSync(filePath);
    const cached = exportCache.get(filePath);

    if (cached && stats.mtime <= cached.mtime) {
      return { hasDefault: cached.hasDefault, hasNamed: cached.hasNamed };
    }

    const content = fs.readFileSync(filePath, "utf8");
    const jsx = [".tsx", ".jsx"].includes(path.extname(filePath));
    
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

    exportCache.set(filePath, { mtime: stats.mtime, hasDefault, hasNamed });
    return { hasDefault, hasNamed };
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
    return { hasDefault: false, hasNamed: false };
  }
};

const isValidFile = (filePath: string): boolean => {
  const ext = path.extname(filePath);
  const isIndex = path.basename(filePath) === "index.ts";
  return ([".tsx", ".ts"].includes(ext) && !isIndex) || ext === ".jsx";
};

const gatherFiles = (dir: string, exclusions?: string[]): string[] => {
  const cached = directoryCache.get(dir);
  if (cached) return Array.from(cached);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (matchExclusion(fullPath, exclusions)) return;

    if (entry.isDirectory()) {
      files.push(...gatherFiles(fullPath, exclusions));
    } else if (entry.isFile() && isValidFile(fullPath)) {
      files.push(fullPath);
    }
  });

  directoryCache.set(dir, new Set(files));
  return files;
};

const generateIndex = (rootDir: string, exclusions?: string[]) => {
  const indexFilePath = path.join(rootDir, "index.ts");
  
  // Temporarily disable index file tracking
  if (fs.existsSync(indexFilePath)) {
    exportCache.set(indexFilePath, {
      mtime: new Date(),
      hasDefault: false,
      hasNamed: false
    });
  }

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
      }
      return `// No exports found in './${relativePath}'`;
    })
    .join("\n");

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
      const debounceTimers = new Map<string, NodeJS.Timeout>();
      const watcherHandlers = new Map<string, (filePath: string) => void>();

      options.dirs.forEach((dir) => {
        const dirPath = path.resolve(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) return;

        // Initialize directory cache
        gatherFiles(dirPath, options.excludes);

        const debouncedGenerate = () => {
          clearTimeout(debounceTimers.get(dirPath));
          debounceTimers.set(
            dirPath,
            setTimeout(() => generateIndex(dirPath, options.excludes), 300)
          );
        };

        const handler = (filePath: string) => {
          const isIndexFile = path.relative(dirPath, filePath) === "index.ts";
          
          if (isIndexFile) {
            if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              exportCache.set(filePath, {
                mtime: stats.mtime,
                hasDefault: false,
                hasNamed: false
              });
            }
            return;
          }

          if (
            filePath.startsWith(dirPath) &&
            !matchExclusion(filePath, options.excludes) &&
            isValidFile(filePath)
          ) {
            debouncedGenerate();
          }
        };

        watcherHandlers.set(dirPath, handler);

        server.watcher.on("add", handler);
        server.watcher.on("change", handler);
        server.watcher.on("unlink", (filePath) => {
          if (directoryCache.get(dirPath)?.delete(filePath)) {
            debouncedGenerate();
          }
        });

        server.watcher.add(dirPath);
      });

      server.httpServer?.once("close", () => {
        watcherHandlers.forEach((handler, dirPath) => {
          server.watcher.unwatch(dirPath);
          server.watcher.off("add", handler);
          server.watcher.off("change", handler);
        });
      });
    },

    buildStart() {
      options.dirs.forEach((dir) => {
        const dirPath = path.resolve(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
          gatherFiles(dirPath, options.excludes);
          generateIndex(dirPath, options.excludes);
        }
      });
    },
  };
}