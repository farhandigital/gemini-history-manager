import { Utils } from "./utils.js";
import { SELECTORS } from "./selectors.js";

export interface AccountInfo {
  name: string;
  email: string;
}

export const InputExtractor = {
  /**
   * Extracts the prompt text from the input area.
   * If the prompt contains code blocks delimited by triple backticks,
   * they will be replaced with placeholders while preserving other text.
   *
   * @returns The extracted prompt text or empty string if not found
   */
  getPromptText(): string {
    const promptElement = document.querySelector<HTMLElement>(SELECTORS.PROMPT_INPUT);
    if (promptElement) {
      const text = promptElement.innerText.trim();

      const result = Utils.processCodeblocks(text);

      if (result.hasCodeblocks) {
        console.log(
          `${Utils.getPrefix()} Extracted prompt text with ${result.codeblockCount} codeblock(s): "${result.processedText}"`
        );
        return result.processedText;
      }

      console.log(`${Utils.getPrefix()} Extracted prompt text: "${text}"`);
      return text;
    } else {
      console.warn(`${Utils.getPrefix()} Could not find prompt input element ('${SELECTORS.PROMPT_INPUT}').`);
      return "";
    }
  },

  /**
   * Extracts the original prompt text limited to 200 characters.
   * This is useful for title comparison when the main getPromptText() returns
   * a truncated version with [attached blockcode] placeholder.
   *
   * @returns The original prompt text limited to 200 characters, or empty string if not found
   */
  getOriginalPromptText(): string {
    const promptElement = document.querySelector<HTMLElement>(SELECTORS.PROMPT_INPUT);
    if (promptElement) {
      const text = promptElement.innerText.trim();

      const limitedText = text.length > 200 ? text.substring(0, 200) : text;

      console.log(
        `${Utils.getPrefix()} Extracted original prompt text (limited to 200 chars): "${limitedText}"`
      );
      return limitedText;
    } else {
      console.warn(`${Utils.getPrefix()} Could not find prompt input element for original text extraction.`);
      return "";
    }
  },

  /**
   * Extracts the filenames of attached files from the UI.
   *
   * @returns Array of filenames (strings) or empty array if none found
   */
  getAttachedFiles(): string[] {
    const fileElements = document.querySelectorAll<HTMLElement>(SELECTORS.ATTACHED_FILE);
    if (fileElements.length > 0) {
      const filenames = Array.from(fileElements).map((el) => {
        return el.getAttribute("title") ?? el.innerText.trim();
      });
      console.log(`${Utils.getPrefix()} Extracted attached filenames:`, filenames);
      return filenames;
    } else {
      console.log(`${Utils.getPrefix()} No attached file elements found.`);
      return [];
    }
  },

  /**
   * Extracts the user account name and email from the UI.
   *
   * @returns Object with name and email properties
   */
  getAccountInfo(): AccountInfo {
    console.log(`${Utils.getPrefix()} Attempting to extract account information...`);

    const accountLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(SELECTORS.ACCOUNT_LINK));
    let accountElement: Element | null = null;
    let ariaLabel: string | null = null;

    // Strategy 1: Find by link to accounts.google.com with aria-label containing email
    for (const link of accountLinks) {
      const label = link.getAttribute("aria-label");
      if (label?.includes("@")) {
        accountElement = link;
        ariaLabel = label;
        console.log(
          `${Utils.getPrefix()} Found account element via accounts.google.com link with email in aria-label`
        );
        break;
      }
    }

    // Strategy 2: Find by profile image
    if (!accountElement) {
      const profileImages = document.querySelectorAll<HTMLImageElement>(SELECTORS.PROFILE_IMAGE);
      for (const img of profileImages) {
        const parent = img.closest<HTMLAnchorElement>("a[aria-label]");
        if (parent) {
          const label = parent.getAttribute("aria-label");
          if (label?.includes("@")) {
            accountElement = parent;
            ariaLabel = label;
            console.log(
              `${Utils.getPrefix()} Found account element via profile image with parent having email in aria-label`
            );
            break;
          }
        }
      }
    }

    // Strategy 3: Find by user menu structure
    if (!accountElement) {
      const potentialContainers = document.querySelectorAll(SELECTORS.ACCOUNT_CONTAINER);
      for (const container of potentialContainers) {
        const accountLink = container.querySelector<HTMLAnchorElement>("a[aria-label]");
        if (accountLink) {
          const label = accountLink.getAttribute("aria-label");
          if (label?.includes("@")) {
            accountElement = accountLink;
            ariaLabel = label;
            console.log(`${Utils.getPrefix()} Found account element via container class structure`);
            break;
          }
        }
      }
    }

    // Strategy 4: Broader approach — any element with an aria-label containing an email address
    if (!accountElement) {
      const elementsWithAriaLabel = document.querySelectorAll("[aria-label]");
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

      for (const el of elementsWithAriaLabel) {
        const label = el.getAttribute("aria-label");
        if (label && emailRegex.test(label)) {
          accountElement = el;
          ariaLabel = label;
          console.log(`${Utils.getPrefix()} Found account element via generic aria-label search`);
          break;
        }
      }
    }

    if (accountElement && ariaLabel) {
      console.log(`${Utils.getPrefix()} Found aria-label with potential account info: "${ariaLabel}"`);
      try {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const emailMatch = ariaLabel.match(emailRegex);

        if (!emailMatch) {
          console.warn(`${Utils.getPrefix()} Could not find email in aria-label`);
          return { name: "Unknown", email: "Unknown" };
        }

        const email = emailMatch[0];

        let name = "Unknown";
        const parenthesesPattern = /[^:]*:\s*(.*?)\s+\([^)]*@[^)]*\)/i;
        const nameMatch = ariaLabel.match(parenthesesPattern);

        if (nameMatch?.[1]) {
          name = nameMatch[1].trim();
        } else {
          const withoutEmail = ariaLabel.replace(email, "").trim();
          const colonIndex = withoutEmail.lastIndexOf(":");

          if (colonIndex !== -1) {
            name = withoutEmail.substring(colonIndex + 1).trim();
            name = name.replace(/^\s*[(:\-–—]\s*|\s*[)\-–—]\s*$/g, "");
          }
        }

        console.log(
          `${Utils.getPrefix()} Successfully extracted account info - Name: "${name}", Email: "${email}"`
        );
        return { name, email };
      } catch (e) {
        console.error(`${Utils.getPrefix()} Error parsing account information:`, e);
        return { name: "Unknown", email: "Unknown" };
      }
    }

    console.warn(`${Utils.getPrefix()} Could not find any element with account information`);
    return { name: "Unknown", email: "Unknown" };
  },
};
