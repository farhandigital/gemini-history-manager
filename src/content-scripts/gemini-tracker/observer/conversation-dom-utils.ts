import { Utils } from "../utils.js";
import { StatusIndicator } from "../status-indicator.js";
import { SELECTORS, ARIA_LABELS } from "../selectors.js";

export const ConversationDomUtils = {
  /**
   * Guard clause for title observer callbacks.
   * Returns true if observation should stop due to URL change or DOM element removal.
   *
   * @param expectedUrl - The URL this observer was created for
   * @param conversationItem - The conversation item element to check
   * @param titleElement - Optional title element for secondary observer check
   * @returns True if observation should bail, false to continue
   */
  shouldBailTitleObservation(
    expectedUrl: string,
    conversationItem: Element,
    titleElement: Element | null = null
  ): boolean {
    if (window.location.href !== expectedUrl) {
      console.warn(
        `${Utils.getPrefix()} URL changed from "${expectedUrl}" to "${window.location.href}" during title observation`
      );
      return true;
    }

    if (!document.contains(conversationItem)) {
      console.warn(`${Utils.getPrefix()} Conversation item removed from DOM`);
      return true;
    }

    if (titleElement !== null && !document.contains(titleElement)) {
      console.warn(`${Utils.getPrefix()} Title element removed from DOM`);
      return true;
    }

    return false;
  },

  /**
   * Checks if the Gemini stop button is currently visible in the UI.
   *
   * @returns True if the stop button is visible, false otherwise
   */
  isStopButtonVisible(): boolean {
    const stopButton = document.querySelector(SELECTORS.STOP_BUTTON);
    if (stopButton) {
      const stopIcon = stopButton.querySelector(SELECTORS.STOP_ICON);
      return stopIcon !== null && stopButton.getAttribute("aria-label") === ARIA_LABELS.STOP_RESPONSE;
    }
    return false;
  },

  /**
   * Finds a conversation item element within a list of mutation records.
   * Handles both old behavior (element added) and new behavior (display:none → visible).
   *
   * @param mutationsList - List of mutation records from MutationObserver
   * @returns The found conversation item element, or null if not found
   */
  findConversationItemInMutations(mutationsList: MutationRecord[]): Element | null {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;

            if (el.matches(SELECTORS.CONVERSATION_ITEMS_CONTAINER)) {
              const pendingConversation = el.querySelector(SELECTORS.PENDING_CONVERSATION);
              if (pendingConversation) {
                console.log(
                  `${Utils.getPrefix()} Found pending-conversation element - chat creation in progress`
                );
              }

              const conversationItem = el.querySelector(SELECTORS.CONVERSATION_ITEM);
              if (conversationItem) {
                const style = conversationItem.getAttribute("style") ?? "";
                const isHidden = style.includes("display: none") || style.includes("display:none");

                if (!isHidden) {
                  console.log(`${Utils.getPrefix()} Found NEW visible conversation item (element added)`);
                  return conversationItem;
                } else {
                  console.log(
                    `${Utils.getPrefix()} Found conversation item but it's hidden, waiting for it to become visible...`
                  );
                  if (pendingConversation) {
                    StatusIndicator.show("Chat creation detected, waiting for response...", "loading", 0);
                  }
                }
              }
            }

            if (el.matches(SELECTORS.CONVERSATION_ITEM)) {
              console.log(`${Utils.getPrefix()} Found NEW conversation item directly (old behavior)`);
              return el;
            }
          }
        }
      }

      if (mutation.type === "attributes" && mutation.attributeName === "style") {
        const target = mutation.target;
        if (target.nodeType === Node.ELEMENT_NODE) {
          const el = target as Element;
          if (el.matches(SELECTORS.CONVERSATION_ITEM)) {
            const style = el.getAttribute("style") ?? "";
            const isVisible = !style.includes("display: none") && !style.includes("display:none");

            if (isVisible) {
              console.log(
                `${Utils.getPrefix()} Found conversation item becoming visible (new behavior - style change)`
              );
              return el;
            }
          }
        }
      }
    }
    return null;
  },

  /**
   * Watches for the conversation list element to appear in the DOM.
   * Immediately invokes callback if the element already exists,
   * otherwise sets up a MutationObserver with a 10-second timeout fallback.
   *
   * @param callback - Function to call once the conversation list is found
   */
  watchForConversationList(callback: (element: Element) => void): void {
    console.log(`${Utils.getPrefix()} Starting to watch for conversation list element...`);
    StatusIndicator.show("Looking for Gemini recent chats. Please wait...", "loading", 0);

    const conversationListSelector = SELECTORS.CONVERSATION_LIST;
    const existingConversationList = document.querySelector(conversationListSelector);

    if (existingConversationList) {
      console.log(`${Utils.getPrefix()} Conversation list already exists in DOM`);
      callback(existingConversationList);
      return;
    }

    console.log(`${Utils.getPrefix()} Conversation list not found. Setting up observer to watch for it...`);

    // Shared flag: set to true once the conversation list is found and callback is invoked,
    // so the timeout handler can skip redundant disconnect/warning.
    let foundOrHandled = false;

    const observer = new MutationObserver((_mutations, obs) => {
      const conversationList = document.querySelector(conversationListSelector);
      if (conversationList) {
        console.log(`${Utils.getPrefix()} Conversation list element found in DOM`);
        foundOrHandled = true;
        obs.disconnect();
        callback(conversationList);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (!foundOrHandled) {
        console.warn(`${Utils.getPrefix()} Conversation list element not found after timeout`);
        StatusIndicator.show("Warning: Gemini recent chats not detected", "warning", 0);
        observer.disconnect();
      }
    }, 10000);
  },
};
