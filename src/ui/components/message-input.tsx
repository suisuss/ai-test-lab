"use client";

import { useRef } from "react";

type MessageInputProps = {
  channelName: string;
  onSend: (formData: FormData) => Promise<void>;
  disabled?: boolean;
};

export function MessageInput({
  channelName,
  onSend,
  disabled = false,
}: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await onSend(formData);
    formRef.current?.reset();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      aria-label={`Send message to ${channelName}`}
      className="border-t border-zinc-200 p-4"
    >
      <div className="flex gap-2">
        <label htmlFor="message-input" className="sr-only">
          Message
        </label>
        <input
          id="message-input"
          name="content"
          type="text"
          placeholder={`Message #${channelName}`}
          required
          disabled={disabled}
          autoComplete="off"
          aria-label={`Type a message in ${channelName}`}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label="Send message"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}
