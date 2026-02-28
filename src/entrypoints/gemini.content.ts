// @ts-expect-error — logConfig.js is not yet migrated to TypeScript
import LogConfig from "@/lib/logConfig.js";
import { Utils } from "../content-scripts/gemini-tracker/utils.js";
import { STATE } from "../content-scripts/gemini-tracker/state.js";
import { StatusIndicator } from "../content-scripts/gemini-tracker/status-indicator.js";
import { DomObserver } from "../content-scripts/gemini-tracker/observer/dom-observer.js";
import { GemDetector } from "../content-scripts/gemini-tracker/gem-detector.js";
import { EventHandlers } from "../content-scripts/gemini-tracker/event-handlers.js";
import { CrashDetector } from "../content-scripts/gemini-tracker/crash-detector.js";

/**
 * Re-initializes observers after they have been cleaned up.
 * Used when the page becomes visible again after being hidden.
 */
function reinitializeObservers(): void {
  console.log(`${Utils.getPrefix()} Re-initializing observers after page became visible...`);

  const url = window.location.href;
  if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
    console.log(`${Utils.getPrefix()} Re-detecting Gem information for current URL...`);
    GemDetector.reset();
  }

  const isTrackingChat = STATE.isNewChatPending;

  if (isTrackingChat) {
    console.log(`${Utils.getPrefix()} Returning during active chat tracking, restoring status indicator`);
    StatusIndicator.show("Tracking new chat...", "info");
  } else {
    StatusIndicator.show("Reconnecting to Gemini recent chats...", "loading", 0);
  }

  DomObserver.watchForConversationList(() => {
    console.log(
      `${Utils.getPrefix()} Conversation list re-detected after page visibility change. Manager fully active.`
    );

    if (!isTrackingChat) {
      StatusIndicator.show("Gemini History Manager active", "success");
    }
  });

  CrashDetector.init();
}

export default defineContentScript({
  matches: ["https://gemini.google.com/*"],

  main(ctx) {
    console.log(`${Utils.getPrefix()} Initializing Gemini History Manager...`);

    StatusIndicator.init();

    // ── Named handler references ─────────────────────────────────────────────
    // All listeners are stored so ctx.onInvalidated() can remove every one of
    // them, preventing duplicate handlers after extension reload/update.

    /**
     * Listens for storage events to detect logging configuration changes.
     * Invalidates the logging configuration cache when changes are detected.
     */
    const storageHandler = (event: StorageEvent): void => {
      if (event.key === LogConfig.CONFIG_STORAGE_KEY) {
        console.debug(
          `${Utils.getPrefix()} [ContentScript] Logging configuration changed in localStorage, invalidating cache`
        );
        LogConfig.invalidateConfigCache();
      }
    };
    window.addEventListener("storage", storageHandler);

    StatusIndicator.show("Waiting for Gemini recent chats to appear...", "loading", 0);

    const url = window.location.href;
    if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
      console.log(`${Utils.getPrefix()} Detected Gem URL. Starting Gem detection...`);
      GemDetector.reset();
    }

    let lastUrl = window.location.href;
    const urlChangeObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        console.log(`${Utils.getPrefix()} URL changed: ${lastUrl} -> ${currentUrl}`);

        const isChatInProgress = STATE.isNewChatPending;
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
          GemDetector.reset();
        }

        lastUrl = currentUrl;
      }
    });
    urlChangeObserver.observe(document, { subtree: true, childList: true });

    DomObserver.watchForConversationList(() => {
      console.log(`${Utils.getPrefix()} Conversation list confirmed available. Manager fully active.`);
      StatusIndicator.show("Gemini History Manager active", "success");
    });

    /**
     * Warns the user before leaving the page if a chat is currently being tracked.
     */
    const beforeUnloadHandler = (event: BeforeUnloadEvent): string | undefined => {
      const isChatInProgress = STATE.isNewChatPending;

      if (isChatInProgress) {
        const warningMessage =
          "A chat is currently being tracked. Leaving this page may cause your conversation to not be saved properly.";
        console.warn(`${Utils.getPrefix()} ${warningMessage}`);

        event.preventDefault();
        event.returnValue = warningMessage;
        return warningMessage;
      }

      return undefined;
    };
    window.addEventListener("beforeunload", beforeUnloadHandler);

    console.log(`${Utils.getPrefix()} Attaching main click listener to document body...`);
    const clickHandler = EventHandlers.handleSendClick.bind(EventHandlers);
    document.body.addEventListener("click", clickHandler, true);

    /**
     * Handles messages received from the extension (background or popup).
     */
    const runtimeMessageHandler = (
      message: Record<string, unknown>
    ): Promise<unknown> | undefined => {
      if (message["action"] === "getPageInfo") {
        const currentUrl = window.location.href;
        const isGeminiChat = Utils.isValidChatUrl(currentUrl);
        const isGem = Utils.isGemHomepageUrl(currentUrl) || Utils.isGemChatUrl(currentUrl);
        const gemInfo = isGem ? GemDetector.getCurrentGemInfo() : null;

        return Promise.resolve({ url: currentUrl, isGeminiChat, isGem, gemInfo });
      }

      if (message["action"] === "invalidateLogConfigCache") {
        console.debug(
          `${Utils.getPrefix()} [ContentScript] Received request to invalidate logging config cache`
        );
        LogConfig.invalidateConfigCache();
        return Promise.resolve({ success: true });
      }

      return undefined;
    };
    browser.runtime.onMessage.addListener(runtimeMessageHandler);

    console.log(`${Utils.getPrefix()} Gemini History Manager initialization complete.`);

    /**
     * Handles page visibility changes (e.g., tab switch).
     * Completely skips all observer cleanup and re-initialization when a chat is in progress.
     */
    const visibilityHandler = (): void => {
      if (STATE.isNewChatPending) {
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

    CrashDetector.init();

    // Final authoritative cleanup when WXT invalidates this content script context
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
