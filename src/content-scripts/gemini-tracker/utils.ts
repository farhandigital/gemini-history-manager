import { CONFIG } from "./config.js";

export interface CodeblockResult {
  processedText: string;
  hasCodeblocks: boolean;
  codeblockCount: number;
}

export const Utils = {
  /**
   * Gets a formatted prefix for console logging.
   *
   * @returns Formatted prefix with time and tracker name: [HH:MM:SS] [gemini-tracker]
   */
  getPrefix(): string {
    return `[${new Date().toTimeString().slice(0, 8)}] [gemini-tracker]`;
  },

  /**
   * Gets the current timestamp in ISO 8601 UTC format.
   *
   * @returns Formatted timestamp string in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)
   */
  getCurrentTimestamp(): string {
    try {
      return new Date().toISOString();
    } catch (e) {
      console.error(`${Utils.getPrefix()} Error getting ISO UTC timestamp:`, e);
      return new Date().toISOString();
    }
  },

  /**
   * Determines if a URL is a valid Gemini chat URL.
   * Valid URLs follow the pattern: https://gemini.google.com/app/[hexadecimal-id]
   * or https://gemini.google.com/gem/[gem_id]/[hexadecimal-id]
   * or https://gemini.google.com/u/[n]/app/[hexadecimal-id]
   * or https://gemini.google.com/u/[n]/gem/[gem_id]/[hexadecimal-id]
   * and may optionally include query parameters.
   *
   * @param url - The URL to check
   * @returns True if the URL matches the expected pattern for a Gemini chat
   */
  isValidChatUrl(url: string): boolean {
    const regularChatUrlPattern = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/app\/[a-f0-9]+(\?.*)?$/;
    const gemChatUrlPattern = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/[a-f0-9]+\/[a-f0-9]+(\?.*)?$/;
    return regularChatUrlPattern.test(url) || gemChatUrlPattern.test(url);
  },

  /**
   * Determines if a URL is a Gem chat URL.
   * Valid Gem chat URLs follow the pattern: https://gemini.google.com/gem/[gem_id]/[hexadecimal-id]
   * or https://gemini.google.com/u/[n]/gem/[gem_id]/[hexadecimal-id]
   *
   * @param url - The URL to check
   * @returns True if the URL matches the expected pattern for a Gem chat
   */
  isGemChatUrl(url: string): boolean {
    const gemChatUrlPattern = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/[a-f0-9]+\/[a-f0-9]+(\?.*)?$/;
    return gemChatUrlPattern.test(url);
  },

  /**
   * Determines if a URL is a Gem homepage URL.
   * Valid Gem homepage URLs follow the pattern: https://gemini.google.com/gem/[gem_id]
   * or https://gemini.google.com/u/[n]/gem/[gem_id]
   *
   * @param url - The URL to check
   * @returns True if the URL matches the expected pattern for a Gem homepage
   */
  isGemHomepageUrl(url: string): boolean {
    const gemHomepagePattern = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/[a-f0-9]+(\?.*)?$/;
    return gemHomepagePattern.test(url);
  },

  /**
   * Extracts the Gem ID from a Gem URL.
   *
   * @param url - The URL to extract from
   * @returns The Gem ID or null if not a Gem URL
   */
  extractGemId(url: string): string | null {
    if (!url) return null;

    const gemUrlRegex = /^https:\/\/gemini\.google\.com(\/u\/\d+)?\/gem\/([a-f0-9]+)/;
    const match = url.match(gemUrlRegex);

    if (match?.[2]) {
      return match[2];
    }

    return null;
  },

  /**
   * Determines if a URL is the base Gemini app URL (with potential parameters).
   * The base URL is used for starting new chats.
   * Also supports the /u/[n]/ pattern for multiple Google accounts.
   *
   * @param url - The URL to check
   * @returns True if the URL is the base app URL (with or without parameters)
   */
  isBaseAppUrl(url: string): boolean {
    if (url === CONFIG.BASE_URL) return true;
    if (url.startsWith(CONFIG.BASE_URL + "?")) return true;

    const userAccountPattern = /^https:\/\/gemini\.google\.com\/u\/\d+\/app(\?.*)?$/;
    return userAccountPattern.test(url);
  },

  /**
   * Determines if a URL transition represents new chat creation that should preserve observers.
   * This helps distinguish between navigation away from chat context vs. new chat creation.
   *
   * @param fromUrl - The previous URL
   * @param toUrl - The current URL
   * @returns True if this transition should preserve observers for chat detection
   */
  isNewChatTransition(fromUrl: string, toUrl: string): boolean {
    const isRegularNewChat =
      this.isBaseAppUrl(fromUrl) && this.isValidChatUrl(toUrl) && !this.isGemChatUrl(toUrl);

    const isGemNewChat =
      this.isGemHomepageUrl(fromUrl) &&
      this.isGemChatUrl(toUrl) &&
      this.extractGemId(fromUrl) === this.extractGemId(toUrl);

    return isRegularNewChat || isGemNewChat;
  },

  /**
   * Normalizes whitespace in a string by collapsing all consecutive whitespace
   * characters (including line breaks, spaces, tabs) into single spaces and trims the result.
   *
   * @param str - The string to normalize
   * @returns The normalized string with collapsed whitespace
   */
  normalizeWhitespace(str: string): string {
    if (!str) return "";
    return str.replace(/\s+/g, " ").trim();
  },

  /**
   * Checks if a text is a truncated version of another text by comparing
   * their normalized whitespace versions.
   *
   * @param originalText - The original, potentially longer text
   * @param truncatedText - The potentially truncated text to check
   * @returns True if truncatedText appears to be a truncated version of originalText
   */
  isTruncatedVersion(originalText: string, truncatedText: string): boolean {
    console.log(`${Utils.getPrefix()} --- Standard isTruncatedVersion called ---`);
    console.log(`${Utils.getPrefix()} Standard originalText: "${originalText}"`);
    console.log(`${Utils.getPrefix()} Standard truncatedText: "${truncatedText}"`);

    if (!originalText || !truncatedText) {
      console.log(`${Utils.getPrefix()} Standard: Early return false - missing text`);
      return false;
    }

    const normalizedOriginal = this.normalizeWhitespace(originalText);
    const normalizedTruncated = this.normalizeWhitespace(truncatedText);

    console.log(`${Utils.getPrefix()} Standard normalized original: "${normalizedOriginal}"`);
    console.log(`${Utils.getPrefix()} Standard normalized truncated: "${normalizedTruncated}"`);

    const result = normalizedOriginal.startsWith(normalizedTruncated);
    console.log(`${Utils.getPrefix()} Standard startsWith result: ${result}`);
    console.log(`${Utils.getPrefix()} --- Standard comparison complete ---`);

    return result;
  },

  /**
   * Enhanced version of isTruncatedVersion that can handle cases where the original text
   * contains code blocks and the placeholder has been modified.
   *
   * @param originalText - The original, potentially longer text (may be placeholder with [attached blockcode])
   * @param truncatedText - The potentially truncated text to check
   * @param realOriginalText - The actual original text without placeholders, if available
   * @returns True if truncatedText appears to be a truncated version of the original
   */
  isTruncatedVersionEnhanced(
    originalText: string,
    truncatedText: string,
    realOriginalText: string | null = null
  ): boolean {
    console.log(`${Utils.getPrefix()} === isTruncatedVersionEnhanced called ===`);
    console.log(`${Utils.getPrefix()} Input originalText: "${originalText}"`);
    console.log(`${Utils.getPrefix()} Input truncatedText: "${truncatedText}"`);
    console.log(`${Utils.getPrefix()} Input realOriginalText: "${realOriginalText}"`);

    if (!originalText || !truncatedText) {
      console.log(`${Utils.getPrefix()} Early return: missing originalText or truncatedText`);
      return false;
    }

    if (realOriginalText?.trim()) {
      console.log(`${Utils.getPrefix()} Using realOriginalText for enhanced comparison`);

      const normalizedRealOriginal = this.normalizeWhitespace(realOriginalText);
      const normalizedTruncated = this.normalizeWhitespace(truncatedText);

      console.log(`${Utils.getPrefix()} Normalized realOriginal: "${normalizedRealOriginal}"`);
      console.log(`${Utils.getPrefix()} Normalized truncated: "${normalizedTruncated}"`);

      const startsWithResult = normalizedRealOriginal.startsWith(normalizedTruncated);
      console.log(`${Utils.getPrefix()} realOriginal.startsWith(truncated): ${startsWithResult}`);

      if (startsWithResult) {
        console.log(`${Utils.getPrefix()} DECISION: Title is a PLACEHOLDER (should be ignored)`);
      } else {
        console.log(`${Utils.getPrefix()} DECISION: Title is a REAL TITLE (should be kept)`);
      }

      console.log(`${Utils.getPrefix()} === Enhanced comparison complete ===`);
      return startsWithResult;
    }

    console.log(`${Utils.getPrefix()} No realOriginalText available, falling back to standard comparison`);
    const standardResult = this.isTruncatedVersion(originalText, truncatedText);
    console.log(`${Utils.getPrefix()} Standard comparison result: ${standardResult}`);
    console.log(`${Utils.getPrefix()} === Fallback comparison complete ===`);

    return standardResult;
  },

  /**
   * Parses text and replaces codeblocks with placeholders while preserving non-codeblock text.
   * Handles multiple codeblocks and nested backticks within codeblocks.
   *
   * @param text - The text to process
   * @returns Object with processedText, hasCodeblocks, and codeblockCount properties
   */
  processCodeblocks(text: string): CodeblockResult {
    if (!text) {
      return { processedText: "", hasCodeblocks: false, codeblockCount: 0 };
    }

    const codeblockRegex = /^```[^\r\n]*(?:\r\n|\r|\n)([\s\S]*?)^```\s*$/gm;

    let hasCodeblocks = false;
    let codeblockCount = 0;
    let lastIndex = 0;
    const result: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = codeblockRegex.exec(text)) !== null) {
      hasCodeblocks = true;
      codeblockCount++;

      result.push(text.substring(lastIndex, match.index));
      result.push(`[codeblock-${codeblockCount}]`);

      lastIndex = match.index + match[0].length;

      console.log(
        `${this.getPrefix()} Found codeblock ${codeblockCount} from position ${match.index} to ${lastIndex}`
      );
    }

    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }

    const processedText = result.join("").trim();
    console.log(
      `${this.getPrefix()} Processed ${codeblockCount} codeblock(s). Final text: "${processedText}"`
    );

    return {
      processedText,
      hasCodeblocks,
      codeblockCount,
    };
  },
};
