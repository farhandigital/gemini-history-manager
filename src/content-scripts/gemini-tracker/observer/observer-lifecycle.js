import { STATE } from "../state.js";
import { Utils } from "../utils.js";

export const ObserverLifecycle = {
  /**
   * Disconnects an observer and returns null to clear the reference.
   * Prevents memory leaks and ensures clean state management.
   *
   * @param {MutationObserver|null} observer - The observer to disconnect
   * @returns {null} Always returns null to clear the reference
   */
  cleanupObserver: function (observer) {
    if (observer) {
      observer.disconnect();
      return null;
    }
    return observer;
  },

  /**
   * Cleans up title-related observers and clears the isNewChatPending flag
   * only when observers were actually active.
   *
   * @returns {void}
   */
  cleanupTitleObservers: function () {
    const hadTitleObservers = STATE.titleObserver || STATE.secondaryTitleObserver;

    STATE.titleObserver = this.cleanupObserver(STATE.titleObserver);
    STATE.secondaryTitleObserver = this.cleanupObserver(STATE.secondaryTitleObserver);
    STATE.stopButtonObserver = this.cleanupObserver(STATE.stopButtonObserver);

    if (hadTitleObservers && STATE.isNewChatPending) {
      STATE.isNewChatPending = false;
      console.log(`${Utils.getPrefix()} Title observers cleaned up, cleared isNewChatPending flag`);
    }
  },

  /**
   * Disconnects all active observers to prevent memory leaks.
   * Covers the conversation list, title, secondary title, and stop button observers.
   *
   * @returns {void}
   */
  cleanupAllObservers: function () {
    console.log(`${Utils.getPrefix()} Cleaning up all DOM observers...`);
    STATE.conversationListObserver = this.cleanupObserver(STATE.conversationListObserver);
    this.cleanupTitleObservers();
    console.log(`${Utils.getPrefix()} All DOM observers cleaned up`);
  },
};
