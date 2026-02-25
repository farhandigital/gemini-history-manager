import { Utils } from "../gemini-history-utils.js";
import { StatusIndicator } from "../gemini-history-status-indicator.js";

export const ConversationDomUtils = {
  /**
   * Guard clause for title observer callbacks.
   * Returns true if observation should stop due to URL change or DOM element removal.
   *
   * @param {string} expectedUrl - The URL this observer was created for
   * @param {Element} conversationItem - The conversation item element to check
   * @param {Element|null} [titleElement] - Optional title element for secondary observer check
   * @returns {boolean} True if observation should bail, false to continue
   */
  shouldBailTitleObservation: function (expectedUrl, conversationItem, titleElement = null) {
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
   * @returns {boolean} True if the stop button is visible, false otherwise
   */
  isStopButtonVisible: function () {
    const stopButton = document.querySelector("button.send-button.stop");
    if (stopButton) {
      const stopIcon = stopButton.querySelector(".stop-icon");
      return stopIcon && stopButton.getAttribute("aria-label") === "Stop response";
    }
    return false;
  },

  /**
   * Finds a conversation item element within a list of mutation records.
   * Handles both old behavior (element added) and new behavior (display:none → visible).
   *
   * @param {MutationRecord[]} mutationsList - List of mutation records from MutationObserver
   * @returns {Element|null} The found conversation item element, or null if not found
   */
  findConversationItemInMutations: function (mutationsList) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains("conversation-items-container")
          ) {
            const pendingConversation = node.querySelector('[data-test-id="pending-conversation"]');
            if (pendingConversation) {
              console.log(
                `${Utils.getPrefix()} Found pending-conversation element - chat creation in progress`
              );
            }

            const conversationItem = node.querySelector('a[data-test-id="conversation"]');
            if (conversationItem) {
              const style = conversationItem.getAttribute("style") || "";
              const isHidden = style.includes("display: none") || style.includes("display:none");

              if (!isHidden) {
                console.log(`${Utils.getPrefix()} Found NEW visible conversation item (element added)`);
                return conversationItem;
              } else {
                console.log(
                  `${Utils.getPrefix()} Found conversation item but it's hidden, waiting for it to become visible...`
                );
                if (StatusIndicator && pendingConversation) {
                  StatusIndicator.show("Chat creation detected, waiting for response...", "loading", 0);
                }
              }
            }
          }

          if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute("data-test-id") === "conversation") {
            console.log(`${Utils.getPrefix()} Found NEW conversation item directly (old behavior)`);
            return node;
          }
        }
      }

      if (mutation.type === "attributes" && mutation.attributeName === "style") {
        const target = mutation.target;
        if (
          target.nodeType === Node.ELEMENT_NODE &&
          target.getAttribute("data-test-id") === "conversation" &&
          target.tagName.toLowerCase() === "a"
        ) {
          const style = target.getAttribute("style") || "";
          const isVisible = !style.includes("display: none") && !style.includes("display:none");

          if (isVisible) {
            console.log(
              `${Utils.getPrefix()} Found conversation item becoming visible (new behavior - style change)`
            );
            return target;
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
   * @param {function} callback - Function to call once the conversation list is found
   * @returns {void}
   */
  watchForConversationList: function (callback) {
    console.log(`${Utils.getPrefix()} Starting to watch for conversation list element...`);
    StatusIndicator.show("Looking for Gemini recent chats. Please wait...", "loading", 0);

    const conversationListSelector = 'conversations-list[data-test-id="all-conversations"]';
    const existingConversationList = document.querySelector(conversationListSelector);

    if (existingConversationList) {
      console.log(`${Utils.getPrefix()} Conversation list already exists in DOM`);
      callback(existingConversationList);
      return;
    }

    console.log(`${Utils.getPrefix()} Conversation list not found. Setting up observer to watch for it...`);

    const observer = new MutationObserver((mutations, obs) => {
      const conversationList = document.querySelector(conversationListSelector);
      if (conversationList) {
        console.log(`${Utils.getPrefix()} Conversation list element found in DOM`);
        obs.disconnect();
        callback(conversationList);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (observer) {
        const conversationList = document.querySelector(conversationListSelector);
        if (!conversationList) {
          console.warn(`${Utils.getPrefix()} Conversation list element not found after timeout`);
          StatusIndicator.show("Warning: Gemini recent chats not detected", "warning", 0);
        }
        observer.disconnect();
      }
    }, 10000);
  },
};
