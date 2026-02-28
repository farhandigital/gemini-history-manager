import { Utils } from "./utils.js";

// Selectors for the container holding the Gem's name.
// Using multiple selectors to adapt to different DOM structures
const GEM_NAME_SELECTORS = [
  ".bot-info-card .bot-name-container",
  ".bot-info-container .bot-name-container",
  ".bot-name-and-description .bot-name-container",
] as const;

// Backup selectors for finding gem names in response containers
const RESPONSE_GEM_NAME_SELECTORS = [
  ".response-container-content .bot-name .bot-name-text",
  ".response-container .bot-name-text",
  ".response-container-content .bot-name",
  ".bot-name-text",
  ".bot-name",
] as const;

export interface GemInfo {
  gemId: string;
  gemName: string | null;
  gemUrl: string;
}

export const GemDetector = {
  /**
   * MutationObserver instance for watching DOM changes
   */
  observer: null as MutationObserver | null,

  /**
   * Extracts the Gem's name from the given DOM element.
   * It tries multiple approaches to extract the name because the DOM structure might vary.
   *
   * @param element - The DOM element containing the Gem's name.
   * @returns The trimmed Gem name, or null if not found.
   */
  getGemName(element: Element | null): string | null {
    if (!element) {
      return null;
    }

    // First try: Get the entire text content of the element
    const fullText = element.textContent?.trim();
    if (fullText) {
      console.log(`${Utils.getPrefix()} Extracted gem name from full text content: "${fullText}"`);
      return fullText;
    }

    // Second try: Look for direct text nodes
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const trimmedText = node.textContent?.trim();
        if (trimmedText) {
          console.log(`${Utils.getPrefix()} Extracted gem name from direct text node: "${trimmedText}"`);
          return trimmedText;
        }
      }
    }

    // Third try: Look for any first-level elements with text content
    for (const child of element.children) {
      const childText = child.textContent?.trim();
      if (childText) {
        console.log(`${Utils.getPrefix()} Extracted gem name from child element: "${childText}"`);
        return childText;
      }
    }

    return null;
  },

  /**
   * Extracts the Gem name directly from the DOM at the moment of calling.
   * Tries multiple selectors to adapt to different DOM structures.
   *
   * @returns The detected gem name or null if not found
   */
  extractCurrentGemName(): string | null {
    let gemNameElement: Element | null = null;

    for (const selector of GEM_NAME_SELECTORS) {
      gemNameElement = document.querySelector(selector);
      if (gemNameElement) {
        console.log(`${Utils.getPrefix()} Found gem name element using primary selector: ${selector}`);
        break;
      }
    }

    if (gemNameElement) {
      const detectedName = this.getGemName(gemNameElement);

      if (detectedName) {
        console.log(`${Utils.getPrefix()} Extracted Gem name from primary source: "${detectedName}"`);
        return detectedName;
      } else {
        console.warn(
          `${Utils.getPrefix()} Primary gem name container found, but the name text could not be extracted as expected.`
        );
        console.debug(`${Utils.getPrefix()} Primary gem container HTML: ${gemNameElement.innerHTML}`);
      }
    }

    return this.extractGemNameFromResponses();
  },

  /**
   * Backup method to extract gem name from response containers.
   * This is useful when users send prompts quickly before the gem info section loads,
   * but responses do contain the gem name.
   *
   * @returns The detected gem name or null if not found
   */
  extractGemNameFromResponses(): string | null {
    let responseGemElement: Element | null = null;

    for (const selector of RESPONSE_GEM_NAME_SELECTORS) {
      const elements = document.querySelectorAll(selector);

      if (elements.length > 0) {
        // Use the most recent (last) response
        responseGemElement = elements[elements.length - 1] ?? null;
        console.log(`${Utils.getPrefix()} Found gem name in response using selector: ${selector}`);
        break;
      }
    }

    if (responseGemElement) {
      const detectedName = this.getGemName(responseGemElement);

      if (detectedName) {
        console.log(`${Utils.getPrefix()} Extracted Gem name from response: "${detectedName}"`);
        return detectedName;
      } else {
        console.warn(
          `${Utils.getPrefix()} Response gem name container found, but the name text could not be extracted as expected.`
        );
        console.debug(`${Utils.getPrefix()} Response gem container HTML: ${responseGemElement.innerHTML}`);
      }
    }

    return null;
  },

  /**
   * Note: We no longer need to observe for gem name changes since we'll extract the name when needed.
   * This method is kept for compatibility but doesn't start any observer.
   */
  startObserver(): void {
    console.log(`${Utils.getPrefix()} Gem detection observer not needed with on-demand extraction approach.`);
  },

  /**
   * Resets the gem detector state.
   * Should be called when navigating to a different page/state.
   */
  reset(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      console.log(`${Utils.getPrefix()} Gem detection observer reset.`);
    }
  },

  /**
   * Gets the current gem information by extracting it at the moment this function is called.
   *
   * @returns Object with gemId and gemName if on a gem page, null otherwise
   */
  getCurrentGemInfo(): GemInfo | null {
    const url = window.location.href;
    const gemId = Utils.extractGemId(url);

    if (gemId) {
      const gemName = this.extractCurrentGemName();

      const gemInfo: GemInfo = {
        gemId,
        gemName,
        gemUrl: `https://gemini.google.com/gem/${gemId}`,
      };

      if (!gemName) {
        console.log(`${Utils.getPrefix()} Gem name could not be extracted, performing debug scan`);
        this.debugGemDetection();
      }

      return gemInfo;
    }

    return null;
  },

  /**
   * Debug function to help diagnose gem detection issues.
   * Logs detailed information about potential gem name elements.
   */
  debugGemDetection(): void {
    console.log(`${Utils.getPrefix()} Running gem detection debug scan...`);

    for (const selector of GEM_NAME_SELECTORS) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`${Utils.getPrefix()} Found element matching selector: ${selector}`);
        console.log(`${Utils.getPrefix()} Element textContent: "${element.textContent?.trim()}"`);
        console.log(`${Utils.getPrefix()} Element innerHTML: ${element.innerHTML}`);

        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              console.log(`${Utils.getPrefix()} Direct text node found: "${text}"`);
            }
          }
        }

        const extractedName = this.getGemName(element);
        console.log(`${Utils.getPrefix()} Extraction result: ${extractedName ?? "No name extracted"}`);
      } else {
        console.log(`${Utils.getPrefix()} No element found for selector: ${selector}`);
      }
    }

    const potentialContainers = document.querySelectorAll("[class*='bot-name'], [class*='name-container']");
    console.log(
      `${Utils.getPrefix()} Found ${potentialContainers.length} potential name containers with alternative selectors`
    );

    const maxContainers = Math.min(potentialContainers.length, 5);
    for (let i = 0; i < maxContainers; i++) {
      const container = potentialContainers[i];
      if (!container) continue;
      console.log(`${Utils.getPrefix()} Alternative container ${i + 1} class: ${container.className}`);
      console.log(
        `${Utils.getPrefix()} Alternative container ${i + 1} text: "${container.textContent?.trim()}"`
      );
    }
  },
};
