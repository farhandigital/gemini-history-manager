import { init } from "../content-scripts/gemini-tracker/gemini-history-main.js";

export default defineContentScript({
  matches: ["https://gemini.google.com/*"],
  main(ctx) {
    init(ctx);
  },
});
