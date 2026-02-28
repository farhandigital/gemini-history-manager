import { STATE } from "../state.js";
import { Utils } from "../utils.js";
import { ObserverLifecycle } from "./observer-lifecycle.js";

export const ObserverStateManager = {
  /**
   * Clears the subset of pending state variables related to the prompt context.
   * Does not touch gem-related state or the isNewChatPending flag.
   */
  resetPendingPromptContext(): void {
    STATE.pendingModelName = null;
    STATE.pendingTool = null;
    STATE.pendingPrompt = null;
    STATE.pendingOriginalPrompt = null;
    STATE.pendingAttachedFiles = [];
    STATE.pendingAccountName = null;
    STATE.pendingAccountEmail = null;
  },

  /**
   * Clears all pending state variables.
   * Used when completely aborting the new chat tracking process.
   */
  resetAllPendingState(): void {
    this.resetPendingPromptContext();
    STATE.isNewChatPending = false;
    STATE.pendingGemId = null;
    STATE.pendingGemName = null;
    STATE.pendingGemUrl = null;
    STATE.pendingGeminiPlan = null;
  },

  /**
   * Full cleanup: disconnects all observers and resets all pending state.
   * This is the primary cleanup method for most scenarios.
   */
  completeCleanup(): void {
    console.log(`${Utils.getPrefix()} Performing complete cleanup of observers and state...`);
    ObserverLifecycle.cleanupAllObservers();
    this.resetAllPendingState();
    console.log(`${Utils.getPrefix()} Complete cleanup finished`);
  },
};
