import { generateIndexFromCache } from "./index-generator.js";
import * as logger from "../utils/logger.js";

const debounceTimers = new Map<string, NodeJS.Timeout>();

export const scheduleUpdate = (dirPath: string, debounceMs: number) => {
  const existing = debounceTimers.get(dirPath);

  if (existing) {
    clearTimeout(existing);
    logger.verbose(`♻️ Resetting existing timer for ${logger.getRelativePath(dirPath)}`);
  }

  logger.debounceScheduled(dirPath, debounceMs);

  debounceTimers.set(
    dirPath,
    setTimeout(() => {
      logger.debounceExecuted(dirPath);
      generateIndexFromCache(dirPath);
      debounceTimers.delete(dirPath);
    }, debounceMs),
  );
};
