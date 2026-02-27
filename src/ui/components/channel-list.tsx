import type { Channel } from "@/types";

type ChannelListProps = {
  channels: Channel[];
  currentChannelId: string | null;
  onSelect: (channelId: string) => void;
};

export function ChannelList({
  channels,
  currentChannelId,
  onSelect,
}: ChannelListProps) {
  return (
    <nav aria-label="Channels">
      <h2 className="text-sm font-medium text-zinc-500 mb-2 px-2">Channels</h2>
      <ul role="listbox" aria-label="Channel list">
        {channels.map((channel) => (
          <li key={channel.id} role="option" aria-selected={currentChannelId === channel.id}>
            <button
              onClick={() => onSelect(channel.id)}
              aria-label={`Channel ${channel.name}, ${channel._count.messages} messages`}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                currentChannelId === channel.id
                  ? "bg-zinc-100 font-medium text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span aria-hidden="true"># </span>
              {channel.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
