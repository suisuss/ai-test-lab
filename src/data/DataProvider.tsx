"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  fetchUsers as apiFetchUsers,
  fetchChannels as apiFetchChannels,
  fetchMessages as apiFetchMessages,
  sendMessage as apiSendMessage,
} from "@/handlers/messages";
import { useSystem } from "@/system/SystemProvider";
import type { User, Channel, Message } from "@/types";

type SendMessageParams = {
  content: string;
  senderId: string;
  channelId: string;
};

type DataContextValue = {
  users: User[];
  channels: Channel[];
  messages: Message[];
  currentUserId: string | null;
  currentChannelId: string | null;
  currentChannel: Channel | undefined;
  controllers: {
    setCurrentUserId: (id: string) => void;
    setCurrentChannelId: (id: string) => void;
    setMessages: (msgs: Message[]) => void;
    fetchUsers: () => Promise<void>;
    fetchChannels: () => Promise<void>;
    fetchMessages: () => Promise<void>;
    sendMessage: (data: SendMessageParams) => Promise<void>;
  };
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { error, activity } = useSystem();

  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);

  const currentChannel = channels.find((c) => c.id === currentChannelId);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetchUsers();
      setUsers(data);
      activity.info("Fetched users", "DataProvider");
    } catch (e) {
      error.handleError(e as Error, "DataProvider.fetchUsers");
    }
  }, [activity, error]);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await apiFetchChannels();
      setChannels(data);
      activity.info("Fetched channels", "DataProvider");
      return data;
    } catch (e) {
      error.handleError(e as Error, "DataProvider.fetchChannels");
      return [];
    }
  }, [activity, error]);

  const fetchMessages = useCallback(async () => {
    if (!currentChannelId) return;
    try {
      const data = await apiFetchMessages(currentChannelId);
      setMessages(data);
    } catch (e) {
      error.handleError(e as Error, "DataProvider.fetchMessages");
    }
  }, [currentChannelId, error]);

  const sendMessage = useCallback(
    async (data: SendMessageParams) => {
      try {
        await apiSendMessage(data);
        activity.info(`Message sent in channel ${data.channelId}`, "DataProvider");
      } catch (e) {
        error.handleError(e as Error, "DataProvider.sendMessage");
        throw e;
      }
    },
    [activity, error]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      const [, channelsData] = await Promise.all([
        apiFetchUsers().then((data) => { if (!cancelled) setUsers(data); }),
        apiFetchChannels(),
      ]);
      if (!cancelled) {
        setChannels(channelsData);
        if (channelsData.length > 0) {
          setCurrentChannelId(channelsData[0].id);
        }
      }
    }

    loadInitialData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentChannelId) return;
    let cancelled = false;

    apiFetchMessages(currentChannelId).then((data) => {
      if (!cancelled) setMessages(data);
    });

    return () => { cancelled = true; };
  }, [currentChannelId]);

  const controllers = useMemo(
    () => ({
      setCurrentUserId,
      setCurrentChannelId,
      setMessages,
      fetchUsers,
      fetchChannels,
      fetchMessages,
      sendMessage,
    }),
    [fetchUsers, fetchChannels, fetchMessages, sendMessage]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      users,
      channels,
      messages,
      currentUserId,
      currentChannelId,
      currentChannel,
      controllers,
    }),
    [users, channels, messages, currentUserId, currentChannelId, currentChannel, controllers]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
