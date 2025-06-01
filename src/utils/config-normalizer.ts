import { DirConfig, NormalizedDirConfig } from "../types/index.js";

export const normalizeDirConfig = (dirConfig: string | DirConfig): NormalizedDirConfig => {
  if (typeof dirConfig === "string") {
    return {
      dir: dirConfig,
      match: ["**/*"], // match everything by default
      exclude: [], // exclude nothing by default
      run: [], // no run imports by default
    };
  }

  const normalizePatterns = (patterns?: string | string[]): string[] => {
    if (!patterns) return [];
    return Array.isArray(patterns) ? patterns : [patterns];
  };

  return {
    dir: dirConfig.dir,
    match: dirConfig.match ? normalizePatterns(dirConfig.match) : ["**/*"],
    exclude: normalizePatterns(dirConfig.exclude),
    run: normalizePatterns(dirConfig.run),
  };
}; 