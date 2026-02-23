# WXT Migration Plan

This document outlines the step-by-step foolproof plan to migrate the Gemini History Manager extension from a raw Vite/web-ext setup to the modern WXT framework.

## Phase 1: WXT Configuration & Project Restructuring

- [ ] **Install Dependencies:**
  - Install `wxt` and `@wxt-dev/module-vue`.
  - Add Typescript support packages (`typescript`, `vue-tsc`).
- [ ] **Set up TypeScript config:**
  - Create `tsconfig.json` extending from `wxt/tsconfig.json`.
- [ ] **Set up WXT Configuration:**
  - Create `wxt.config.ts` mapping `srcDir: 'src'`, importing Vue plugin, and defining the manifest config (name, version, permissions, icons).
- [ ] **Setup Directory Structure:**
  - Create `src/entrypoints/` directory.
- [ ] **Update `package.json` Scripts:**
  - Replace Vite/web-ext scripts with standard WXT commands (`wxt`, `wxt build`, `wxt zip`).

## Phase 2: Migrating UI Pages (Popup & Dashboard)

- [ ] **Migrate Popup:**
  - Move `src/popup/` to `src/entrypoints/popup/`.
  - Fix HTML `src` links to standard WXT module references (change `<script type="module" src="./main.js">`).
- [ ] **Migrate Dashboard:**
  - Move `src/dashboard/` to `src/entrypoints/dashboard/`.
  - Ensure HTML `src` links point to local ES Modules instead of relying on the old copy paths plugin.
- [ ] **Move public assets:**
  - Move icons to `public/` directory (or map them in `wxt.config.ts`) so they are packaged natively.

## Phase 3: Migrating Background Worker

- [ ] **Create Background Entrypoint:**
  - Move `src/background.js` to `src/entrypoints/background.js`.
- [ ] **Wrap with WXT API:**
  - Wrap the background script with `export default defineBackground(() => { ... })`.
- [ ] **Remove Polfyills:**
  - Remove `<browser-polyfill>` dependencies throughout the extension. WXT automatically handles polyfills.

## Phase 4: Refactoring Content Scripts (The Core Fix)

Currently, content scripts are loaded via IIFE and mutate the `window` object. This needs to be converted to actual ES modules.

- [ ] **Convert Utils & Configurations:**
  - Refactor `src/content-scripts/gemini-tracker/gemini-history-config.js` and others to standard ES `export`.
- [ ] **Refactor Trackers & Detectors:**
  - Convert `gemini-history-dom-observer.js`, `gemini-history-gem-detector.js`, `gemini-history-model-detector.js`, etc., to use `export const` / standard modules.
- [ ] **Create WXT Content Entrypoint:**
  - Create `src/entrypoints/gemini.content.js`:
    ```javascript
    export default defineContentScript({
      matches: ["https://gemini.google.com/*"],
      main() {
        // Initialize logic importing everything natively
      },
    });
    ```
- [ ] **Remove `polyfill-content.js`:**
  - WXT auto-injects standard browser extensions APIs.

## Phase 5: Cleanup & Verification

- [ ] **Delete Old Artifacts:**
  - Remove `vite.config.js`.
  - Remove `manifest-chrome.json` & `manifest-firefox.json`.
  - Remove `web-ext-config-*.cjs`.
  - Remove custom build scripts from `scripts/` that are no longer needed.
  - Delete old polyfill scripts.
- [ ] **Code Quality Assessment:**
  - Run `bunx vue-tsc --noEmit` and confirm all files compile without syntax failures.
- [ ] **Build Check:**
  - Run `bunx wxt build` and `bunx wxt build -b firefox` to verify packaging.
