export interface TrackerState {
  isNewChatPending: boolean;
  pendingModelName: string | null;
  pendingTool: string | null;
  pendingPrompt: string | null;
  pendingOriginalPrompt: string | null;
  pendingAttachedFiles: string[];
  pendingAccountName: string | null;
  pendingAccountEmail: string | null;
  pendingGeminiPlan: string | null;
  pendingGemId: string | null;
  pendingGemName: string | null;
  pendingGemUrl: string | null;
  conversationListObserver: MutationObserver | null;
  sidebarObserver: MutationObserver | null;
  titleObserver: MutationObserver | null;
  secondaryTitleObserver: MutationObserver | null;
  stopButtonObserver: MutationObserver | null;
}

export const STATE: TrackerState = {
  isNewChatPending: false,
  pendingModelName: null,
  pendingTool: null,
  pendingPrompt: null,
  pendingOriginalPrompt: null,
  pendingAttachedFiles: [],
  pendingAccountName: null,
  pendingAccountEmail: null,
  pendingGeminiPlan: null,
  pendingGemId: null,
  pendingGemName: null,
  pendingGemUrl: null,
  conversationListObserver: null,
  sidebarObserver: null,
  titleObserver: null,
  secondaryTitleObserver: null,
  stopButtonObserver: null,
};
