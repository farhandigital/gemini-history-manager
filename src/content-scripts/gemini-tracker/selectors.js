/**
 * SELECTORS
 * All CSS selector strings and class/ID names used to query the Gemini UI DOM.
 * Centralised here so that Gemini UI structure changes only require edits in one place.
 *
 * Convention:
 *  - Strings intended for querySelector / querySelectorAll include the full selector syntax (e.g. ".foo", "#bar").
 *  - Strings used directly with classList or as element IDs/classNames are bare names (no leading dot or #).
 *  - Tag name strings (for tagName comparisons) are lowercase bare names.
 */
export const SELECTORS = {
  // ── Crash detection ────────────────────────────────────────────────────────
  OVERLAY_CONTAINER: ".cdk-overlay-container",
  SNACK_BAR_TAG: "simple-snack-bar", // lowercase tag name for tagName comparison

  // ── Send button ────────────────────────────────────────────────────────────
  SEND_BUTTON:
    'button:has(mat-icon[data-mat-icon-name="send"]), button.send-button, button[aria-label*="Send"], button[data-test-id="send-button"]',

  // ── Stop button / trailing actions ────────────────────────────────────────
  TRAILING_ACTIONS_WRAPPER: ".trailing-actions-wrapper",
  STOP_BUTTON: "button.send-button.stop",
  STOP_ICON: ".stop-icon",

  // ── Conversation list ──────────────────────────────────────────────────────
  CONVERSATION_LIST: 'conversations-list[data-test-id="all-conversations"]',
  CONVERSATION_ITEMS_CONTAINER: ".conversation-items-container",
  PENDING_CONVERSATION: '[data-test-id="pending-conversation"]',
  CONVERSATION_ITEM: 'a[data-test-id="conversation"]',
  CONVERSATION_TITLE: ".conversation-title",

  // ── Input area ─────────────────────────────────────────────────────────────
  PROMPT_INPUT: "rich-textarea .ql-editor",
  ATTACHED_FILE: 'uploader-file-preview-container .file-preview [data-test-id="file-name"]',

  // ── Account detection ──────────────────────────────────────────────────────
  ACCOUNT_LINK: 'a[href*="accounts.google.com"]',
  PROFILE_IMAGE: "img.gbii, img.gb_P",
  ACCOUNT_CONTAINER: ".gb_z, .gb_D, .gb_Za",
  // Broader fallback selectors used when the primary account link isn't found
  ACCOUNT_GOOGLE_AREA: '[aria-label*="Google Account" i]',
  ACCOUNT_GOOGLE_AREA_CLASS: '.gb_B[aria-label*="Google Account" i]',
  ACCOUNT_GOOGLE_BAR: '[class*="gb_"][aria-label*="account" i]',
  ACCOUNT_WITH_IMAGE: '[aria-label*="account" i]:has(img)',

  // ── Google logo SVG detection (used by plan detection) ─────────────────────
  // These intentionally omit the `i` flag — SVG search is inside an already-
  // narrowed account area element, so case-insensitive matching isn't needed.
  GOOGLE_ACCOUNT_AREA: '[aria-label*="Google Account"]',
  GOOGLE_BAR_CLASS: ".gb_B",
  GOOGLE_BAR_ANY_CLASS: '[class*="gb_"]',

  // ── Plan detection ─────────────────────────────────────────────────────────
  PLAN_PRO_PILL: "div.icon-buttons-container.pillbox button.gds-pillbox-button",
  PLAN_UPSELL_BUTTON: 'upsell-button button[data-test-id="bard-upsell-menu-button"]',
  PLAN_UPGRADE_BUTTON_ARIA: 'button[aria-label*="upgrade" i]',
  PLAN_UPSELL_COMPONENT: '[data-test-id*="upsell"] button',

  // ── Model switcher ─────────────────────────────────────────────────────────
  MODEL_INPUT_AREA_SWITCHER: "bard-mode-switcher .logo-pill-label-container.input-area-switch-label span",
  MODEL_MODE_SWITCHER_LABEL: "bard-mode-switcher .logo-pill-label-container span:first-child",
  MODEL_LEGACY_BUTTON: "button.gds-mode-switch-button.mat-mdc-button-base .logo-pill-label-container span",
  MODEL_DATA_TEST_ID: 'bard-mode-switcher [data-test-id="attribution-text"] span',
  MODEL_FALLBACK: ".current-mode-title span",

  // ── Toolbox ────────────────────────────────────────────────────────────────
  TOOLBOX_DRAWER: "toolbox-drawer",
  TOOLBOX_DESELECT_BUTTON: "button.toolbox-drawer-item-deselect-button",
  TOOLBOX_DESELECT_LABEL: ".toolbox-drawer-item-deselect-button-label",
  TOOLBOX_ITEM_BUTTON_ACTIVE: 'button.toolbox-drawer-item-button.is-selected[aria-pressed="true"]',
  TOOLBOX_BUTTON_LABEL: ".toolbox-drawer-button-label",
  TOOLBOX_DEEP_RESEARCH_ICON: 'mat-icon[data-mat-icon-name="travel_explore"]',
  TOOLBOX_VIDEO_ICON: 'mat-icon[data-mat-icon-name="movie"]',

  // ── Status indicator ───────────────────────────────────────────────────────
  // Bare class/ID names (no dot/hash) — used with classList and element.id.
  //
  // STATUS_INDICATOR_ID and STATUS_INDICATOR_CLASS intentionally hold the same
  // string: one is used for element.id assignment, the other for element.className.
  // Do not merge them — they serve different DOM APIs and must remain separate.
  //
  // Note: the CSS block in status-indicator.js hardcodes these same class names
  // directly in the template literal for readability. If you rename any of the
  // constants below, remember to update the CSS template in status-indicator.js
  // as well (search for the same string).
  STATUS_INDICATOR_ID: "gemini-history-status",
  STATUS_INDICATOR_CLASS: "gemini-history-status",
  STATUS_INDICATOR_HIDDEN: "hidden",
  STATUS_ICON_ELEMENT: "status-icon",
  STATUS_MESSAGE_ELEMENT: "status-message",
};

/**
 * ARIA_LABELS
 * Known aria-label values used to identify specific Gemini UI elements.
 */
export const ARIA_LABELS = {
  STOP_RESPONSE: "Stop response",
};
