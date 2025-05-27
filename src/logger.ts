import chalk from "chalk";
import path from "node:path";

export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5,
}

let currentLogLevel = LogLevel.INFO;
export const getRelativePath = (filePath: string): string => {
  return path.relative(process.cwd(), filePath);
};

export const setLogLevel = (level: LogLevel): void => {
  currentLogLevel = level;
};

const formatMessage = (level: string, message: string): string => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = chalk.bold.magenta(`[Vite Exporter]`);
  return `${timestamp} ${prefix} ${level.padEnd(7)} ${message}`;
};

export const error = (message: string): void => {
  if (currentLogLevel >= LogLevel.ERROR) {
    console.error(formatMessage(chalk.red.bold("ERROR"), message));
  }
};

export const warn = (message: string): void => {
  if (currentLogLevel >= LogLevel.WARN) {
    console.warn(formatMessage(chalk.yellow.bold("WARN"), message));
  }
};

export const info = (message: string): void => {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(formatMessage(chalk.blue.bold("INFO"), message));
  }
};

export const success = (message: string): void => {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log(formatMessage(chalk.green.bold("SUCCESS"), message));
  }
};

export const debug = (message: string): void => {
  if (currentLogLevel >= LogLevel.DEBUG) {
    console.log(formatMessage(chalk.cyan.bold("DEBUG"), message));
  }
};

export const verbose = (message: string): void => {
  if (currentLogLevel >= LogLevel.VERBOSE) {
    console.log(formatMessage(chalk.gray.bold("VERBOSE"), message));
  }
};

// Special formatted methods for specific use cases
export const fileEvent = (action: string, filePath: string): void => {
  const actionColor =
    action === "add" ? chalk.green : action === "change" ? chalk.yellow : chalk.red;
  const icon = action === "add" ? "➕" : action === "change" ? "📝" : "🗑️";
  debug(`${icon} File ${actionColor.bold(action.toUpperCase())}: ${getRelativePath(filePath)}`);
};

export const cacheUpdate = (action: string, filePath: string, count?: number): void => {
  const icon = "🔄";
  const countText = count !== undefined ? chalk.dim(` (${count} files in cache)`) : "";
  verbose(
    `${icon} Cache ${chalk.cyan.bold(action.toUpperCase())}: ${getRelativePath(
      filePath
    )}${countText}`
  );
};

export const exportAnalysis = (filePath: string, hasDefault: boolean, hasNamed: boolean): void => {
  const defaultIcon = hasDefault ? chalk.green("✓") : chalk.red("✗");
  const namedIcon = hasNamed ? chalk.green("✓") : chalk.red("✗");
  verbose(`📦 ${getRelativePath(filePath)} → Default: ${defaultIcon} Named: ${namedIcon}`);
};

export const directoryProcessing = (dirPath: string, fileCount: number): void => {
  info(
    `📂 Processing ${getRelativePath(dirPath)} → Found ${chalk.bold.green(fileCount)} valid files`
  );
};

export const indexGeneration = (dirPath: string, fileCount: number): void => {
  success(
    `📝 Generated index.ts in ${getRelativePath(dirPath)} with ${chalk.bold.green(
      fileCount
    )} exports`
  );
};

export const debounceScheduled = (dirPath: string, delay: number): void => {
  debug(
    `⏳ Scheduled update for ${getRelativePath(dirPath)} in ${chalk.bold.yellow(`${delay}ms`)}`
  );
};

export const debounceExecuted = (dirPath: string): void => {
  debug(`🏁 Executing scheduled update for ${getRelativePath(dirPath)}`);
};

export const configSummary = (config: any): void => {
  info("🚀 Plugin initialized with configuration:");
  console.log(chalk.dim("┌─ Configuration"));
  console.log(chalk.dim("│ ") + chalk.cyan("Directories: ") + chalk.white(config.dirs.join(", ")));
  console.log(
    chalk.dim("│ ") + chalk.cyan("Extensions: ") + chalk.white(config.extensions.join(", "))
  );
  console.log(chalk.dim("│ ") + chalk.cyan("Debounce: ") + chalk.white(`${config.debounceMs}ms`));
  console.log(chalk.dim("│ ") + chalk.cyan("Log Level: ") + chalk.white(LogLevel[config.logLevel]));
  if (config.excludes?.length) {
    console.log(
      chalk.dim("│ ") + chalk.cyan("Excludes: ") + chalk.white(config.excludes.join(", "))
    );
  }
  console.log(chalk.dim("└─"));
};
