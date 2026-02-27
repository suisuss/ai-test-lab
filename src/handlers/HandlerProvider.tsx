"use client";

import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import { useData } from "@/data/DataProvider";
import { useSystem } from "@/system/SystemProvider";

type HandlerContextValue = {
  handleUserSelect: (userId: string) => void;
  handleChannelSelect: (channelId: string) => void;
  handleSendMessage: (formData: FormData) => Promise<void>;
};

const HandlerContext = createContext<HandlerContextValue | null>(null);

export function HandlerProvider({ children }: { children: ReactNode }) {
  const { currentUserId, currentChannelId, controllers } = useData();
  const { error } = useSystem();

  const handleUserSelect = useCallback(
    (userId: string) => {
      controllers.setCurrentUserId(userId);
    },
    [controllers]
  );

  const handleChannelSelect = useCallback(
    (channelId: string) => {
      controllers.setCurrentChannelId(channelId);
      controllers.setMessages([]);
    },
    [controllers]
  );

  const handleSendMessage = useCallback(
    async (formData: FormData) => {
      if (!currentUserId || !currentChannelId) return;

      const content = formData.get("content") as string;
      if (!content?.trim()) return;

      try {
        await controllers.sendMessage({
          content: content.trim(),
          senderId: currentUserId,
          channelId: currentChannelId,
        });
        await controllers.fetchMessages();
      } catch (e) {
        error.handleError(e as Error, "HandlerProvider.handleSendMessage");
      }
    },
    [currentUserId, currentChannelId, controllers, error]
  );

  const value = useMemo<HandlerContextValue>(
    () => ({
      handleUserSelect,
      handleChannelSelect,
      handleSendMessage,
    }),
    [handleUserSelect, handleChannelSelect, handleSendMessage]
  );

  return (
    <HandlerContext.Provider value={value}>{children}</HandlerContext.Provider>
  );
}

export function useHandlers(): HandlerContextValue {
  const context = useContext(HandlerContext);
  if (!context) {
    throw new Error("useHandlers must be used within a HandlerProvider");
  }
  return context;
}
