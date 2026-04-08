import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";


export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [react(), tsconfigPaths()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
