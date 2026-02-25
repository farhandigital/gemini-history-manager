import LogConfig from "@/lib/logConfig.js";
import { Utils } from "../content-scripts/gemini-tracker/gemini-history-utils.js";
import { STATE } from "../content-scripts/gemini-tracker/gemini-history-state.js";
import { StatusIndicator } from "../content-scripts/gemini-tracker/gemini-history-status-indicator.js";
import { DomObserver } from "../content-scripts/gemini-tracker/observer/gemini-history-dom-observer.js";
import { GemDetector } from "../content-scripts/gemini-tracker/gemini-history-gem-detector.js";
import { EventHandlers } from "../content-scripts/gemini-tracker/gemini-history-event-handlers.js";
import { CrashDetector } from "../content-scripts/gemini-tracker/gemini-history-crash-detector.js";

/**
 * Re-initializes observers after they have been cleaned up.
 * Used when the page becomes visible again after being hidden.
 *
 * @returns {void}
 */
function reinitializeObservers() {
  console.log(`${Utils.getPrefix()} Re-initializing observers after page became visible...`);

  // Re-initialize GemDetector for current URL
  if (GemDetector) {
    const url = window.location.href;
    if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
      console.log(`${Utils.getPrefix()} Re-detecting Gem information for current URL...`);
      GemDetector.reset();
    }
  }

  // Check if we're currently tracking a chat
  const isTrackingChat = STATE && STATE.isNewChatPending;

  // Handle status indicator based on tracking state
  if (isTrackingChat) {
    console.log(`${Utils.getPrefix()} Returning during active chat tracking, restoring status indicator`);
    StatusIndicator.show("Tracking new chat...", "info");
  } else {
    // Re-establish conversation list watcher with loading status
    StatusIndicator.show("Reconnecting to Gemini recent chats...", "loading", 0);
  }

  DomObserver.watchForConversationList(() => {
    console.log(
      `${Utils.getPrefix()} Conversation list re-detected after page visibility change. Manager fully active.`
    );

    // Only show "active" status if we're not tracking a chat
    if (!isTrackingChat) {
      StatusIndicator.show("Gemini History Manager active", "success");
    }
  });

  // Re-initialize crash detector to ensure it's active after page visibility changes
  CrashDetector.init();
}

