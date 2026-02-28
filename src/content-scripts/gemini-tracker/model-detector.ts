import { MODEL_NAMES, TOOL_NAMES, GEMINI_PLANS, type GeminiPlan } from "./constants.js";
import { Utils } from "./utils.js";
import { SELECTORS } from "./selectors.js";

type GoogleColorName = "google-yellow" | "google-green" | "google-blue" | "google-red";

const GOOGLE_COLORS: Record<string, GoogleColorName> = {
  // Yellow variations
  "#f6ad01": "google-yellow",
  "#f9ab00": "google-yellow",
  "rgb(246,173,1)": "google-yellow",
  "rgb(249,171,0)": "google-yellow",

  // Green variations
  "#249a41": "google-green",
  "#34a853": "google-green",
  "rgb(36,154,65)": "google-green",
  "rgb(52,168,83)": "google-green",

  // Blue variations
  "#3174f1": "google-blue",
  "#4285f4": "google-blue",
  "rgb(49,116,241)": "google-blue",
  "rgb(66,133,244)": "google-blue",

  // Red variations
  "#e92d18": "google-red",
  "#ea4335": "google-red",
  "rgb(233,45,24)": "google-red",
  "rgb(234,67,53)": "google-red",
};

export interface ModelInfo {
  model: string;
  tool: string | null;
}

