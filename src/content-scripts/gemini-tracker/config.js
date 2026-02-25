/**
 * CONFIG
 * Runtime configuration for the Gemini tracker content script.
 * These values describe how the extension behaves and identifies stored data.
 *
 * Domain enums (model names, tool names, plan tiers, etc.) live in constants.js.
 */
export const CONFIG = {
  STORAGE_KEY: "geminiChatHistory",
  BASE_URL: "https://gemini.google.com/app",
  GEM_BASE_URL: "https://gemini.google.com/gem",
  // Schema version for history entries — increment when data structure changes.
  // v1 (implicit): Original schema without _v field (pre-Nov 2025)
  // v2: Added tool field, separated tools from models (Nov 2025)
  SCHEMA_VERSION: 2,
};