export default defineContentScript({
  matches: ["https://gemini.google.com/*"],

  main(ctx) {
    console.log(`${Utils.getPrefix()} Initializing Gemini History Manager...`);

    // Initialize status indicator
    StatusIndicator.init();

    // ── Named handler references ─────────────────────────────────────────────
    // All listeners are stored so ctx.onInvalidated() can remove every one of
    // them, preventing duplicate handlers after extension reload/update.

    /**
     * Listens for storage events to detect logging configuration changes.
     * Invalidates the logging configuration cache when changes are detected.
     *
     * @param {StorageEvent} event - The storage event.
     * @returns {void}
     */
    const storageHandler = (event) => {
      if (event.key === LogConfig.CONFIG_STORAGE_KEY) {
        console.debug(
          `${Utils.getPrefix()} [ContentScript] Logging configuration changed in localStorage, invalidating cache`
        );
        LogConfig.invalidateConfigCache();
      }
    };
    window.addEventListener("storage", storageHandler);

    // Show immediate status message that persists until conversation list is found (or timeout)
    StatusIndicator.show("Waiting for Gemini recent chats to appear...", "loading", 0);

    // Initialize GemDetector and check for Gem information
    if (GemDetector) {
      const url = window.location.href;
      if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
        console.log(`${Utils.getPrefix()} Detected Gem URL. Starting Gem detection...`);
        GemDetector.reset();
      }
    }

    // Monitor URL changes to detect navigation to/from Gem pages.
    // Stored so we can disconnect it in ctx.onInvalidated().
    let lastUrl = window.location.href;
    const urlChangeObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        console.log(`${Utils.getPrefix()} URL changed: ${lastUrl} -> ${currentUrl}`);

        const isChatInProgress = STATE && STATE.isNewChatPending;
        const isNewChatTransition = Utils.isNewChatTransition(lastUrl, currentUrl);
        const isTransitionWithinGem =
          Utils.isGemHomepageUrl(lastUrl) &&
          Utils.isGemChatUrl(currentUrl) &&
          Utils.extractGemId(lastUrl) === Utils.extractGemId(currentUrl);

        if (isTransitionWithinGem) {
          console.log(
            `${Utils.getPrefix()} URL change is within the same Gem context, maintaining Gem detection`
          );
        } else if (isNewChatTransition) {
          console.log(
            `${Utils.getPrefix()} URL change indicates new chat creation, preserving observers for chat detection`
          );
          // Don't cleanup observers - they're needed to capture the new conversation
        } else {
          if (isChatInProgress) {
            console.warn(
              `${Utils.getPrefix()} User navigated away from chat while tracking is in progress. Chat data may be lost.`
            );
            StatusIndicator.show("You left the chat. Tracking cancelled.", "warning");
          }

          console.log(
            `${Utils.getPrefix()} URL change indicates navigation away from chat context, performing complete cleanup`
          );
          DomObserver.completeCleanup();

          if (GemDetector) {
            GemDetector.reset();
          }
        }

        lastUrl = currentUrl;
      }
    });
    urlChangeObserver.observe(document, { subtree: true, childList: true });

    // Watch for conversation list to appear before showing ready status
    DomObserver.watchForConversationList(() => {
      console.log(`${Utils.getPrefix()} Conversation list confirmed available. Manager fully active.`);
      StatusIndicator.show("Gemini History Manager active", "success");
    });

    /**
     * Warns the user before leaving the page if a chat is currently being tracked.
     *
     * @param {BeforeUnloadEvent} event - The beforeunload event.
     * @returns {string|undefined}
     */
    const beforeUnloadHandler = (event) => {
      const isChatInProgress = STATE && STATE.isNewChatPending;

      if (isChatInProgress) {
        const warningMessage =
          "A chat is currently being tracked. Leaving this page may cause your conversation to not be saved properly.";
        console.warn(`${Utils.getPrefix()} ${warningMessage}`);

        event.preventDefault();
        event.returnValue = warningMessage;
        return warningMessage;
      }
    };
    window.addEventListener("beforeunload", beforeUnloadHandler);

    // Attach main click listener (capture phase)
    console.log(`${Utils.getPrefix()} Attaching main click listener to document body...`);
    const clickHandler = EventHandlers.handleSendClick.bind(EventHandlers);
    document.body.addEventListener("click", clickHandler, true);

    /**
     * Handles messages received from the extension (background or popup).
     *
     * @param {Object} message - The message object.
     * @param {Object} sender - The message sender.
     * @param {Function} sendResponse - Callback to send a response.
     * @returns {Promise|undefined}
     */
    const runtimeMessageHandler = (message, sender, sendResponse) => {
      if (message.action === "getPageInfo") {
        const url = window.location.href;
        const isGeminiChat = Utils.isValidChatUrl(url);
        const isGem = Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url);
        const gemInfo = isGem && GemDetector ? GemDetector.getCurrentGemInfo() : null;

        return Promise.resolve({ url, isGeminiChat, isGem, gemInfo });
      }

      if (message.action === "invalidateLogConfigCache") {
        console.debug(
          `${Utils.getPrefix()} [ContentScript] Received request to invalidate logging config cache`
        );
        LogConfig.invalidateConfigCache();
        return Promise.resolve({ success: true });
      }
    };
    browser.runtime.onMessage.addListener(runtimeMessageHandler);

    console.log(`${Utils.getPrefix()} Gemini History Manager initialization complete.`);

    /**
     * Handles page visibility changes (e.g., tab switch).
     * Completely skips all observer cleanup and re-initialization when a chat is in progress.
     *
     * @returns {void}
     */
    const visibilityHandler = () => {
      // If a new chat is pending, do nothing — preserve tracking state
      if (STATE && STATE.isNewChatPending) {
        console.log(
          `${Utils.getPrefix()} Page visibility changed, but new chat is pending. Doing absolutely nothing to preserve chat tracking.`
        );
        return;
      }

      if (document.hidden) {
        console.log(`${Utils.getPrefix()} Page hidden, cleaning up all observers`);
        DomObserver.cleanupAllObservers();
      } else {
        console.log(`${Utils.getPrefix()} Page became visible, re-initializing observers`);
        reinitializeObservers();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    // Set up crash detector
    CrashDetector.init();

    // Final authoritative cleanup when WXT invalidates this content script context
    // (e.g., extension reload, update). Removes every listener and observer
    // attached above so no duplicate handlers survive across reloads.
    ctx.onInvalidated(() => {
      console.log(`${Utils.getPrefix()} Content script context invalidated. Performing final cleanup.`);

      urlChangeObserver.disconnect();
      window.removeEventListener("storage", storageHandler);
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      document.body.removeEventListener("click", clickHandler, true);
      document.removeEventListener("visibilitychange", visibilityHandler);
      browser.runtime.onMessage.removeListener(runtimeMessageHandler);

      DomObserver.completeCleanup();
      CrashDetector.cleanup();
    });
  },
});
