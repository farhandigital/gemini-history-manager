import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  srcDir: "src",
  manifest: {
    name: "Gemini History Manager",
    description:
      "Track and manage your Google Gemini chat history with advanced visualization and organization tools.",
    permissions: ["storage", "unlimitedStorage"],
  },
});
