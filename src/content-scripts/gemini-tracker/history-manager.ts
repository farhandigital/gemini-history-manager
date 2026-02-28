import { CONFIG } from "./config.js";
import { Utils } from "./utils.js";
import { StatusIndicator } from "./status-indicator.js";
import { BROWSER_ACTIONS } from "./constants.js";

export interface HistoryEntry {
  timestamp: string;
  url: string;
  title: string;
  model: string;
  tool: string | null;
  prompt: string | null;
  attachedFiles: string[];
  accountName: string | null;
  accountEmail: string | null;
  geminiPlan: string | null;
  gemId: string | null;
  gemName: string | null;
  gemUrl: string | null;
  _v: number;
}

export const HistoryManager = {
  /**
   * Loads chat history from browser storage.
   *
   * @returns Promise resolving to array of history entries or empty array if none found or on error
   */
  loadHistory(): Promise<HistoryEntry[]> {
    console.log(`${Utils.getPrefix()} Loading history from storage...`);
    return new Promise((resolve) => {
      browser.storage.local
        .get(CONFIG.STORAGE_KEY)
        .then((data) => {
          const raw = (data as Record<string, unknown>)[CONFIG.STORAGE_KEY] ?? [];
          if (!Array.isArray(raw)) {
            console.warn(
              `${Utils.getPrefix()} Stored history data is not an array. Returning empty history.`
            );
            resolve([]);
            return;
          }

          // Validate and normalize each entry, discarding malformed ones
          const normalized: HistoryEntry[] = [];
          for (const item of raw) {
            if (item === null || typeof item !== "object") {
              console.warn(`${Utils.getPrefix()} Skipping non-object history entry:`, item);
              continue;
            }
            const entry = item as Record<string, unknown>;
            if (
              typeof entry["timestamp"] !== "string" ||
              typeof entry["url"] !== "string" ||
              typeof entry["title"] !== "string" ||
              typeof entry["model"] !== "string"
            ) {
              console.warn(`${Utils.getPrefix()} Skipping history entry missing required fields:`, entry);
              continue;
            }
            normalized.push({
              timestamp: entry["timestamp"] as string,
              url: entry["url"] as string,
              title: entry["title"] as string,
              model: entry["model"] as string,
              tool: typeof entry["tool"] === "string" ? entry["tool"] : null,
              prompt: typeof entry["prompt"] === "string" ? entry["prompt"] : null,
              attachedFiles: Array.isArray(entry["attachedFiles"])
                ? (entry["attachedFiles"] as unknown[]).filter((f): f is string => typeof f === "string")
                : [],
              accountName: typeof entry["accountName"] === "string" ? entry["accountName"] : null,
              accountEmail: typeof entry["accountEmail"] === "string" ? entry["accountEmail"] : null,
              geminiPlan: typeof entry["geminiPlan"] === "string" ? entry["geminiPlan"] : null,
              gemId: typeof entry["gemId"] === "string" ? entry["gemId"] : null,
              gemName: typeof entry["gemName"] === "string" ? entry["gemName"] : null,
              gemUrl: typeof entry["gemUrl"] === "string" ? entry["gemUrl"] : null,
              _v: typeof entry["_v"] === "number" ? entry["_v"] : CONFIG.SCHEMA_VERSION,
            });
          }

          console.log(
            `${Utils.getPrefix()} History loaded successfully. Found ${normalized.length} valid entries (${raw.length - normalized.length} skipped).`
          );
          resolve(normalized);
        })
        .catch((error: unknown) => {
          console.error(`${Utils.getPrefix()} Error loading history:`, error);
          StatusIndicator.show("Error loading chat history", "error");
          resolve([]);
        });
    });
  },

  /**
   * Saves chat history to browser storage.
   *
   * @param history - Array of history entries to save.
   * @returns Promise resolving when save is complete.
   */
  saveHistory(history: HistoryEntry[]): Promise<void> {
    console.log(`${Utils.getPrefix()} Attempting to save history with ${history.length} entries...`);
    if (!Array.isArray(history)) {
      console.error(`${Utils.getPrefix()} Attempted to save non-array data. Aborting save.`);
      StatusIndicator.show("Error saving history data", "error");
      return Promise.reject(new Error("Cannot save non-array data"));
    }

    return browser.storage.local
      .set({ [CONFIG.STORAGE_KEY]: history })
      .then(() => {
        console.log(`${Utils.getPrefix()} History saved successfully.`);
        browser.runtime
          .sendMessage({
            action: BROWSER_ACTIONS.UPDATE_HISTORY_COUNT,
            count: history.length,
          })
          .catch((err: unknown) =>
            console.error(`${Utils.getPrefix()} Error sending message to background:`, err)
          );
      })
      .catch((error: unknown) => {
        console.error(`${Utils.getPrefix()} Error saving history:`, error);
        StatusIndicator.show("Error saving chat history", "error");
        throw error;
      });
  },

  /**
   * Adds a new entry to the chat history.
   * Validates input data and prevents duplicates based on URL.
   *
   * @param timestamp - ISO-formatted timestamp for the chat
   * @param url - URL of the chat
   * @param title - Title of the chat
   * @param model - Model name used for the chat
   * @param tool - Tool name used for the chat (if any)
   * @param prompt - User prompt text
   * @param attachedFiles - Array of attached filenames
   * @param accountName - Name of the user account
   * @param accountEmail - Email of the user account
   * @param geminiPlan - The Gemini plan (Pro, Free, etc.) or null if unknown
   * @param gemId - ID of the Gem being used (if any)
   * @param gemName - Name of the Gem being used (if any)
   * @param gemUrl - URL of the Gem (if any)
   * @returns Promise resolving to true if entry was added, false if validation failed or duplicate detected
   */
  async addHistoryEntry(
    timestamp: string,
    url: string,
    title: string,
    model: string,
    tool: string | null,
    prompt: string | null,
    attachedFiles: string[],
    accountName: string | null,
    accountEmail: string | null,
    geminiPlan: string | null,
    gemId: string | null = null,
    gemName: string | null = null,
    gemUrl: string | null = null
  ): Promise<boolean> {
    const entryData: HistoryEntry = {
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
      gemUrl,
      _v: CONFIG.SCHEMA_VERSION,
    };
    console.log(`${Utils.getPrefix()} Attempting to add history entry:`, entryData);

    if (!timestamp || !url || !title || !model) {
      console.warn(
        `${Utils.getPrefix()} Attempted to add entry with missing essential data. Skipping.`,
        entryData
      );
      StatusIndicator.show("Chat history entry incomplete", "warning");
      return false;
    }

    if (!Utils.isValidChatUrl(url)) {
      console.warn(
        `${Utils.getPrefix()} Attempted to add entry with invalid chat URL pattern "${url}". Skipping.`
      );
      StatusIndicator.show("Invalid chat URL", "warning");
      return false;
    }

    try {
      const history = await this.loadHistory();

      const canonicalUrl = Utils.getCanonicalChatUrl(url);
      if (history.some((entry) => Utils.getCanonicalChatUrl(entry.url) === canonicalUrl)) {
        console.log(`${Utils.getPrefix()} Duplicate URL detected (canonical: ${canonicalUrl}), skipping entry:`, url);
        StatusIndicator.show("Chat already in history", "info");
        return false;
      }

      history.unshift(entryData);
      await this.saveHistory(history);
      console.log(`${Utils.getPrefix()} Successfully added history entry.`);
      StatusIndicator.show(`Chat "${title}" saved to history`, "success");
      return true;
    } catch (error: unknown) {
      console.error(`${Utils.getPrefix()} Error adding history entry:`, error);
      StatusIndicator.show("Failed to add chat to history", "error");
      return false;
    }
  },
};
