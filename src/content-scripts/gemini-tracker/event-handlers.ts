import { STATE } from "./state.js";
import { Utils } from "./utils.js";
import { StatusIndicator } from "./status-indicator.js";
import { DomObserver } from "./observer/dom-observer.js";
import { GemDetector } from "./gem-detector.js";
import { ModelDetector } from "./model-detector.js";
import { InputExtractor } from "./input-extractor.js";
import { SELECTORS } from "./selectors.js";

export const EventHandlers = {
  /**
   * Checks if the target is a valid send button.
   *
   * @param target - The DOM element that was clicked
   * @returns The send button element if found and valid, false otherwise
   */
  isSendButton(target: EventTarget | null): Element | false {
    if (!(target instanceof Element)) return false;

    const sendButton = target.closest(SELECTORS.SEND_BUTTON);

    if (!sendButton) {
      return false;
    }

    if (sendButton.getAttribute("aria-disabled") === "true") {
      console.log(`${Utils.getPrefix()} [EventHandlers] Send button is disabled. Ignoring click.`);
      return false;
    }

    return sendButton;
  },

  /**
   * Prepares for tracking a new chat.
   * Captures all necessary information once before the chat is created to avoid redundant data extraction.
   */
  prepareNewChatTracking(): void {
    const url = window.location.href;
    console.log(
      `${Utils.getPrefix()} URL ${url} matches valid Gemini pattern. This is potentially a new chat.`
    );

    console.log(`${Utils.getPrefix()} [EventHandlers] Clearing all previous state before new chat`);
    DomObserver.resetAllPendingState();

    STATE.isNewChatPending = true;
    console.log(`${Utils.getPrefix()} [EventHandlers] Set isNewChatPending = true`);

    StatusIndicator.show("Preparing to track new chat...", "loading", 0);

    const modelInfo = ModelDetector.getCurrentModelName();
    STATE.pendingModelName = modelInfo.model;
    STATE.pendingTool = modelInfo.tool;
    STATE.pendingPrompt = InputExtractor.getPromptText();
    STATE.pendingOriginalPrompt = InputExtractor.getOriginalPromptText();
    STATE.pendingAttachedFiles = InputExtractor.getAttachedFiles();

    if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
      const gemInfo = GemDetector.getCurrentGemInfo();
      if (gemInfo) {
        STATE.pendingGemId = gemInfo.gemId;
        STATE.pendingGemName = gemInfo.gemName;
        STATE.pendingGemUrl = gemInfo.gemUrl;
        console.log(
          `${Utils.getPrefix()} Captured Gem information: ID=${gemInfo.gemId}, Name=${gemInfo.gemName ?? "Not detected yet"}`
        );
      }
    }

    const accountInfo = InputExtractor.getAccountInfo();
    STATE.pendingAccountName = accountInfo.name;
    STATE.pendingAccountEmail = accountInfo.email;

    STATE.pendingGeminiPlan = ModelDetector.detectGeminiPlan();

    console.log(`${Utils.getPrefix()} Captured pending model name: "${STATE.pendingModelName}"`);
    console.log(`${Utils.getPrefix()} Captured pending tool: "${STATE.pendingTool}"`);
    console.log(`${Utils.getPrefix()} Captured pending prompt: "${STATE.pendingPrompt}"`);
    console.log(`${Utils.getPrefix()} Captured pending original prompt: "${STATE.pendingOriginalPrompt}"`);
    console.log(`${Utils.getPrefix()} Captured pending files:`, STATE.pendingAttachedFiles);
    console.log(`${Utils.getPrefix()} Captured account name: "${STATE.pendingAccountName}"`);
    console.log(`${Utils.getPrefix()} Captured account email: "${STATE.pendingAccountEmail}"`);
    console.log(`${Utils.getPrefix()} Captured Gemini plan: "${STATE.pendingGeminiPlan}"`);

    setTimeout(() => {
      console.log(
        `${Utils.getPrefix()} [EventHandlers] Initiating conversation list observation via setTimeout.`
      );
      DomObserver.observeConversationListForNewChat();
    }, 50);
  },

  /**
   * Handles clicks on the send button to detect new chats.
   * Uses capture phase to intercept clicks before they're processed.
   *
   * @param event - The click event.
   */
  handleSendClick(event: Event): void {
    console.log(`${Utils.getPrefix()} Click detected on body (capture phase). Target:`, event.target);
    const sendButton = this.isSendButton(event.target);

    if (sendButton) {
      console.log(`${Utils.getPrefix()} Click target is (or is inside) a potential send button.`);
      const currentUrl = window.location.href;
      console.log(`${Utils.getPrefix()} Current URL at time of click: ${currentUrl}`);

      if (Utils.isBaseAppUrl(currentUrl) || Utils.isGemHomepageUrl(currentUrl)) {
        this.prepareNewChatTracking();
      } else {
        console.log(
          `${Utils.getPrefix()} URL is not a valid starting point for new chats. Ignoring click for history tracking.`
        );
      }
    }
  },
};
