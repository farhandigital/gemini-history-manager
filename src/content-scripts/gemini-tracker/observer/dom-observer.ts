import { STATE } from "../state.js";
import { Utils } from "../utils.js";
import { StatusIndicator } from "../status-indicator.js";
import { ObserverLifecycle } from "./observer-lifecycle.js";
import { ObserverStateManager } from "./observer-state-manager.js";
import { ConversationDomUtils } from "./conversation-dom-utils.js";
import { ConversationProcessor, type ConversationContext } from "./conversation-processor.js";
import { SELECTORS } from "../selectors.js";

interface PriorityContext {
  chatFinished: boolean;
  titleProcessed: boolean;
}

/**
 * DomObserver — Orchestration layer for new-chat tracking.
 *
 * Responsibilities:
 *   - Wire together the observer sub-modules (lifecycle, state, DOM utils, processor)
 *   - Own the MutationObserver setup and callback logic
 *   - Re-export the sub-module public helpers that external consumers rely on
 *     so that existing import paths stay unchanged
 *
 * What this file does NOT do:
 *   - Mutate observer state directly (delegated to ObserverLifecycle / ObserverStateManager)
 *   - Perform DOM queries beyond observer callbacks (delegated to ConversationDomUtils)
 *   - Build history entries or clean up after them (delegated to ConversationProcessor)
 */
