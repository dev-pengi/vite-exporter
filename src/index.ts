import fs from "node:fs";
import path from "node:path";
import { parse } from "@typescript-eslint/parser";
import { HEADER } from "./constants.js";

interface FileExportInfo {
  absolutePath: string;
  relativePath: string;
  baseName: string;
  hasDefault: boolean;
  hasNamed: boolean;
}

const cache = new Map<string, FileExportInfo[]>();
const debounceTimers = new Map<string, NodeJS.Timeout>();
const dirMap = new Map<string, string>();

let DEBUG = true;
let DEBUG_VERBOSE = false;

const debugLog = (...args: any[]) => {
  if (DEBUG) console.log("[Vite Exporter]", ...args);
};

const matchExclusion = (filePath: string, exclusions?: string[]): boolean => {
  if (!exclusions) return false;
  return exclusions.some((pattern) => {
    const regex = new RegExp(pattern.replace(/\*/g, ".*").replace(/\//g, "\\/"));
    return regex.test(filePath);
  });
};

const isValidFile = (filePath: string): boolean => {
  const validExtensions = [".ts", ".tsx"];
  const isIndex = path.basename(filePath) === "index.ts";
  return validExtensions.some((ext) => filePath.endsWith(ext)) && !isIndex;
};

const analyzeExports = (filePath: string): { hasDefault: boolean; hasNamed: boolean } => {
  debugLog(`🔎 Analyzing exports: ${filePath}`);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const jsx = filePath.endsWith(".tsx");
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

    debugLog(
      `📦 Exports for ${path.basename(filePath)} - default: ${hasDefault}, named: ${hasNamed}`
    );

    return { hasDefault, hasNamed };
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);

    return { hasDefault: false, hasNamed: false };
  }
};

const updateCache = (
  dirPath: string,
  filePath: string,
  action: "add" | "change" | "unlink",
  excludes?: string[]
) => {
  if (matchExclusion(filePath, excludes)) return;

  const currentCache = cache.get(dirPath) || [];

  debugLog(`🔄 Cache update (${action}): ${filePath}`);
  if (DEBUG_VERBOSE) console.log("Before update:", currentCache);

  if (action === "unlink") {
    const newCache = currentCache.filter((f) => f.absolutePath !== filePath);
    cache.set(dirPath, newCache);
    return;
  }

  if (!isValidFile(filePath)) return;

  const { hasDefault, hasNamed } = analyzeExports(filePath);
  const relativePath = path.relative(dirPath, filePath).replace(/\\/g, "/");
  const baseName = path.basename(relativePath).replace(/\.[^/.]+$/, "");

  const existingIndex = currentCache.findIndex((f) => f.absolutePath === filePath);

  if (action === "change") {
    if (existingIndex >= 0) {
      const existing = currentCache[existingIndex];
      if (existing.hasDefault === hasDefault && existing.hasNamed === hasNamed) return;
      currentCache[existingIndex] = {
        absolutePath: filePath,
        relativePath,
        baseName,
        hasDefault,
        hasNamed,
      };
    } else {
      currentCache.push({
        absolutePath: filePath,
        relativePath,
        baseName,
        hasDefault,
        hasNamed,
      });
    }
  } else if (action === "add") {
    if (existingIndex === -1) {
      currentCache.push({
        absolutePath: filePath,
        relativePath,
        baseName,
        hasDefault,
        hasNamed,
      });
    }
  }

  cache.set(dirPath, currentCache);

  if (DEBUG_VERBOSE) {
    console.log("After update:", cache.get(dirPath));
    console.log("-----------------------------------");
  }
};

