import fs from "node:fs";
import path from "node:path";
import { parse } from "@typescript-eslint/parser";
import { HEADER } from "./constants.js";
import * as logger from "./logger.js";
import { LogLevel, getRelativePath } from "./logger.js";

interface FileExportInfo {
  absolutePath: string;
  relativePath: string;
  baseName: string;
  hasDefault: boolean;
  hasNamed: boolean;
}

interface PluginConfig {
  dirs: string[];
  excludes?: string[];
  extensions?: string[];
  debounceMs?: number;
  logLevel?: LogLevel;
  enableTimestamp?: boolean;
}

const cache = new Map<string, FileExportInfo[]>();
const debounceTimers = new Map<string, NodeJS.Timeout>();
const dirMap = new Map<string, string>();

// Default configuration, TODO: add jsdoc to configuration
const DEFAULT_CONFIG: Required<Omit<PluginConfig, "dirs">> = {
  excludes: [],
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  debounceMs: 2000,
  logLevel: LogLevel.INFO,
  enableTimestamp: true,
};

let pluginConfig: Required<PluginConfig>;

const matchExclusion = (filePath: string, exclusions: string[]): boolean => {
  if (!exclusions.length) return false;

  return exclusions.some((pattern) => {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, ".*").replace(/\//g, "\\/"));
      const isMatch = regex.test(filePath);
      if (isMatch) {
        logger.verbose(`🚫 File excluded by pattern "${pattern}": ${getRelativePath(filePath)}`);
      }
      return isMatch;
    } catch (error) {
      logger.warn(`Invalid exclusion pattern "${pattern}": ${error}`);
      return false;
    }
  });
};

const isValidFile = (filePath: string, extensions: string[]): boolean => {
  const isIndex = path.basename(filePath) === "index.ts";
  const hasValidExtension = extensions.some((ext) => filePath.endsWith(ext));

  if (isIndex) {
    logger.verbose(`🚫 Skipping index file: ${getRelativePath(filePath)}`);
    return false;
  }

  if (!hasValidExtension) {
    logger.verbose(`🚫 Invalid extension for: ${getRelativePath(filePath)}`);
    return false;
  }

  return true;
};

const analyzeExports = (filePath: string): { hasDefault: boolean; hasNamed: boolean } => {
  logger.verbose(`🔎 Analyzing exports: ${getRelativePath(filePath)}`);

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
    logger.error(`Failed to analyze exports in ${getRelativePath(filePath)}: ${error}`);
    return { hasDefault: false, hasNamed: false };
  }
};

const updateCache = (dirPath: string, filePath: string, action: "add" | "change" | "unlink") => {
  if (matchExclusion(filePath, pluginConfig.excludes)) {
    return;
  }

  const currentCache = cache.get(dirPath) || [];
  logger.cacheUpdate(action, filePath, currentCache.length);

  if (action === "unlink") {
    const newCache = currentCache.filter((f) => f.absolutePath !== filePath);
    cache.set(dirPath, newCache);
    logger.verbose(`🗑️ Removed from cache: ${getRelativePath(filePath)}`);
    return;
  }

  if (!isValidFile(filePath, pluginConfig.extensions)) {
    return;
  }

  try {
    const { hasDefault, hasNamed } = analyzeExports(filePath);
    const relativePath = path.relative(dirPath, filePath).replace(/\\/g, "/");
    const baseName = path.basename(relativePath).replace(/\.[^/.]+$/, "");

    const existingIndex = currentCache.findIndex((f) => f.absolutePath === filePath);
    const fileInfo: FileExportInfo = {
      absolutePath: filePath,
      relativePath,
      baseName,
      hasDefault,
      hasNamed,
    };

    if (action === "change") {
      if (existingIndex >= 0) {
        const existing = currentCache[existingIndex];
        if (existing.hasDefault === hasDefault && existing.hasNamed === hasNamed) {
          logger.verbose(`⚡ No export changes detected for: ${getRelativePath(filePath)}`);
          return;
        }
        currentCache[existingIndex] = fileInfo;
        logger.verbose(`📝 Updated cache entry: ${getRelativePath(filePath)}`);
      } else {
        currentCache.push(fileInfo);
        logger.verbose(`➕ Added new cache entry: ${getRelativePath(filePath)}`);
      }
    } else if (action === "add") {
      if (existingIndex === -1) {
        currentCache.push(fileInfo);
        logger.verbose(`➕ Added to cache: ${getRelativePath(filePath)}`);
      }
    }

    cache.set(dirPath, currentCache);
  } catch (error) {
    logger.error(`Failed to update cache for ${getRelativePath(filePath)}: ${error}`);
  }
};

