import { defineConfig } from "vite";
import { generateIndexPlugin } from "../dist/index.js";

export default defineConfig({
  plugins: [
    generateIndexPlugin({
      dirs: ["src/components", "src/utils"],
    }),
  ],
});
