type Message = {
  id: string;
  content: string;
  createdAt: Date;
  sender: { id: string; username: string };
};

type MessageListProps = {
  messages: Message[];
  channelName: string;
};

export function MessageList({ messages, channelName }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div
        role="status"
        aria-label="No messages"
        className="flex-1 flex items-center justify-center text-zinc-400 text-sm"
      >
        No messages in #{channelName} yet. Be the first to send one!
      </div>
    );
  }

  return (
    <div
      role="log"
      aria-label={`Messages in ${channelName}`}
      aria-live="polite"
      className="flex-1 overflow-y-auto p-4 space-y-3"
    >
      {messages.map((message) => (
        <article
          key={message.id}
          aria-label={`Message from ${message.sender.username}`}
          className="flex gap-3"
        >
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600 shrink-0"
          >
            {message.sender.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-zinc-900">
                {message.sender.username}
              </span>
              <time
                dateTime={new Date(message.createdAt).toISOString()}
                className="text-xs text-zinc-400"
              >
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <p className="text-sm text-zinc-700">{message.content}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