const generateIndexFromCache = (dirPath: string) => {
  try {
    const fileInfos = cache.get(dirPath) || [];
    logger.verbose(
      `📝 Generating index for: ${getRelativePath(dirPath)} with ${fileInfos.length} files`
    );

    if (fileInfos.length === 0) {
      logger.warn(`No valid files found in cache for: ${getRelativePath(dirPath)}`);
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
    logger.error(`Failed to generate index for ${getRelativePath(dirPath)}: ${error}`);
  }
};

const scheduleUpdate = (dirPath: string) => {
  const existing = debounceTimers.get(dirPath);

  if (existing) {
    clearTimeout(existing);
    logger.verbose(`♻️ Resetting existing timer for ${getRelativePath(dirPath)}`);
  }

  logger.debounceScheduled(dirPath, pluginConfig.debounceMs);

  debounceTimers.set(
    dirPath,
    setTimeout(() => {
      logger.debounceExecuted(dirPath);
      generateIndexFromCache(dirPath);
      debounceTimers.delete(dirPath);
    }, pluginConfig.debounceMs)
  );
};

const processDirectory = (dirPath: string) => {
  logger.verbose(`📂 Processing directory: ${getRelativePath(dirPath)}`);

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

        if (matchExclusion(fullPath, pluginConfig.excludes)) {
          continue;
        }

        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile() && isValidFile(fullPath, pluginConfig.extensions)) {
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
    logger.directoryProcessing(dirPath, files.length);
  } catch (error) {
    logger.error(`Failed to process directory ${getRelativePath(dirPath)}: ${error}`);
  }
};

const isGeneratedIndexFile = (filePath: string, dirMap: Map<string, string>): boolean => {
  return Array.from(dirMap.keys()).some((resolvedDir) => {
    const generatedIndex = path.join(resolvedDir, "index.ts");
    return filePath === generatedIndex;
  });
};

export type ExporterOptions = {
  dirs: string[];
  excludes?: string[];
  extensions?: string[];
  debounceMs?: number;
  logLevel?: LogLevel;
  enableTimestamp?: boolean;
  // Legacy support
  enableDebugging?: boolean;
  enableDebuggingVerbose?: boolean;
};

export const generateIndexPlugin = (options: ExporterOptions): any => {
  // Handle legacy options
  let logLevel = options.logLevel ?? DEFAULT_CONFIG.logLevel;
  if (options.enableDebuggingVerbose) {
    logLevel = LogLevel.VERBOSE;
  } else if (options.enableDebugging) {
    logLevel = LogLevel.DEBUG;
  }

  // Merge with defaults
  pluginConfig = {
    ...DEFAULT_CONFIG,
    ...options,
    logLevel,
  };

  // Configure logger
  logger.setLogLevel(pluginConfig.logLevel);

  // Show configuration summary
  logger.configSummary(pluginConfig);

  return {
    name: "vite-exporter-plugin",
    apply: "serve",

    configureServer(server) {
      try {
        pluginConfig.dirs.forEach((dir) => {
          const dirPath = path.resolve(process.cwd(), dir);

          if (!fs.existsSync(dirPath)) {
            logger.warn(`Directory does not exist: ${getRelativePath(dirPath)}`);
            return;
          }

          dirMap.set(dirPath, dir);
          processDirectory(dirPath);
          server.watcher.add(dirPath);
          logger.debug(`👀 Watching directory: ${getRelativePath(dirPath)}`);
        });

        const handleFileEvent = (filePath: string, action: "add" | "change" | "unlink") => {
          logger.fileEvent(action, filePath);

          if (isGeneratedIndexFile(filePath, dirMap)) {
            logger.verbose(`🚫 Ignoring plugin-generated index.ts: ${getRelativePath(filePath)}`);
            return;
          }

          Array.from(dirMap).forEach(([resolvedDir, originalDir]) => {
            if (filePath.startsWith(resolvedDir)) {
              if (matchExclusion(filePath, pluginConfig.excludes)) {
                updateCache(resolvedDir, filePath, "unlink");
              } else {
                updateCache(resolvedDir, filePath, action);
              }
              scheduleUpdate(resolvedDir);
            }
          });
        };

        server.watcher.on("change", (file) => handleFileEvent(file, "change"));
        server.watcher.on("add", (file) => handleFileEvent(file, "add"));
        server.watcher.on("unlink", (file) => handleFileEvent(file, "unlink"));

        logger.success("🎉 File watcher configured successfully");
      } catch (error) {
        logger.error(`Failed to configure server: ${error}`);
      }
    },

    buildStart() {
      try {
        logger.info("🏗️ Build started - processing directories...");

        pluginConfig.dirs.forEach((dir) => {
          const dirPath = path.resolve(process.cwd(), dir);
          if (fs.existsSync(dirPath)) {
            processDirectory(dirPath);
          } else {
            logger.warn(`Build: Directory does not exist: ${getRelativePath(dirPath)}`);
          }
        });

        logger.success("✅ Build processing completed");
      } catch (error) {
        logger.error(`Build failed: ${error}`);
      }
    },
  };
};

// Export logger and LogLevel for external use
export { logger, LogLevel };
