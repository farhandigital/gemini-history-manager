import { STATE } from "./state.js";
import { Utils } from "./utils.js";
import { StatusIndicator } from "./status-indicator.js";
import { DomObserver } from "./observer/dom-observer.js";
import { ERROR_PATTERNS, STATUS_TYPES } from "./constants.js";
import { SELECTORS } from "./selectors.js";

export const CrashDetector = {
  isInitialized: false,
  crashObserver: null as MutationObserver | null,
  containerObserver: null as MutationObserver | null,

  /**
   * Initializes the crash detector system.
   * Sets up observers to watch for Gemini error messages and handle crashes gracefully.
   */
  init(): void {
    if (this.isInitialized) {
      console.log(`${Utils.getPrefix()} Crash detector already initialized, skipping...`);
      return;
    }

    console.log(`${Utils.getPrefix()} Setting up Gemini crash detector...`);

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
   */
  waitForOverlayContainer(): void {
    // Mark as initialized immediately so repeated init() calls before the
    // overlay appears do not stack multiple containerObservers on document.body.
    this.isInitialized = true;

    if (this.containerObserver) {
      this.containerObserver.disconnect();
      this.containerObserver = null;
    }

    this.containerObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.matches(SELECTORS.OVERLAY_CONTAINER)) {
              console.log(`${Utils.getPrefix()} Overlay container appeared, setting up crash detector`);
              this.containerObserver?.disconnect();
              this.containerObserver = null;
              this.setupCrashObserver(el);
              return;
            }
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
   * @param overlayContainer - The overlay container element to observe
   */
  setupCrashObserver(overlayContainer: Element): void {
    console.log(`${Utils.getPrefix()} Setting up crash observer on overlay container`);

    if (this.crashObserver) {
      this.crashObserver.disconnect();
    }

    this.crashObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.tagName.toLowerCase() === SELECTORS.SNACK_BAR_TAG) {
              this.handleSnackBarDetected(el);
            }
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
   * @param snackBarElement - The detected snack bar element
   */
  handleSnackBarDetected(snackBarElement: Element): void {
    console.log(`${Utils.getPrefix()} Detected simple-snack-bar, checking for error messages`);

    const snackBarText = snackBarElement.textContent?.toLowerCase() ?? "";

    if (this.isErrorMessage(snackBarText)) {
      this.handleCrashDetected(snackBarElement.textContent ?? "");
    }
  },

  /**
   * Determines if the given text indicates a Gemini error/crash.
   *
   * @param text - The text content to check (should be lowercase)
   * @returns True if the text indicates an error, false otherwise
   */
  isErrorMessage(text: string): boolean {
    return ERROR_PATTERNS.some((pattern) => text.includes(pattern));
  },

  /**
   * Handles the detected Gemini crash.
   * Performs cleanup and shows error status to the user.
   * Only handles crashes when a new chat is pending.
   *
   * @param errorMessage - The original error message from the snack bar
   */
  handleCrashDetected(errorMessage: string): void {
    if (!STATE.isNewChatPending) {
      console.log(`${Utils.getPrefix()} Gemini error detected but no new chat is pending, ignoring.`);
      return;
    }

    console.warn(`${Utils.getPrefix()} Gemini crash detected! Snack bar text: "${errorMessage}"`);

    DomObserver.completeCleanup();
    StatusIndicator.show("Gemini crashed. Tracking canceled.", STATUS_TYPES.ERROR, 5000);

    console.error(`${Utils.getPrefix()} Gemini crash detected and handled. Error message: "${errorMessage}"`);
  },

  /**
   * Cleans up the crash detector by disconnecting observers and resetting state.
   * Used when the page context changes or during complete cleanup.
   */
  cleanup(): void {
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
