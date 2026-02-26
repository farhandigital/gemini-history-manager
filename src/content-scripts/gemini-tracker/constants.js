/**
 * MODEL_NAMES
 * Known model names that might appear in the Gemini UI.
 * Keys are matching prefixes; values are canonical names stored in history.
 * As of Nov 2025, Gemini simplified model names to "Fast" and "Thinking".
 */
export const MODEL_NAMES = {
  // New simplified model names (Nov 2025+)
  Fast: "Fast",
  Thinking: "Thinking",
  // Legacy model names (kept for backwards compatibility)
  "2.0 Flash": "2.0 Flash",
  "2.5 Flash": "2.5 Flash",
  "2.5 Pro": "2.5 Pro",
  Personalization: "Personalization",
};

/**
 * TOOL_NAMES
 * Known tools that can be activated in the Gemini toolbox.
 * Tools run on top of a model (e.g. Deep Research, Image generation).
 *
 * Keys are plain JS strings used as substring match targets.
 * The case-insensitive matching logic lives in the caller — see
 * ModelDetector.normalizeTool() in model-detector.js.
 * Values are the canonical tool names stored in history.
 */
export const TOOL_NAMES = {
  "Deep Research": "Deep Research",
  video: "Video", // Matches "Create videos", "Generate videos", "Video", etc.
  image: "Image", // Matches "Create images", "Generate images", "Image", etc.
  Canvas: "Canvas",
  "Guided Learning": "Guided Learning",
  "Dynamic view": "Dynamic view",
};

/**
 * BROWSER_ACTIONS
 * Message action identifiers used with browser.runtime.sendMessage,
 * shared between the content script and the background script.
 */
export const BROWSER_ACTIONS = {
  UPDATE_HISTORY_COUNT: "updateHistoryCount",
};

/**
 * GEMINI_PLANS
 * Known Gemini subscription plan tiers as detected from the UI.
 */
export const GEMINI_PLANS = {
  PRO: "Pro",
  FREE: "Free",
};

/**
 * ERROR_PATTERNS
 * Lowercase substrings used to identify Gemini crash/error messages in snack bars.
 */
export const ERROR_PATTERNS = ["went wrong", "try again"];

/**
 * STATUS_TYPES
 * Valid type values for the StatusIndicator. Each value is also the CSS class
 * applied to the indicator element that controls its icon and colour theme.
 *
 * CROSS-REFERENCE: If you add a new status type here, make sure to add its
 * corresponding CSS rules for the icon and style in `status-indicator.js`.
 */
export const STATUS_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  LOADING: "loading",
};
