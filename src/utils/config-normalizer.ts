import { DirConfig, NormalizedDirConfig, ProcessingMode } from "../types/index.js";

export const normalizeDirConfig = (
  dirConfig: string | DirConfig,
  globalMode: ProcessingMode = ProcessingMode.ExportsOnly,
): NormalizedDirConfig => {
  if (typeof dirConfig === "string") {
    return {
      dir: dirConfig,
      match: ["**/*"], // match everything by default
      exclude: [], // exclude nothing by default
      mode: globalMode, // use global default mode
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
    mode: dirConfig.mode ?? globalMode, // use directory-specific mode or global default
  };
};
