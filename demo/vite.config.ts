import { defineConfig } from "vite";
import { generateIndexPlugin, LogLevel, ProcessingMode } from "../dist/index.js";

export default defineConfig({
  plugins: [
    generateIndexPlugin({
      mode: ProcessingMode.ExportsOnly, // Global default
      dirs: [
        // Simple string format - uses global mode
        "src/utils",

        // Advanced configuration with per-directory modes
        {
          dir: "src/components",
          exclude: ["**/*.test.ts", "**/*.spec.ts"],
          mode: ProcessingMode.ExportsOnly,
        },

        // Example of exports and imports mode for API/services
        {
          dir: "src/api",
          mode: ProcessingMode.ExportsAndImports,
        },
      ],
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      debounceMs: 1500,
      logLevel: LogLevel.DEBUG,
    }),
  ],
});
