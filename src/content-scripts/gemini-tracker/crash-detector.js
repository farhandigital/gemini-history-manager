import { STATE } from "./state.js";
import { Utils } from "./utils.js";
import { StatusIndicator } from "./status-indicator.js";
import { DomObserver } from "./observer/dom-observer.js";
import { ERROR_PATTERNS } from "./constants.js";
import { SELECTORS } from "./selectors.js";

export const CrashDetector = {
  // Track initialization state
  isInitialized: false,
  crashObserver: null,
  containerObserver: null,

  /**
   * Initializes the crash detector system.
   * Sets up observers to watch for Gemini error messages and handle crashes gracefully.
   *
   * @returns {void}
   */
  init: function () {
    // Prevent duplicate initialization
    if (this.isInitialized) {
      console.log(`${Utils.getPrefix()} Crash detector already initialized, skipping...`);
      return;
    }

    console.log(`${Utils.getPrefix()} Setting up Gemini crash detector...`);

    // Find or wait for the overlay container
    const overlayContainer = document.querySelector(SELECTORS.OVERLAY_CONTAINER);

    if (!overlayContainer) {
      console.log(
        `${Utils.getPrefix()} Overlay container not found yet, will set up observer when it appears`
      );
      this.waitForOverlayContainer();
      return;
    }

    this.setupCrashObserver(overlayContainer);
  },

  /**
   * Waits for the overlay container to appear in the DOM.
   * Sets up a temporary observer that watches for the overlay container creation.
   * Stored on `this.containerObserver` so cleanup() can disconnect it if the
   * overlay never appears (preventing a dangling observer on document.body).
   *
   * @returns {void}
   */
  waitForOverlayContainer: function () {
    // Mark as initialized immediately so repeated init() calls before the
    // overlay appears do not stack multiple containerObservers on document.body.
    this.isInitialized = true;

    // Disconnect any leftover containerObserver from a previous call
    if (this.containerObserver) {
      this.containerObserver.disconnect();
      this.containerObserver = null;
    }

    this.containerObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches(SELECTORS.OVERLAY_CONTAINER)) {
            console.log(`${Utils.getPrefix()} Overlay container appeared, setting up crash detector`);
            this.containerObserver.disconnect();
            this.containerObserver = null;
            this.setupCrashObserver(node);
            return;
          }
        }
      }
    });

    this.containerObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },

  /**
   * Sets up the actual crash observer on the overlay container.
   * Watches for simple-snack-bar elements and checks for error messages.
   *
   * @param {Element} overlayContainer - The overlay container element to observe
   * @returns {void}
   */
  setupCrashObserver: function (overlayContainer) {
    console.log(`${Utils.getPrefix()} Setting up crash observer on overlay container`);

    // Clean up any existing observer
    if (this.crashObserver) {
      this.crashObserver.disconnect();
    }

    this.crashObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName?.toLowerCase() === SELECTORS.SNACK_BAR_TAG
          ) {
            this.handleSnackBarDetected(node);
          }
        }
      }
    });

    this.crashObserver.observe(overlayContainer, {
      childList: true,
      subtree: true,
    });

    this.isInitialized = true;
    console.log(`${Utils.getPrefix()} Crash detector is now active`);
  },

  /**
   * Handles the detection of a snack bar element.
   * Checks for error messages and triggers crash handling if needed.
   *
   * @param {Element} snackBarElement - The detected snack bar element
   * @returns {void}
   */
  handleSnackBarDetected: function (snackBarElement) {
    console.log(`${Utils.getPrefix()} Detected simple-snack-bar, checking for error messages`);

    // Check if the snack bar contains error text
    const snackBarText = snackBarElement.textContent?.toLowerCase() || "";

    if (this.isErrorMessage(snackBarText)) {
      this.handleCrashDetected(snackBarElement.textContent);
    }
  },

  /**
   * Determines if the given text indicates a Gemini error/crash.
   * Checks for known error patterns in snack bar messages.
   *
   * @param {string} text - The text content to check (should be lowercase)
   * @returns {boolean} - True if the text indicates an error, false otherwise
   */
  isErrorMessage: function (text) {
    return ERROR_PATTERNS.some((pattern) => text.includes(pattern));
  },

  /**
   * Handles the detected Gemini crash.
   * Performs cleanup and shows error status to the user.
   * Only handles crashes when a new chat is pending.
   *
   * @param {string} errorMessage - The original error message from the snack bar
   * @returns {void}
   */
  handleCrashDetected: function (errorMessage) {
    // Only handle crashes when a new chat is pending
    if (!STATE.isNewChatPending) {
      console.log(`${Utils.getPrefix()} Gemini error detected but no new chat is pending, ignoring.`);
      return;
    }

    console.warn(`${Utils.getPrefix()} Gemini crash detected! Snack bar text: "${errorMessage}"`);

    // Perform cleanup and show error status
    DomObserver.completeCleanup();
    StatusIndicator.show("Gemini crashed. Tracking canceled.", "error", 5000);

    // Log the crash for debugging
    console.error(`${Utils.getPrefix()} Gemini crash detected and handled. Error message: "${errorMessage}"`);
  },

  /**
   * Cleans up the crash detector by disconnecting observers and resetting state.
   * Used when the page context changes or during complete cleanup.
   *
   * @returns {void}
   */
  cleanup: function () {
    if (this.containerObserver) {
      console.log(`${Utils.getPrefix()} Cleaning up crash detector container observer`);
      this.containerObserver.disconnect();
      this.containerObserver = null;
    }
    if (this.crashObserver) {
      console.log(`${Utils.getPrefix()} Cleaning up crash detector observer`);
      this.crashObserver.disconnect();
      this.crashObserver = null;
    }
    this.isInitialized = false;
  },
};
