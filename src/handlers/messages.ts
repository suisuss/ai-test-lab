type SendMessageParams = {
  content: string;
  senderId: string;
  channelId: string;
};

export async function sendMessage({ content, senderId, channelId }: SendMessageParams) {
  const response = await fetch(`/api/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, senderId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send message");
  }

  return response.json();
}

export async function fetchMessages(channelId: string) {
  const response = await fetch(`/api/channels/${channelId}/messages`);
  return response.json();
}

export async function fetchUsers() {
  const response = await fetch("/api/users");
  return response.json();
}

export async function fetchChannels() {
  const response = await fetch("/api/channels");
  return response.json();
}
