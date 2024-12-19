import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import { generateIndexPlugin } from "../dist/plugin";

export default defineConfig({
  plugins: [
    reactRefresh(),
    generateIndexPlugin({
      dirs: [""],
    }),
  ],
});