const generateIndexFromCache = (dirPath: string) => {
  debugLog(`📝 Generating index for: ${dirPath}`);
  const fileInfos = cache.get(dirPath) || [];
  debugLog(`📄 ${fileInfos.length} files in cache`);

  if (DEBUG_VERBOSE) {
    console.log("Cache contents:");
    fileInfos.forEach((f, i) =>
      console.log(`${i + 1}. ${f.relativePath} (default:${f.hasDefault}, named:${f.hasNamed})`)
    );
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

  fs.writeFileSync(path.join(dirPath, "index.ts"), HEADER + exports);
  console.log(`Updated index.ts in ${dirPath}`);
};

const scheduleUpdate = (dirPath: string) => {
  debugLog(`⏳ Scheduling update for: ${dirPath}`);
  const existing = debounceTimers.get(dirPath);
  if (existing) debugLog(`♻️ Resetting existing timer for ${dirPath}`);

  if (existing) clearTimeout(existing);
  debounceTimers.set(
    dirPath,
    setTimeout(() => {
      debugLog(`🏁 Executing scheduled update for ${dirPath}`);
      generateIndexFromCache(dirPath);
      debounceTimers.delete(dirPath);
    }, 2000)
  );
};

const processDirectory = (dirPath: string, exclusions?: string[]) => {
  debugLog(`📂 Processing directory: ${dirPath}`);

  const files: string[] = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const currentDir = stack.pop()!;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (matchExclusion(fullPath, exclusions)) continue;

      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && isValidFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  const fileInfos = files.map((file) => {
    const relativePath = path.relative(dirPath, file).replace(/\\/g, "/");
    const baseName = path.basename(relativePath).replace(/\.[^/.]+$/, "");
    const { hasDefault, hasNamed } = analyzeExports(file);
    return { absolutePath: file, relativePath, baseName, hasDefault, hasNamed };
  });

  cache.set(dirPath, fileInfos);
  generateIndexFromCache(dirPath);

  debugLog(`🔍 Found ${files.length} valid files in ${dirPath}`);
};

const isGeneratedIndexFile = (filePath: string, dirMap: Map<string, string>): boolean => {
  console.log(filePath);
  return Array.from(dirMap.keys()).some((resolvedDir) => {
    const generatedIndex = path.join(resolvedDir, "index.ts");
    return filePath === generatedIndex;
  });
};

export type ExporterOptions = {
  dirs: string[];
  excludes?: string[];
  enableDebugging?: boolean;
  enableDebuggingVerbose?: boolean;
};

export const generateIndexPlugin = (options: ExporterOptions): any => {
  DEBUG = options.enableDebugging || false;
  DEBUG_VERBOSE = options.enableDebuggingVerbose || false;

  return {
    name: "vite-exporter-plugin",
    apply: "serve",

    configureServer(server) {
      options.dirs.forEach((dir) => {
        const dirPath = path.resolve(process.cwd(), dir);
        dirMap.set(dirPath, dir);
        processDirectory(dirPath, options.excludes);
        server.watcher.add(dirPath);
      });

      const handleFileEvent = (filePath: string, action: "add" | "change" | "unlink") => {
        debugLog(`📡 File event: ${action} -> ${filePath}`);
        if (isGeneratedIndexFile(filePath, dirMap)) {
          debugLog(`🚫 Ignoring plugin-generated index.ts: ${filePath}`);
          return;
        }

        Array.from(dirMap).forEach(([resolvedDir, originalDir]) => {
          if (filePath.startsWith(resolvedDir)) {
            if (matchExclusion(filePath, options.excludes)) {
              updateCache(resolvedDir, filePath, "unlink", options.excludes);
            } else {
              updateCache(resolvedDir, filePath, action, options.excludes);
            }
            scheduleUpdate(resolvedDir);
          }
        });
      };

      server.watcher.on("change", (file) => handleFileEvent(file, "change"));
      server.watcher.on("add", (file) => handleFileEvent(file, "add"));
      server.watcher.on("unlink", (file) => handleFileEvent(file, "unlink"));
    },

    buildStart() {
      options.dirs.forEach((dir) => {
        const dirPath = path.resolve(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
          processDirectory(dirPath, options.excludes);
        }
      });
    },
  };
};
