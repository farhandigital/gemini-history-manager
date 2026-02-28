import { Utils } from "./utils.js";
import { STATUS_TYPES, type StatusType } from "./constants.js";
import { SELECTORS } from "./selectors.js";

interface StatusIndicatorObject {
  element: HTMLElement | null;
  timeout: ReturnType<typeof setTimeout> | null;
  DEFAULT_AUTO_HIDE: number;
  init(): void;
  show(message: string, type?: StatusType, autoHide?: number): StatusIndicatorObject;
  update(message: string, type?: StatusType | null, autoHide?: number): StatusIndicatorObject;
  hide(): void;
}

export const StatusIndicator: StatusIndicatorObject = {
  element: null,
  timeout: null,
  DEFAULT_AUTO_HIDE: 3000,

  /**
   * Initializes the status indicator element in the DOM.
   * Creates the HTML structure and applies styles for the indicator.
   */
  init(): void {
    const styleEl = document.createElement("style");
    styleEl.textContent = `
              .gemini-history-status {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  display: flex;
                  align-items: center;
                  background: #1a1c25;
                  color: white;
                  padding: 10px 15px;
                  border-radius: 4px;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1);
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  font-size: 14px;
                  z-index: 10000;
                  transition: opacity 0.3s, transform 0.3s;
                  opacity: 1;
                  transform: translateY(0);
              }

              .gemini-history-status.hidden {
                  opacity: 0;
                  transform: translateY(10px);
                  pointer-events: none;
              }

              .status-icon {
                  width: 20px;
                  height: 20px;
                  margin-right: 10px;
                  position: relative;
              }

              .status-icon::before,
              .status-icon::after {
                  content: '';
                  position: absolute;
              }

              /* Info icon */
              .${STATUS_TYPES.INFO} .status-icon::before {
                  width: 20px;
                  height: 20px;
                  background: #3498db;
                  border-radius: 50%;
              }

              .${STATUS_TYPES.INFO} .status-icon::after {
                  content: 'i';
                  color: white;
                  font-style: italic;
                  font-weight: bold;
                  font-family: serif;
                  font-size: 14px;
                  left: 8px;
                  top: 0px;
              }

              /* Success icon */
              .${STATUS_TYPES.SUCCESS} .status-icon::before {
                  width: 20px;
                  height: 20px;
                  background: #2ecc71;
                  border-radius: 50%;
              }

              .${STATUS_TYPES.SUCCESS} .status-icon::after {
                  width: 6px;
                  height: 12px;
                  border-right: 2px solid white;
                  border-bottom: 2px solid white;
                  transform: rotate(45deg);
                  left: 7px;
                  top: 2px;
              }

              /* Warning icon */
              .${STATUS_TYPES.WARNING} .status-icon::before {
                  width: 0;
                  height: 0;
                  border-left: 10px solid transparent;
                  border-right: 10px solid transparent;
                  border-bottom: 18px solid #f39c12;
                  top: 1px;
              }

              .${STATUS_TYPES.WARNING} .status-icon::after {
                  content: '!';
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
                  left: 8px;
                  top: 4px;
              }

              /* Error icon */
              .${STATUS_TYPES.ERROR} .status-icon::before {
                  width: 20px;
                  height: 20px;
                  background: #e74c3c;
                  border-radius: 50%;
              }

              .${STATUS_TYPES.ERROR} .status-icon::after {
                  content: '✕';
                  color: white;
                  font-size: 14px;
                  left: 5px;
                  top: 0px;
              }

              /* Loading icon */
              .${STATUS_TYPES.LOADING} .status-icon::before {
                  width: 16px;
                  height: 16px;
                  border: 2px solid #ccc;
                  border-top-color: #6e41e2;
                  border-radius: 50%;
                  left: 1px;
                  top: 1px;
                  animation: gemini-history-spin 0.8s linear infinite;
              }

              @keyframes gemini-history-spin {
                  to { transform: rotate(360deg); }
              }
            `;
    document.head.appendChild(styleEl);

    const indicator = document.createElement("div");
    indicator.id = SELECTORS.STATUS_INDICATOR_ID;
    indicator.className = `${SELECTORS.STATUS_INDICATOR_CLASS} ${SELECTORS.STATUS_INDICATOR_HIDDEN}`;

    const iconContainer = document.createElement("div");
    iconContainer.className = SELECTORS.STATUS_ICON_ELEMENT;

    const messageContainer = document.createElement("div");
    messageContainer.className = SELECTORS.STATUS_MESSAGE_ELEMENT;

    indicator.appendChild(iconContainer);
    indicator.appendChild(messageContainer);
    document.body.appendChild(indicator);

    this.element = indicator;
    console.log(`${Utils.getPrefix()} Status indicator initialized`);
  },

  /**
   * Shows the status indicator with a message.
   *
   * @param message - The message to display in the indicator
   * @param type - Type of status: 'info', 'success', 'warning', 'error', or 'loading'
   * @param autoHide - Time in ms after which to hide the indicator, or 0 to stay visible
   * @returns Returns the StatusIndicator instance for chaining
   */
  show(message: string, type: StatusType = STATUS_TYPES.INFO, autoHide = 3000): StatusIndicatorObject {
    if (!this.element) {
      this.init();
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // element is guaranteed non-null after init()
    const el = this.element!;
    el.classList.remove(SELECTORS.STATUS_INDICATOR_HIDDEN, ...Object.values(STATUS_TYPES));
    el.classList.add(type);

    const messageEl = el.querySelector(`.${SELECTORS.STATUS_MESSAGE_ELEMENT}`);
    if (messageEl) {
      messageEl.textContent = message;
    }

    if (autoHide > 0) {
      this.timeout = setTimeout(() => {
        this.hide();
      }, autoHide);
    }

    return this;
  },

  /**
   * Updates the message and type of an existing indicator.
   * Resets auto-hide timeout if specified.
   *
   * @param message - The new message to display
   * @param type - New type of status, or null to keep current type
   * @param autoHide - Time in ms after which to hide the indicator, or 0 to stay visible
   * @returns Returns the StatusIndicator instance for chaining
   */
  update(message: string, type: StatusType | null = null, autoHide = 3000): StatusIndicatorObject {
    if (!this.element) return this;

    const messageEl = this.element.querySelector(`.${SELECTORS.STATUS_MESSAGE_ELEMENT}`);
    if (messageEl) {
      messageEl.textContent = message;
    }

    if (type) {
      this.element.classList.remove(...Object.values(STATUS_TYPES));
      this.element.classList.add(type);
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (autoHide > 0) {
      this.timeout = setTimeout(() => {
        this.hide();
      }, autoHide);
    }

    return this;
  },

  /**
   * Hides the status indicator by adding the 'hidden' class.
   * Clears any existing timeout.
   */
  hide(): void {
    if (!this.element) return;

    this.element.classList.add(SELECTORS.STATUS_INDICATOR_HIDDEN);

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  },
};
