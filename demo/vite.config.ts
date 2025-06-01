import { defineConfig } from "vite";
import { generateIndexPlugin, LogLevel } from "../dist/index.js";

export default defineConfig({
  plugins: [
    generateIndexPlugin({
      dirs: ["src/components", "src/utils", {
        
      }],
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      debounceMs: 1500,
      logLevel: LogLevel.DEBUG,
      excludes: ["**/*.test.ts", "**/*.spec.ts"],
    }),
  ],
});
