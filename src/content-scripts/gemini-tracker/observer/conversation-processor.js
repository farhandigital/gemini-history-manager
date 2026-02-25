import { STATE } from "../gemini-history-state.js";
import { Utils } from "../gemini-history-utils.js";
import { StatusIndicator } from "../gemini-history-status-indicator.js";
import { GemDetector } from "../gemini-history-gem-detector.js";
import { HistoryManager } from "../gemini-history-history-manager.js";
import { ObserverLifecycle } from "./observer-lifecycle.js";
import { ObserverStateManager } from "./observer-state-manager.js";

export const ConversationProcessor = {
  /**
   * Captures a snapshot of all pending context from STATE at the moment of calling.
   * Called just before disconnecting the conversation list observer so the data
   * is preserved across the async title-detection phase.
   *
   * @returns {Object} Object containing all relevant context for the new conversation
   */
  captureConversationContext: function () {
    return {
      timestamp: Utils.getCurrentTimestamp(),
      url: window.location.href,
      model: STATE.pendingModelName,
      tool: STATE.pendingTool,
      prompt: STATE.pendingPrompt,
      originalPrompt: STATE.pendingOriginalPrompt,
      attachedFiles: STATE.pendingAttachedFiles,
      accountName: STATE.pendingAccountName,
      accountEmail: STATE.pendingAccountEmail,
      geminiPlan: STATE.pendingGeminiPlan,
      gemId: STATE.pendingGemId,
      gemName: STATE.pendingGemName,
      gemUrl: STATE.pendingGemUrl,
    };
  },

  /**
   * Finalizes a tracked conversation: resolves gem name if missing, adds the
   * history entry, and performs full cleanup when done.
   *
   * @param {string} title - The captured conversation title
   * @param {string} expectedUrl - URL of the conversation
   * @param {string} timestamp - ISO-formatted timestamp
   * @param {string} model - Model name used
   * @param {string|null} tool - Tool name used (if any)
   * @param {string} prompt - User prompt text
   * @param {Array} attachedFiles - Array of attached filenames
   * @param {string} accountName - User's account name
   * @param {string} accountEmail - User's account email
   * @returns {Promise<boolean>} True if the entry was added, false otherwise
   */
  processTitleAndAddHistory: async function (
    title,
    expectedUrl,
    timestamp,
    model,
    tool,
    prompt,
    attachedFiles,
    accountName,
    accountEmail
  ) {
    if (!title) {
      return false;
    }

    console.log(`${Utils.getPrefix()} Title found for ${expectedUrl}! Attempting to add history entry.`);
    ObserverLifecycle.cleanupTitleObservers();

    const geminiPlan = STATE.pendingGeminiPlan;
    console.log(`${Utils.getPrefix()} Using Gemini plan: ${geminiPlan || "Unknown"}`);

    if (tool) {
      console.log(`${Utils.getPrefix()} Using tool: ${tool}`);
    }

    const gemId = STATE.pendingGemId;
    let gemName = STATE.pendingGemName;
    const gemUrl = STATE.pendingGemUrl;

    // Last-chance gem name extraction: the user may have sent a prompt before
    // the gem info section loaded, but the response container contains the name.
    if (gemId && !gemName) {
      if (GemDetector && typeof GemDetector.extractGemNameFromResponses === "function") {
        console.log(
          `${Utils.getPrefix()} No gem name detected earlier. Attempting to extract from response containers...`
        );
        const extractedName = GemDetector.extractGemNameFromResponses();
        if (extractedName) {
          gemName = extractedName;
          STATE.pendingGemName = extractedName;
          console.log(
            `${Utils.getPrefix()} Successfully extracted gem name "${gemName}" from response container`
          );
        }
      }
    }

    if (gemId) {
      console.log(
        `${Utils.getPrefix()} Including Gem info - ID: ${gemId}, Name: ${gemName || "Not detected"}`
      );
    }

    const success = await HistoryManager.addHistoryEntry(
      timestamp,
      expectedUrl,
      title,
      model,
      tool,
      prompt,
      attachedFiles,
      accountName,
      accountEmail,
      geminiPlan,
      gemId,
      gemName,
      gemUrl
    );

    if (!success) {
      StatusIndicator.show("Chat not saved (already exists or invalid)", "error");
    }

    console.log(`${Utils.getPrefix()} Chat Completed - clearing all state...`);
    ObserverStateManager.completeCleanup();

    return true;
  },
};