export const ModelDetector = {
  /**
   * Helper function to normalize color values for comparison.
   * Handles hex, rgb, rgba, hsl, hsla formats.
   */
  normalizeColor(colorStr: string | null | undefined): GoogleColorName | null {
    if (!colorStr) return null;

    const normalized = colorStr.replace(/\s/g, "").toLowerCase();
    return GOOGLE_COLORS[normalized] ?? null;
  },

  /**
   * More resilient Google logo SVG detection.
   * Uses multiple strategies to identify the Google logo.
   */
  detectGoogleLogoSvg(doc: Document): SVGElement | null {
    const accountSelectors = [
      SELECTORS.GOOGLE_ACCOUNT_AREA,
      SELECTORS.GOOGLE_BAR_CLASS,
      SELECTORS.GOOGLE_BAR_ANY_CLASS,
    ];

    for (const selector of accountSelectors) {
      const accountElements = doc.querySelectorAll(selector);

      for (const accountEl of accountElements) {
        const svgs = accountEl.querySelectorAll("svg");

        for (const svg of svgs) {
          if (this.isGoogleLogoSvg(svg)) {
            return svg;
          }
        }
      }
    }

    const allSvgs = doc.querySelectorAll("svg");
    for (const svg of allSvgs) {
      if (this.isGoogleLogoSvg(svg)) {
        return svg;
      }
    }

    return null;
  },

  /**
   * Determines if an SVG element is likely the Google logo.
   * Uses multiple heuristics for resilience.
   */
  isGoogleLogoSvg(svg: SVGElement | null): boolean {
    if (!svg) return false;

    const viewBox = svg.getAttribute("viewBox");
    const width = svg.getAttribute("width");
    const height = svg.getAttribute("height");

    const hasSquareDimensions =
      (viewBox !== null && /^0\s+0\s+\d+\s+\d+$/.test(viewBox.trim())) ||
      (width !== null && height !== null && Math.abs(parseInt(width) - parseInt(height)) <= 10);

    if (!hasSquareDimensions) return false;

    const paths = svg.querySelectorAll('path[fill], path[style*="fill"]');
    if (paths.length < 3) return false;

    let googleColorCount = 0;
    const seenColors = new Set<GoogleColorName>();

    for (const path of paths) {
      const styleAttr = path.getAttribute("style");
      const fillFromStyle = styleAttr?.match(/fill:\s*([^;]+)/)?.[1];
      const fill = path.getAttribute("fill") ?? fillFromStyle;

      const normalizedColor = this.normalizeColor(fill?.trim());
      if (normalizedColor !== null && !seenColors.has(normalizedColor)) {
        seenColors.add(normalizedColor);
        googleColorCount++;
      }
    }

    return googleColorCount >= 3;
  },

  /**
   * Detects the current Gemini plan based on UI elements.
   *
   * @param doc - The document object to search within (defaults to the current document).
   * @returns GEMINI_PLANS.PRO ("Pro"), GEMINI_PLANS.FREE ("Free"), or null if the plan cannot be determined.
   */
  detectGeminiPlan(doc: Document = document): GeminiPlan | null {
    // --- 1. Detect "Gemini Pro" via Google logo SVG (Primary method) ---
    const googleLogoSvg = this.detectGoogleLogoSvg(doc);
    if (googleLogoSvg) {
      console.log(`${Utils.getPrefix()} Detected Pro plan via Google logo SVG`);
      return GEMINI_PLANS.PRO;
    }

    // --- 2. Detect "Gemini Pro" via pillbox button (Secondary method) ---
    const pillButtons = doc.querySelectorAll(SELECTORS.PLAN_PRO_PILL);

    for (const button of pillButtons) {
      const buttonTextContent = button.textContent;
      if (buttonTextContent) {
        const normalizedText = buttonTextContent.trim().toUpperCase();
        if (normalizedText === GEMINI_PLANS.PRO.toUpperCase()) {
          const isDisabled =
            button.hasAttribute("disabled") || button.classList.contains("mat-mdc-button-disabled");
          if (isDisabled) {
            console.log(`${Utils.getPrefix()} Detected Pro plan via pillbox button`);
            return GEMINI_PLANS.PRO;
          }
        }
      }
    }

    // --- 3. Detect "Gemini Free" via upgrade button ---
    const upgradeButtonSelectors = [
      SELECTORS.PLAN_UPSELL_BUTTON,
      SELECTORS.PLAN_UPGRADE_BUTTON_ARIA,
      SELECTORS.PLAN_UPSELL_COMPONENT,
    ];

    for (const selector of upgradeButtonSelectors) {
      try {
        const upgradeButton = doc.querySelector(selector);
        if (upgradeButton) {
          const ariaLabel = upgradeButton.getAttribute("aria-label") ?? "";
          const textContent = upgradeButton.textContent ?? "";
          const title = upgradeButton.getAttribute("title") ?? "";

          const hasUpgradeText = [ariaLabel, textContent, title].some((text) =>
            text.toLowerCase().includes(SELECTORS.PLAN_KEYWORD_UPGRADE)
          );

          if (hasUpgradeText) {
            console.log(`${Utils.getPrefix()} Detected Free plan via upgrade button (${selector})`);
            return GEMINI_PLANS.FREE;
          }
        }
      } catch {
        // Some selectors might not be supported, continue to next
        continue;
      }
    }

    // Additional strategy: Find buttons by text content
    try {
      const allButtons = doc.querySelectorAll("button");
      for (const button of allButtons) {
        const textContent = button.textContent ?? "";
        if (textContent.toLowerCase().includes(SELECTORS.PLAN_KEYWORD_UPGRADE)) {
          console.log(`${Utils.getPrefix()} Detected Free plan via button text content`);
          return GEMINI_PLANS.FREE;
        }
      }
    } catch {
      // Continue if this approach fails
    }

    // --- 4. Detect "Gemini Free" as fallback ---
    const accountSelectors = [
      SELECTORS.ACCOUNT_GOOGLE_AREA,
      SELECTORS.ACCOUNT_GOOGLE_AREA_CLASS,
      SELECTORS.ACCOUNT_GOOGLE_BAR,
      SELECTORS.ACCOUNT_LINK,
      SELECTORS.ACCOUNT_WITH_IMAGE,
    ];

    for (const selector of accountSelectors) {
      try {
        const accountArea = doc.querySelector(selector);
        if (accountArea) {
          console.log(
            `${Utils.getPrefix()} Detected Free plan as fallback (account area found via ${selector} but no Pro indicators)`
          );
          return GEMINI_PLANS.FREE;
        }
      } catch {
        continue;
      }
    }

    console.warn(`${Utils.getPrefix()} Could not determine Gemini plan from any known indicators`);
    return null;
  },

  /**
   * Normalizes a tool name to a consistent format by matching against known TOOL_NAMES keys.
   * If a match is found, the corresponding TOOL_NAMES value is returned and logged via
   * Utils.getPrefix. If no match is found, the original rawToolName is returned unchanged.
   *
   * Note: an empty string input is intentionally returned as-is (no normalization is
   * attempted and no console output is produced for empty input).
   *
   * @param rawToolName - The raw tool name from the UI; may be an empty string
   * @returns The normalized tool name, or the original rawToolName (including "") if no match
   */
  normalizeTool(rawToolName: string): string {
    if (!rawToolName) return rawToolName;

    const sortedKeys = Object.keys(TOOL_NAMES).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (rawToolName.toLowerCase().includes(key.toLowerCase())) {
        const toolKey = key as keyof typeof TOOL_NAMES;
        console.log(`${Utils.getPrefix()} Normalized tool: "${rawToolName}" -> "${TOOL_NAMES[toolKey]}"`);
        return TOOL_NAMES[toolKey];
      }
    }

    console.log(`${Utils.getPrefix()} Tool "${rawToolName}" didn't match known tools, using raw name`);
    return rawToolName;
  },

  /**
   * Checks if any tools are activated in the toolbox drawer.
   *
   * @returns The activated tool name, or null if no tool is activated
   */
  checkForSpecialTools(): string | null {
    console.log(`${Utils.getPrefix()} Checking for activated tools...`);

    const deselectButton = document.querySelector(SELECTORS.TOOLBOX_DESELECT_BUTTON);

    if (deselectButton) {
      // Method 1: Parse from aria-label (most reliable)
      const ariaLabel = deselectButton.getAttribute("aria-label") ?? "";
      const match = ariaLabel.match(/^Deselect (.+)$/);

      if (match?.[1]) {
        const toolName = match[1];
        console.log(`${Utils.getPrefix()} Found activated tool via aria-label: "${toolName}"`);
        return this.normalizeTool(toolName);
      }

      // Method 2: Fallback to label text
      const labelElement = deselectButton.querySelector(SELECTORS.TOOLBOX_DESELECT_LABEL);
      if (labelElement?.textContent) {
        const labelText = labelElement.textContent.trim();
        if (labelText) {
          console.log(`${Utils.getPrefix()} Found activated tool via label: "${labelText}"`);
          return this.normalizeTool(labelText);
        }
      }
    }

    // LEGACY: Check for old UI structure (pre-Nov 2025)
    const activatedButtons = document.querySelectorAll(SELECTORS.TOOLBOX_ITEM_BUTTON_ACTIVE);
    console.log(
      `${Utils.getPrefix()} Found ${activatedButtons.length} activated tool buttons (legacy check)`
    );

    for (const button of activatedButtons) {
      const labelElement = button.querySelector(SELECTORS.TOOLBOX_BUTTON_LABEL);
      if (!labelElement?.textContent) continue;

      const buttonText = labelElement.textContent.trim();
      if (!buttonText) continue;
      console.log(`${Utils.getPrefix()} Found activated button with text: "${buttonText}"`);
      return this.normalizeTool(buttonText);
    }

    // Alternative legacy detection via icons
    const toolboxDrawer = document.querySelector(SELECTORS.TOOLBOX_DRAWER);
    if (toolboxDrawer) {
      const deepResearchIcon = toolboxDrawer.querySelector(SELECTORS.TOOLBOX_DEEP_RESEARCH_ICON);
      if (deepResearchIcon) {
        const deepResearchButton = deepResearchIcon.closest(SELECTORS.TOOLBOX_ITEM_BUTTON_ACTIVE);
        if (deepResearchButton) {
          console.log(`${Utils.getPrefix()} Deep Research tool is activated (detected via icon)`);
          return this.normalizeTool("Deep Research");
        }
      }

      const videoIcon = toolboxDrawer.querySelector(SELECTORS.TOOLBOX_VIDEO_ICON);
      if (videoIcon) {
        const videoButton = videoIcon.closest(SELECTORS.TOOLBOX_ITEM_BUTTON_ACTIVE);
        if (videoButton) {
          console.log(`${Utils.getPrefix()} Video tool is activated (detected via icon)`);
          return this.normalizeTool("Create videos");
        }
      }
    }

    return null;
  },

  /**
   * Attempts to detect the currently selected Gemini model from the UI.
   * Also checks for activated tools and returns both model and tool information.
   *
   * @returns Object with detected model name and optional tool
   */
  getCurrentModelName(): ModelInfo {
    console.log(`${Utils.getPrefix()} Attempting to get current model name...`);

    const activatedTool = this.checkForSpecialTools();
    if (activatedTool) {
      console.log(`${Utils.getPrefix()} Tool activated: ${activatedTool}`);
    }

    let rawText: string | null = null;
    let foundVia: string | null = null;

    // Try #1: New input area model switcher (Nov 2025+)
    const inputAreaSwitcher = document.querySelector(SELECTORS.MODEL_INPUT_AREA_SWITCHER);
    if (inputAreaSwitcher?.textContent) {
      rawText = inputAreaSwitcher.textContent.trim();
      foundVia = "Input Area Model Switcher";
      console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
    } else {
      console.log(`${Utils.getPrefix()} Model not found via Input Area Model Switcher.`);
      // Try #2: Generic bard-mode-switcher label container
      const modeSwitcherLabel = document.querySelector(SELECTORS.MODEL_MODE_SWITCHER_LABEL);
      if (modeSwitcherLabel?.textContent) {
        rawText = modeSwitcherLabel.textContent.trim();
        foundVia = "Mode Switcher Label";
        console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
      } else {
        console.log(`${Utils.getPrefix()} Model not found via Mode Switcher Label.`);
        // Try #3: Legacy button structure
        const modelButton = document.querySelector(SELECTORS.MODEL_LEGACY_BUTTON);
        if (modelButton?.textContent) {
          rawText = modelButton.textContent.trim();
          foundVia = "Legacy Button Structure";
          console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
        } else {
          console.log(`${Utils.getPrefix()} Model not found via Legacy Button Structure.`);
          // Try #4: data-test-id
          const modelElement = document.querySelector(SELECTORS.MODEL_DATA_TEST_ID);
          if (modelElement?.textContent) {
            rawText = modelElement.textContent.trim();
            foundVia = "Data-Test-ID";
            console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
          } else {
            console.log(`${Utils.getPrefix()} Model not found via Data-Test-ID.`);
            // Try #5: Fallback selector
            const fallbackElement = document.querySelector(SELECTORS.MODEL_FALLBACK);
            if (fallbackElement?.textContent) {
              rawText = fallbackElement.textContent.trim();
              foundVia = "Fallback Selector (.current-mode-title)";
              console.log(`${Utils.getPrefix()} Model raw text found via ${foundVia}: "${rawText}"`);
            } else {
              console.log(`${Utils.getPrefix()} Model not found via Fallback Selector.`);
            }
          }
        }
      }
    }

    let model = "Unknown";
    if (rawText) {
      const sortedKeys = Object.keys(MODEL_NAMES).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (rawText.startsWith(key)) {
          const modelKey = key as keyof typeof MODEL_NAMES;
          model = MODEL_NAMES[modelKey];
          console.log(`${Utils.getPrefix()} Matched known model: "${model}" from raw text "${rawText}"`);
          break;
        }
      }
      if (model === "Unknown") {
        console.log(
          `${Utils.getPrefix()} Raw text "${rawText}" didn't match known prefixes, using raw text as model name.`
        );
        model = rawText;
      }
    } else {
      console.warn(`${Utils.getPrefix()} Could not determine current model name from any known selector.`);
    }

    return { model, tool: activatedTool };
  },
};