export const DomObserver = {
  // ─── Re-exports (public API — keep stable for external consumers) ───────────

  /** @see ObserverLifecycle.cleanupObserver */
  cleanupObserver: (observer: MutationObserver | null): null =>
    ObserverLifecycle.cleanupObserver(observer),

  /** @see ObserverLifecycle.cleanupTitleObservers */
  cleanupTitleObservers: (): void => ObserverLifecycle.cleanupTitleObservers(),

  /** @see ObserverLifecycle.cleanupAllObservers */
  cleanupAllObservers: (): void => ObserverLifecycle.cleanupAllObservers(),

  /** @see ObserverStateManager.resetPendingPromptContext */
  resetPendingPromptContext: (): void => ObserverStateManager.resetPendingPromptContext(),

  /** @see ObserverStateManager.resetAllPendingState */
  resetAllPendingState: (): void => ObserverStateManager.resetAllPendingState(),

  /** @see ObserverStateManager.completeCleanup */
  completeCleanup: (): void => ObserverStateManager.completeCleanup(),

  /** @see ConversationDomUtils.watchForConversationList */
  watchForConversationList: (callback: (element: Element) => void): void =>
    ConversationDomUtils.watchForConversationList(callback),

  // ─── Orchestration ──────────────────────────────────────────────────────────

  /**
   * Watches the stop button for disappearance, signaling that Gemini has
   * finished generating a response. Uses a 3-second grace period so that
   * title observers get priority to fire first.
   *
   * @param expectedUrl - URL this observer was created for
   * @param onChatFinished - Callback when chat generation finishes
   * @param priorityContext - Shared context object { chatFinished, titleProcessed }
   */
  observeStopButton(
    expectedUrl: string,
    onChatFinished: () => void,
    priorityContext: PriorityContext
  ): void {
    console.log(`${Utils.getPrefix()} Setting up stop button observer for URL: ${expectedUrl}`);

    const buttonContainer = document.querySelector(SELECTORS.TRAILING_ACTIONS_WRAPPER);

    if (!buttonContainer) {
      console.warn(`${Utils.getPrefix()} Could not find button container for stop button observation`);
      return;
    }

    const observer = new MutationObserver(() => {
      try {
        if (window.location.href !== expectedUrl) {
          console.log(`${Utils.getPrefix()} URL changed during stop button observation, cleaning up`);
          ObserverLifecycle.cleanupTitleObservers();
          return;
        }

        if (!ConversationDomUtils.isStopButtonVisible()) {
          console.log(`${Utils.getPrefix()} Stop button disappeared - chat generation likely finished`);
          priorityContext.chatFinished = true;

          // Give title observers 3 seconds to respond before taking over
          setTimeout(() => {
            if (STATE.stopButtonObserver && !priorityContext.titleProcessed) {
              console.log(
                `${Utils.getPrefix()} Title observers didn't respond within 3 seconds, stop button observer taking over`
              );
              onChatFinished();
            } else if (priorityContext.titleProcessed) {
              console.log(
                `${Utils.getPrefix()} Title observers already processed the title, stop button observer backing off`
              );
            }
          }, 3000);
        }
      } catch (err: unknown) {
        console.error(`${Utils.getPrefix()} Error in stop button observer callback:`, err);
        ObserverLifecycle.cleanupTitleObservers();
      }
    });

    STATE.stopButtonObserver = observer;
    observer.observe(buttonContainer, {
      childList: true,
      attributes: true,
      subtree: true,
    });

    console.log(`${Utils.getPrefix()} Stop button observer active for URL: ${expectedUrl}`);
  },

  /**
   * Processes a batch of mutations from the main conversation list observer.
   * Validates URL and pending-chat state, then hands off to title observation
   * once a new conversation item is found.
   *
   * @param mutationsList - Mutations from the conversation list observer
   * @returns True if a new conversation item was found and title observation started
   */
  processConversationListMutations(mutationsList: MutationRecord[]): boolean {
    console.log(
      `${Utils.getPrefix()} MAIN Conversation List Observer Callback Triggered. ${mutationsList.length} mutations.`
    );

    const currentUrl = window.location.href;
    console.log(`${Utils.getPrefix()} Current URL inside MAIN observer: ${currentUrl}`);

    if (!Utils.isValidChatUrl(currentUrl)) {
      console.log(
        `${Utils.getPrefix()} URL "${currentUrl}" does not match the expected chat pattern. Waiting...`
      );
      return false;
    }

    console.log(
      `${Utils.getPrefix()} URL check passed. Processing mutations to find NEW conversation item...`
    );

    if (!STATE.isNewChatPending) {
      console.log(`${Utils.getPrefix()} No new chat is pending. Ignoring mutations.`);
      return false;
    }

    const conversationItem = ConversationDomUtils.findConversationItemInMutations(mutationsList);

    if (conversationItem) {
      console.log(`${Utils.getPrefix()} Found NEW conversation item. Preparing to wait for title...`);
      StatusIndicator.show("Waiting for the title to appear. Stand by...", "loading", 0);

      const context = ConversationProcessor.captureConversationContext();

      STATE.conversationListObserver = ObserverLifecycle.cleanupObserver(STATE.conversationListObserver);

      ObserverStateManager.resetPendingPromptContext();
      console.log(
        `${Utils.getPrefix()} Cleared pending prompt context. Waiting for title for URL: ${context.url}`
      );

      this.observeTitleForItem(conversationItem, context);
      return true;
    }

    return false;
  },

  /**
   * Sets up the main MutationObserver on the conversation list element to detect
   * when a new conversation item appears.
   */
  observeConversationListForNewChat(): void {
    const targetSelector = SELECTORS.CONVERSATION_LIST;
    const conversationListElement = document.querySelector(targetSelector);

    if (!conversationListElement) {
      console.warn(
        `${Utils.getPrefix()} Could not find conversation list element ("${targetSelector}"). Aborting.`
      );
      StatusIndicator.show("Could not track chat (UI element not found)", "warning");
      ObserverStateManager.resetAllPendingState();
      return;
    }

    console.log(
      `${Utils.getPrefix()} Found conversation list element. Setting up MAIN conversation list observer...`
    );

    STATE.conversationListObserver = ObserverLifecycle.cleanupObserver(STATE.conversationListObserver);
    ObserverLifecycle.cleanupTitleObservers();

    STATE.conversationListObserver = new MutationObserver((mutationsList) => {
      try {
        this.processConversationListMutations(mutationsList);
      } catch (err: unknown) {
        console.error(`${Utils.getPrefix()} Error in conversation list observer callback:`, err);
        STATE.conversationListObserver = ObserverLifecycle.cleanupObserver(STATE.conversationListObserver);
        ObserverStateManager.resetAllPendingState();
      }
    });

    STATE.conversationListObserver.observe(conversationListElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });

    console.log(`${Utils.getPrefix()} MAIN conversation list observer is now active.`);
  },

  /**
   * Sets up title observation on a specific conversation item.
   * Manages a two-stage observer system (primary + secondary) with a stop-button
   * priority fallback to handle placeholder titles and truncated text.
   *
   * @param conversationItem - The conversation item DOM element
   * @param context - Full conversation context captured at tracking start.
   */
  observeTitleForItem(conversationItem: Element, context: ConversationContext): void {
    if (ConversationDomUtils.shouldBailTitleObservation(context.url, conversationItem)) {
      ObserverStateManager.resetAllPendingState();
      return;
    }

    console.log(
      `${Utils.getPrefix()} TITLE Check (URL: ${context.url}): Setting up observers to wait for title`
    );

    // Shared flag object between title observers and the stop-button observer to
    // prevent double-processing the title.
    const priorityContext: PriorityContext = {
      chatFinished: false,
      titleProcessed: false,
    };

    /**
     * Processes a title with priority coordination — ensures only the first
     * caller (primary observer, secondary observer, or stop-button observer)
     * triggers the history entry.
     */
    const processTitle = (title: string, source: string): void => {
      if (priorityContext.titleProcessed) {
        console.log(`${Utils.getPrefix()} Title already processed, ignoring ${source} trigger`);
        return;
      }

      priorityContext.titleProcessed = true;
      console.log(`${Utils.getPrefix()} Processing title from ${source}: "${title}"`);

      ObserverLifecycle.cleanupTitleObservers();
      void ConversationProcessor.processTitleAndAddHistory(title, context);
    };

    // Stop button observer: fallback if title observers don't fire within 3s
    this.observeStopButton(
      context.url,
      () => {
        console.log(
          `${Utils.getPrefix()} Stop button observer triggered — accepting current title even if placeholder`
        );
        const titleElement = conversationItem.querySelector(SELECTORS.CONVERSATION_TITLE);
        if (titleElement) {
          const currentTitle = titleElement.textContent?.trim() ?? "";
          if (currentTitle) {
            processTitle(currentTitle, "stop button observer (final acceptance)");
          }
        }
      },
      priorityContext
    );

    // Primary title observer: watches broad mutations on the conversation item
    STATE.titleObserver = new MutationObserver(() => {
      try {
        if (ConversationDomUtils.shouldBailTitleObservation(context.url, conversationItem)) {
          ObserverLifecycle.cleanupTitleObservers();
          return;
        }

        const titleElement = conversationItem.querySelector(SELECTORS.CONVERSATION_TITLE);
        if (!titleElement) return;

        const currentTitle = titleElement.textContent?.trim() ?? "";
        const placeholderPrompt = context.prompt;

        const looksLikePlaceholder =
          !currentTitle ||
          (placeholderPrompt !== null && currentTitle === placeholderPrompt) ||
          (placeholderPrompt !== null &&
            Utils.isTruncatedVersionEnhanced(placeholderPrompt, currentTitle, context.originalPrompt));

        if (!priorityContext.chatFinished && looksLikePlaceholder) {
          // Set up secondary observer once to watch for the real title
          if (!STATE.secondaryTitleObserver) {
            console.log(
              `${Utils.getPrefix()} Setting up secondary observer to wait for real title change...`
            );

            const titleToWaitFor = currentTitle;

            // Secondary title observer: watches fine-grained text changes on the title element
            STATE.secondaryTitleObserver = new MutationObserver(() => {
              try {
                if (
                  ConversationDomUtils.shouldBailTitleObservation(
                    context.url,
                    conversationItem,
                    titleElement
                  )
                ) {
                  ObserverLifecycle.cleanupTitleObservers();
                  return;
                }

                const newTitle = titleElement.textContent?.trim() ?? "";

                if (priorityContext.chatFinished && newTitle) {
                  processTitle(newTitle, "secondary observer (chat finished)");
                  return;
                }

                const isNotPlaceholder =
                  placeholderPrompt === null || newTitle !== placeholderPrompt;
                const isNotTruncated =
                  placeholderPrompt === null ||
                  !Utils.isTruncatedVersionEnhanced(
                    placeholderPrompt,
                    newTitle,
                    context.originalPrompt
                  );
                const isDifferentFromWaiting = newTitle !== titleToWaitFor;

                if (newTitle && isNotPlaceholder && isNotTruncated && isDifferentFromWaiting) {
                  processTitle(newTitle, "secondary observer (real title)");
                } else if (
                  placeholderPrompt !== null &&
                  Utils.isTruncatedVersionEnhanced(
                    placeholderPrompt,
                    newTitle,
                    context.originalPrompt
                  )
                ) {
                  console.log(
                    `${Utils.getPrefix()} Secondary observer: Detected truncated title "${newTitle}", waiting for full title...`
                  );
                }
              } catch (err: unknown) {
                console.error(`${Utils.getPrefix()} Error in secondary title observer callback:`, err);
                ObserverLifecycle.cleanupTitleObservers();
              }
            });

            STATE.secondaryTitleObserver.observe(titleElement, {
              childList: true,
              characterData: true,
              subtree: true,
            });
          }
          return;
        }

        if (priorityContext.chatFinished && currentTitle) {
          processTitle(currentTitle, "primary observer (chat finished)");
        } else if (!priorityContext.chatFinished) {
          processTitle(currentTitle, "primary observer (real title)");
        }
      } catch (err: unknown) {
        console.error(`${Utils.getPrefix()} Error in primary title observer callback:`, err);
        ObserverLifecycle.cleanupTitleObservers();
      }
    });

    STATE.titleObserver.observe(conversationItem, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: true,
    });

    console.log(`${Utils.getPrefix()} TITLE observer active for URL: ${context.url}`);
  },
};
