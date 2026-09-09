import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("react-router-dom")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/exceljs")) return "exceljs";
        },
      },
    },
  },
});
