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
   * @param {Object} context - Conversation context captured at the start of tracking
   * @param {string} context.url - URL of the conversation
   * @param {string} context.timestamp - ISO-formatted timestamp
   * @param {string} context.model - Model name used
   * @param {string|null} context.tool - Tool name used (if any)
   * @param {string} context.prompt - User prompt text
   * @param {Array} context.attachedFiles - Array of attached filenames
   * @param {string} context.accountName - User's account name
   * @param {string} context.accountEmail - User's account email
   * @param {string|null} context.geminiPlan - Gemini plan tier
   * @param {string|null} context.gemId - Gem ID (if applicable)
   * @param {string|null} context.gemName - Gem name (if applicable)
   * @param {string|null} context.gemUrl - Gem URL (if applicable)
   * @returns {Promise<boolean>} True if the entry was added, false otherwise
   */
  processTitleAndAddHistory: async function (title, context) {
    if (!title) {
      return false;
    }

    const {
      url,
      timestamp,
      model,
      tool,
      prompt,
      attachedFiles,
      accountName,
      accountEmail,
      geminiPlan,
      gemId,
      gemUrl,
    } = context;

    let { gemName } = context;

    console.log(`${Utils.getPrefix()} Title found for ${url}! Attempting to add history entry.`);
    ObserverLifecycle.cleanupTitleObservers();

    console.log(`${Utils.getPrefix()} Using Gemini plan: ${geminiPlan || "Unknown"}`);

    if (tool) {
      console.log(`${Utils.getPrefix()} Using tool: ${tool}`);
    }

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

    let success = false;
    try {
      success = await HistoryManager.addHistoryEntry(
        timestamp,
        url,
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

      return success === true;
    } catch (err) {
      console.error(`${Utils.getPrefix()} Error adding history entry:`, err);
      StatusIndicator.show("Error saving chat", "error");
      return false;
    } finally {
      console.log(`${Utils.getPrefix()} Chat Completed - clearing all state...`);
      ObserverStateManager.completeCleanup();
    }
  },
};
