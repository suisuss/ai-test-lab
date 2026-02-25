"use client";

import { useEffect, useState, useCallback } from "react";
import { UserSelector } from "@/ui/components/user-selector";
import { ChannelList } from "@/ui/components/channel-list";
import { MessageList } from "@/ui/components/message-list";
import { MessageInput } from "@/ui/components/message-input";
import {
  fetchUsers,
  fetchChannels,
  fetchMessages as fetchChannelMessages,
  sendMessage,
} from "@/handlers/messages";

type User = { id: string; username: string };
type Channel = {
  id: string;
  name: string;
  _count: { members: number; messages: number };
};
type Message = {
  id: string;
  content: string;
  createdAt: Date;
  sender: { id: string; username: string };
};

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);

  const currentChannel = channels.find((c) => c.id === currentChannelId);

  useEffect(() => {
    fetchUsers().then(setUsers);
    fetchChannels().then((channels) => {
      setChannels(channels);
      if (channels.length > 0) {
        setCurrentChannelId(channels[0].id);
      }
    });
  }, []);

  const loadMessages = useCallback(() => {
    if (!currentChannelId) return;
    fetchChannelMessages(currentChannelId).then(setMessages);
  }, [currentChannelId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  function handleUserSelect(userId: string) {
    setCurrentUserId(userId);
  }

  function handleChannelSelect(channelId: string) {
    setCurrentChannelId(channelId);
    setMessages([]);
  }

  async function handleSendMessage(formData: FormData) {
    if (!currentUserId || !currentChannelId) return;

    const content = formData.get("content") as string;
    if (!content?.trim()) return;

    await sendMessage({
      content: content.trim(),
      senderId: currentUserId,
      channelId: currentChannelId,
    });

    loadMessages();
  }

  return (
    <div className="flex h-screen bg-white" role="application" aria-label="Messaging app">
      <aside
        aria-label="Sidebar"
        className="w-64 border-r border-zinc-200 flex flex-col"
      >
        <div className="p-4 border-b border-zinc-200">
          <h1 className="text-lg font-semibold text-zinc-900">ai-test-lab</h1>
        </div>
        <div className="p-3">
          <UserSelector
            users={users}
            currentUserId={currentUserId}
            onSelect={handleUserSelect}
          />
        </div>
        <div className="flex-1 p-3">
          <ChannelList
            channels={channels}
            currentChannelId={currentChannelId}
            onSelect={handleChannelSelect}
          />
        </div>
      </aside>

      <main
        aria-label="Chat area"
        className="flex-1 flex flex-col"
      >
        {currentChannel ? (
          <>
            <header className="px-4 py-3 border-b border-zinc-200">
              <h2 className="text-sm font-semibold text-zinc-900">
                <span aria-hidden="true"># </span>
                {currentChannel.name}
              </h2>
            </header>
            <MessageList
              messages={messages}
              channelName={currentChannel.name}
            />
            {currentUserId ? (
              <MessageInput
                channelName={currentChannel.name}
                onSend={handleSendMessage}
              />
            ) : (
              <div
                role="status"
                className="border-t border-zinc-200 p-4 text-sm text-zinc-400 text-center"
              >
                Select a user above to start messaging
              </div>
            )}
          </>
        ) : (
          <div
            role="status"
            className="flex-1 flex items-center justify-center text-zinc-400 text-sm"
          >
            Select a channel to start chatting
          </div>
        )}
      </main>
    </div>
  );
}
