import { STATE } from "../state.js";
import { Utils } from "../utils.js";

export const ObserverLifecycle = {
  /**
   * Disconnects an observer and returns null to clear the reference.
   * Prevents memory leaks and ensures clean state management.
   *
   * @param observer - The observer to disconnect
   * @returns Always returns null to clear the reference
   */
  cleanupObserver(observer: MutationObserver | null): null {
    if (observer) {
      observer.disconnect();
    }
    return null;
  },

  /**
   * Cleans up title-related observers and clears the isNewChatPending flag
   * only when observers were actually active.
   */
  cleanupTitleObservers(): void {
    const hadTitleObservers = STATE.titleObserver ?? STATE.secondaryTitleObserver;

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
   */
  cleanupAllObservers(): void {
    console.log(`${Utils.getPrefix()} Cleaning up all DOM observers...`);
    STATE.conversationListObserver = this.cleanupObserver(STATE.conversationListObserver);
    this.cleanupTitleObservers();
    console.log(`${Utils.getPrefix()} All DOM observers cleaned up`);
  },
};
